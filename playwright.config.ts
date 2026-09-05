import { defineConfig } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3001";

export default defineConfig({
  expect: { timeout: 15_000 },
  fullyParallel: false,
  globalSetup: "./e2e/global-setup.ts",
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "list",
  testDir: "./e2e",
  timeout: 60_000,
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  workers: 1,
});
