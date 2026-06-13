import { expo } from "@better-auth/expo";
import { createDb } from "@rallycaststv/db";
import * as schema from "@rallycaststv/db/schema/auth";
import { env } from "@rallycaststv/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins/username";

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

export const createAuth = (database: D1Database) => {
  const db = createDb(database);

  return betterAuth({
    advanced: {
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "none",
        secure: true,
      },
      // uncomment crossSubDomainCookies setting when ready to deploy and replace <your-workers-subdomain> with your actual workers subdomain
      // https://developers.cloudflare.com/workers/wrangler/configuration/#workersdev
      // crossSubDomainCookies: {
      //   enabled: true,
      //   domain: "<your-workers-subdomain>",
      // },
    },
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(db, {
      provider: "sqlite",

      schema,
    }),
    emailAndPassword: {
      enabled: true,
      revokeSessionsOnPasswordReset: true,
    },
    // uncomment cookieCache setting when ready to deploy to Cloudflare using *.workers.dev domains
    // session: {
    //   cookieCache: {
    //     enabled: true,
    //     maxAge: 60,
    //   },
    // },
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
      env.CORS_ORIGIN,
      "rallycaststv://",
      "exp://",
      "http://localhost:8081",
    ],
  });
};
