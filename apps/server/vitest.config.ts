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
          GOOGLE_PLACES_API_KEY: "test-google-places-key",
          MUX_TOKEN_ID: "test-mux-id",
          MUX_TOKEN_SECRET: "test-mux-secret",
          R2_ACCESS_KEY_ID: "test-r2-key",
          R2_ACCOUNT_ID: "test-account",
          R2_PUBLIC_URL: "https://media.example.com",
          R2_SECRET_ACCESS_KEY: "test-r2-secret",
          RADAR_SECRET_KEY: "test-radar-key",
        },
        d1Databases: ["DB"],
        queueProducers: {
          GEOFENCE_EVENTS: { queueName: "geofence-events" },
        },
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
