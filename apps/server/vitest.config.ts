import {
  cloudflareTest,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig(async () => {
  const migrations = await readD1Migrations("../../packages/db/src/migrations");

  return {
    plugins: [
      cloudflareTest({
        miniflare: {
          bindings: {
            ADMIN_EMAILS: "platform-admin-allowlist@example.com",
            BETTER_AUTH_SECRET:
              "test-secret-test-secret-test-secret-test-secret",
            BETTER_AUTH_URL: "http://localhost:3000",
            CORS_ORIGIN: "http://localhost:3001",
            GITHUB_CLIENT_ID: "",
            GITHUB_CLIENT_SECRET: "",
            GOOGLE_CLIENT_ID: "",
            GOOGLE_CLIENT_SECRET: "",
            GOOGLE_GENERATIVE_AI_API_KEY: "test-google-key",
            GOOGLE_PLACES_API_KEY: "test-google-places-key",
            MUX_TOKEN_ID: "test-mux-id",
            MUX_TOKEN_SECRET: "test-mux-secret",
            R2_ACCESS_KEY_ID: "test-r2-key",
            R2_ACCOUNT_ID: "test-account",
            R2_PUBLIC_URL: "https://media.example.com",
            R2_SECRET_ACCESS_KEY: "test-r2-secret",
            RADAR_SECRET_KEY: "test-radar-key",
          },
        },
        wrangler: {
          configPath: "./wrangler.jsonc",
        },
      }),
    ],
    test: {
      exclude: ["dist/**", "node_modules/**"],
      provide: {
        d1Migrations: migrations,
      },
      setupFiles: ["./src/test/setup.ts"],
      testTimeout: 60_000,
    },
  };
});
