import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

import app from "../index";

const signUp = async (name: string) => {
  const username = `challenge${crypto.randomUUID().slice(0, 8)}`;
  const response = await app.request(
    "/api/auth/sign-up/email",
    {
      body: JSON.stringify({
        email: `${username}@example.com`,
        name,
        password: "password-12345678",
        username,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    env
  );
  const body = (await response.json()) as { user: { id: string } };
  return { cookie: response.headers.get("set-cookie") ?? "", id: body.user.id };
};

const jsonRequest = (
  path: string,
  cookie: string,
  body: Record<string, unknown>,
  method = "POST"
) =>
  app.request(
    path,
    {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json", Cookie: cookie },
      method,
    },
    env
  );

describe("challenges API", () => {
  it("rejects challenges issued to yourself", async () => {
    const player = await signUp("Solo Player");
    const response = await jsonRequest("/api/challenges", player.cookie, {
      challengedUserId: player.id,
      scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
      venueLabel: "Crestwood Pickleball Park",
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      message: "You cannot challenge yourself",
    });
  });

  it("issues actionable match challenges with casting and tips", async () => {
    const challenger = await signUp("Challenger");
    const opponent = await signUp("Opponent");
    const response = await jsonRequest("/api/challenges", challenger.cookie, {
      castingSplitMode: "split_evenly",
      challengedUserId: opponent.id,
      courtLabel: "Court 7",
      isCasted: true,
      matchMode: "singles",
      scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
      tipCents: 1000,
      venueLabel: "Crestwood Pickleball Park",
    });
    expect(response.status).toBe(201);
    const body = (await response.json()) as { challenge: { id: string } };

    const acceptResponse = await jsonRequest(
      `/api/challenges/${body.challenge.id}/respond`,
      opponent.cookie,
      { response: "accepted" },
      "PATCH"
    );
    expect(acceptResponse.status).toBe(200);
    await expect(acceptResponse.json()).resolves.toMatchObject({
      challenge: {
        casterTipCents: 1000,
        courtLabel: "Court 7",
        status: "accepted",
        venueLabel: "Crestwood Pickleball Park",
      },
    });

    const notifications = await app.request(
      "/api/social/notifications",
      { headers: { Cookie: opponent.cookie } },
      env
    );
    await expect(notifications.json()).resolves.toMatchObject({
      notifications: expect.arrayContaining([
        expect.objectContaining({
          notification: expect.objectContaining({ type: "challenge" }),
        }),
      ]),
    });
  });
});
