import { apiKey } from "@better-auth/api-key";
import { expo } from "@better-auth/expo";
import { passkey } from "@better-auth/passkey";
import { createDb } from "@rallycaststv/db";
import * as schema from "@rallycaststv/db/schema/auth";
import { env } from "@rallycaststv/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import { emailOTP } from "better-auth/plugins/email-otp";
import { username } from "better-auth/plugins/username";
import { eq } from "drizzle-orm";

const isLocalUrl = (url: string) => {
  try {
    const { hostname } = new URL(url);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
};

const getCookieDomain = (url: string) => {
  try {
    const { hostname } = new URL(url);
    // Only the known first-party hosts share the session cookie. A blanket
    // parent-domain cookie would also be sent to any other current or future
    // subdomain, widening session theft on takeover, so each scope below is
    // a single registrable domain we control.
    if (hostname === "rallycasts.com" || hostname === "api.rallycasts.com") {
      return ".rallycasts.com";
    }
    // Preview workers (rallycasts-server-*, rallycasts-web-*) share the
    // rocktown-labs.workers.dev registrable domain: workers.dev is a public
    // suffix, so this is the narrowest scope under which the session cookie
    // set by the auth worker is visible to the sibling web worker.
    if (
      hostname === "rocktown-labs.workers.dev" ||
      hostname.endsWith(".rocktown-labs.workers.dev")
    ) {
      return ".rocktown-labs.workers.dev";
    }
  } catch {
    // Ignore invalid URL parsing errors.
  }

  // Localhost and unknown hosts get a host-only cookie (no Domain attribute).
};

const getWebBaseUrl = () => {
  if (env.CORS_ORIGIN) {
    const origins = env.CORS_ORIGIN.split(",")
      .map((origin: string) => origin.trim())
      .filter(Boolean);
    const prodOrigin = origins.find(
      (origin: string) =>
        !origin.includes("localhost") && !origin.includes("127.0.0.1")
    );
    if (prodOrigin) {
      return prodOrigin;
    }
    if (origins[0]) {
      return origins[0];
    }
  }

  if (isLocalUrl(env.BETTER_AUTH_URL)) {
    return "http://localhost:3000";
  }

  return "https://rallycasts.com";
};

const getSocialProviders = () => ({
  github:
    env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
      ? {
          clientId: env.GITHUB_CLIENT_ID,
          clientSecret: env.GITHUB_CLIENT_SECRET,
        }
      : undefined,
  google:
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
        }
      : undefined,
});

export interface AuthEmailCallbacks {
  sendOtp?: (data: {
    email: string;
    otp: string;
    type: "change-email" | "email-verification" | "forget-password" | "sign-in";
  }) => Promise<void>;
  sendResetPassword?: (data: {
    user: {
      email: string;
      id: string;
      name: string;
    };
    url: string;
  }) => Promise<void>;
  sendVerificationEmail?: (data: {
    user: {
      email: string;
      id: string;
      name: string;
    };
    url: string;
  }) => Promise<void>;
}

// Platform admin allowlist (ADMIN_EMAILS, comma-separated). Applied on
// signup and on every sign-in, so allowlisted accounts self-heal to admin
// without manual SQL — including pre-existing ones.
const adminEmails = (): string[] =>
  (env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email: string) => email.trim().toLowerCase())
    .filter(Boolean);

const isAdminEmail = (email: string): boolean =>
  adminEmails().includes(email.trim().toLowerCase());

export const createAuth = (
  database: D1Database,
  emailCallbacks?: AuthEmailCallbacks
) => {
  const db = createDb(database);
  const isLocalAuth = isLocalUrl(env.BETTER_AUTH_URL);

  // WebAuthn is bound to the serving origin, so passkeys are pinned to the
  // production domain; preview workers keep the password/OTP flows.
  const passkeyConfig = {
    origin: isLocalAuth
      ? [env.BETTER_AUTH_URL.replace(/\/$/u, ""), "http://localhost:3001"]
      : ["https://rallycasts.com"],
    rpID: isLocalAuth ? "localhost" : "rallycasts.com",
    rpName: "RallyCasts",
  };

  return betterAuth({
    account: {
      accountLinking: {
        enabled: true,
        requireLocalEmailVerified: true,
        trustedProviders: ["google", "github"],
      },
    },
    advanced: {
      defaultCookieAttributes: {
        domain: getCookieDomain(env.BETTER_AUTH_URL),
        httpOnly: true,
        sameSite: "lax",
        secure: !isLocalUrl(env.BETTER_AUTH_URL),
      },
    },
    // Dynamic base URL: the auth worker is reachable under multiple hosts
    // (api.rallycasts.com in production, rallycasts-server-<stage> on
    // previews), so resolve the base URL from the request host instead of a
    // single static value. Unknown hosts fall back to the configured URL
    // rather than throwing, keeping unit tests and misconfigured requests
    // functional.
    baseURL: {
      allowedHosts: [
        "rallycasts.com",
        "*.rallycasts.com",
        "*.rocktown-labs.workers.dev",
        // Dev hosts carry a port (host header is passed through verbatim).
        "localhost:*",
        "127.0.0.1:*",
      ],
      fallback: env.BETTER_AUTH_URL,
    },
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema,
    }),
    databaseHooks: {
      session: {
        create: {
          after: async (session) => {
            if (!session?.userId) {
              return;
            }
            const [existing] = await db
              .select({ email: schema.user.email, role: schema.user.role })
              .from(schema.user)
              .where(eq(schema.user.id, session.userId))
              .limit(1);
            if (
              existing &&
              existing.role !== "admin" &&
              isAdminEmail(existing.email)
            ) {
              await db
                .update(schema.user)
                .set({ role: "admin" })
                .where(eq(schema.user.id, session.userId));
            }
          },
        },
      },
      user: {
        create: {
          before: (data) => {
            const email = typeof data?.email === "string" ? data.email : "";
            if (email && isAdminEmail(email)) {
              return Promise.resolve({ data: { role: "admin" } });
            }
            return Promise.resolve();
          },
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      maxPasswordLength: 128,
      minPasswordLength: 12,
      requireEmailVerification: !isLocalUrl(env.BETTER_AUTH_URL),
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: emailCallbacks?.sendResetPassword,
    },
    emailVerification: {
      autoSendOnSignUp: true,
      // Sign the user in when they open the verification link, so the
      // response to GET /verify-email sets the session cookie instead of
      // bouncing them to a login form.
      autoSignInAfterVerification: true,
      sendOnSignIn: true,
      sendVerificationEmail: emailCallbacks?.sendVerificationEmail,
    },
    onAPIError: {
      errorURL: `${getWebBaseUrl()}/error`,
    },
    plugins: [
      /**
       * Agent keys: RallyCasts users hand a key to their AI agent, which
       * then acts as them over the API (upload videos and clips, read
       * their library, and so on). Keys carry the rak_ prefix and are
       * accepted via x-api-key or `Authorization: Bearer rak_...`. With
       * enableSessionForAPIKeys, the existing requireAuth middleware
       * resolves key-bearing requests to the owner's session, so every
       * authenticated route works without changes.
       */
      apiKey({
        customAPIKeyGetter: (ctx) => {
          const headers = ctx.headers ?? ctx.request?.headers;
          const header = headers?.get("x-api-key");
          if (header?.startsWith("rak_")) {
            return header;
          }
          const authorization = headers?.get("authorization");
          if (authorization?.startsWith("Bearer rak_")) {
            return authorization.slice("Bearer ".length);
          }
          return null;
        },
        defaultPrefix: "rak_",
        enableMetadata: true,
        enableSessionForAPIKeys: true,
        rateLimit: {
          enabled: true,
          maxRequests: 100,
          timeWindow: 60_000,
        },
        requireName: true,
      }),
      admin({
        adminRoles: ["admin"],
        defaultRole: "user",
      }),
      emailOTP({
        async sendVerificationOTP({ email, otp, type }) {
          await emailCallbacks?.sendOtp?.({ email, otp, type });
        },
      }),
      expo(),
      passkey(passkeyConfig),
      username({
        maxUsernameLength: 30,
        minUsernameLength: 3,
      }),
    ],
    secret: env.BETTER_AUTH_SECRET,
    socialProviders: getSocialProviders(),
    trustedOrigins: [
      ...(env.CORS_ORIGIN
        ? env.CORS_ORIGIN.split(",").map((origin: string) => origin.trim())
        : []),
      // Production app scheme. Local development schemes (Expo dev, Metro,
      // localhost) are only trusted when the auth server itself is local.
      "rallycaststv://",
      ...(isLocalUrl(env.BETTER_AUTH_URL)
        ? [
            "exp://",
            "http://localhost:8081",
            "http://localhost:3001",
            "http://127.0.0.1:3001",
          ]
        : []),
    ],
  });
};
