import { expo } from "@better-auth/expo";
import { createDb } from "@rallycaststv/db";
import * as schema from "@rallycaststv/db/schema/auth";
import { env } from "@rallycaststv/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins/username";

const getCookieDomain = (url: string) => {
  try {
    const { hostname } = new URL(url);
    if (hostname === "localhost" || hostname.endsWith(".localhost")) {
      return;
    }
    const parts = hostname.split(".");
    if (parts.length <= 2) {
      return `.${hostname}`;
    }
    return `.${parts.slice(1).join(".")}`;
  } catch {
    // Ignore invalid URL parsing errors
  }
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
    advanced: {
      defaultCookieAttributes: {
        domain: getCookieDomain(env.BETTER_AUTH_URL),
        httpOnly: true,
        sameSite: "none",
        secure: true,
      },
    },
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema,
    }),
    emailAndPassword: {
      enabled: true,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: emailCallbacks?.sendResetPassword,
    },
    emailVerification: {
      autoSendOnSignUp: true,
      sendOnSignIn: false,
      sendVerificationEmail: emailCallbacks?.sendVerificationEmail,
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
