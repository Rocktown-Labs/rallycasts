import { expo } from "@better-auth/expo";
import { createDb } from "@rallycaststv/db";
import * as schema from "@rallycaststv/db/schema/auth";
import { env } from "@rallycaststv/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins/username";

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
    if (hostname === "rallycasts.com" || hostname.endsWith(".rallycasts.com")) {
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

export const createAuth = (
  database: D1Database,
  emailCallbacks?: AuthEmailCallbacks
) => {
  const db = createDb(database);

  return betterAuth({
    account: {
      accountLinking: {
        enabled: true,
        requireLocalEmailVerified: false,
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
    emailAndPassword: {
      enabled: true,
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
      "rallycaststv://",
      "exp://",
      "http://localhost:8081",
      "http://localhost:3001",
      "http://127.0.0.1:3001",
    ],
  });
};
