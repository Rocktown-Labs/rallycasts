import { expo } from "@better-auth/expo";
import { createDb } from "@rallycaststv/db";
import * as schema from "@rallycaststv/db/schema/auth";
import { env } from "@rallycaststv/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
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
    // subdomain (staging, previews), widening session theft on takeover.
    if (hostname === "rallycasts.com" || hostname === "api.rallycasts.com") {
      return ".rallycasts.com";
    }
  } catch {
    // Ignore invalid URL parsing errors.
  }

  // Do not set a parent-domain cookie for preview or public-suffix hosts.
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
    baseURL: env.BETTER_AUTH_URL,
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
      sendOnSignIn: true,
      sendVerificationEmail: emailCallbacks?.sendVerificationEmail,
    },
    onAPIError: {
      errorURL: `${getWebBaseUrl()}/error`,
    },
    plugins: [
      admin({
        adminRoles: ["admin"],
        defaultRole: "user",
      }),
      expo(),
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
