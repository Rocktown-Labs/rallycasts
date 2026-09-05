import { mkdir, writeFile } from "node:fs/promises";

import { request } from "@playwright/test";

const requireEnvironment = (name: string) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required E2E environment variable: ${name}`);
  }
  return value;
};

export default async function globalSetup() {
  const baseURL = requireEnvironment("E2E_BASE_URL");
  const apiURL = requireEnvironment("E2E_API_URL");
  const seedToken = requireEnvironment("E2E_SEED_TOKEN");
  const email = requireEnvironment("E2E_EMAIL");
  const password = requireEnvironment("E2E_PASSWORD");
  const name = process.env.E2E_NAME ?? "E2E Rally Owner";
  const peerEmail = process.env.E2E_PEER_EMAIL ?? email.replace("@", "+peer@");
  const peerName = process.env.E2E_PEER_NAME ?? "E2E Rally Friend";
  const fixturePath =
    process.env.E2E_FIXTURES_PATH ?? ".e2e/staging-fixtures.json";

  const context = await request.newContext({
    extraHTTPHeaders: {
      Origin: baseURL,
      "x-rallycasts-e2e-token": seedToken,
    },
  });
  try {
    const response = await context.post(`${apiURL}/api/v1/internal/e2e/seed`, {
      data: { email, name, password, peerEmail, peerName },
    });
    if (!response.ok()) {
      throw new Error(
        `E2E fixture seeding failed with HTTP ${response.status()}: ${await response.text()}`
      );
    }

    await mkdir(".e2e", { recursive: true });
    await writeFile(fixturePath, await response.text(), "utf-8");
  } finally {
    await context.dispose();
  }
}
