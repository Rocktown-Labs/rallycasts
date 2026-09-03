import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

import app from "../index";

const signUp = async () => {
  const username = `profile${crypto.randomUUID().slice(0, 8)}`;
  const response = await app.request(
    "/api/auth/sign-up/email",
    {
      body: JSON.stringify({
        email: `${username}@example.com`,
        name: "Profile Security Test",
        password: "password-12345678",
        username,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    env
  );
  expect(response.status).toBe(200);
  return response.headers.get("set-cookie") ?? "";
};

describe("profile authorization", () => {
  it("does not allow users to grant themselves privileged profile fields", async () => {
    const cookie = await signUp();
    const response = await app.request(
      "/api/v1/profile/me",
      {
        body: JSON.stringify({
          accountTier: "premium",
          bio: "Updated profile",
          isCaster: true,
          isOrganizer: true,
          isPlayer: false,
          onboardingStatus: "complete",
        }),
        headers: { "Content-Type": "application/json", Cookie: cookie },
        method: "PATCH",
      },
      env
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      isPlatformAdmin: false,
      profile: {
        accountTier: "free",
        bio: "Updated profile",
        isCaster: false,
        isOrganizer: false,
        isPlayer: true,
        onboardingStatus: "pending",
      },
    });
  });
});
