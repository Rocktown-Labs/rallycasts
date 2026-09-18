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

  it("checks username availability via bloom filter and recognizes own username", async () => {
    const userA = `usera${crypto.randomUUID().slice(0, 8)}`;
    const cookieA = await app
      .request(
        "/api/auth/sign-up/email",
        {
          body: JSON.stringify({
            email: `${userA}@example.com`,
            name: "User A",
            password: "password-12345678",
            username: userA,
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
        env
      )
      .then((res) => res.headers.get("set-cookie") ?? "");

    // 1. Current user checking their own username
    const resOwn = await app.request(
      `/api/v1/profile/check-username?username=${userA}`,
      { headers: { Cookie: cookieA } },
      env
    );
    expect(resOwn.status).toBe(200);
    await expect(resOwn.json()).resolves.toEqual({
      available: true,
      isCurrent: true,
      source: "current_user",
    });

    // 2. Another user checking userA's username (should be taken)
    const userB = `userb${crypto.randomUUID().slice(0, 8)}`;
    const cookieB = await app
      .request(
        "/api/auth/sign-up/email",
        {
          body: JSON.stringify({
            email: `${userB}@example.com`,
            name: "User B",
            password: "password-12345678",
            username: userB,
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
        env
      )
      .then((res) => res.headers.get("set-cookie") ?? "");

    const resTaken = await app.request(
      `/api/v1/profile/check-username?username=${userA}`,
      { headers: { Cookie: cookieB } },
      env
    );
    expect(resTaken.status).toBe(200);
    await expect(resTaken.json()).resolves.toEqual({
      available: false,
      isCurrent: false,
      source: "database",
    });

    // 3. Brand new username checking via bloom filter
    const brandNew = `fresh${crypto.randomUUID().slice(0, 8)}`;
    const resFresh = await app.request(
      `/api/v1/profile/check-username?username=${brandNew}`,
      { headers: { Cookie: cookieB } },
      env
    );
    expect(resFresh.status).toBe(200);
    const freshData = (await resFresh.json()) as {
      available: boolean;
      source: string;
    };
    expect(freshData.available).toBe(true);
  });
});
