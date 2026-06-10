import {
  cloudflareTest,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

const migrations = await readD1Migrations("../../packages/db/src/migrations");

export default defineConfig({
  plugins: [
    cloudflareTest({
      main: "./src/index.ts",
      miniflare: {
        bindings: {
          BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret-test-secret",
          BETTER_AUTH_URL: "http://localhost:3000",
          CORS_ORIGIN: "http://localhost:3001",
          GOOGLE_GENERATIVE_AI_API_KEY: "test-google-key",
        },
        d1Databases: ["DB"],
      },
    }),
  ],
  test: {
    provide: {
      d1Migrations: migrations,
    },
    setupFiles: ["./src/test/setup.ts"],
  },
});
