import { createDb } from "@rallycaststv/db";
import { env } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";

import { sendPushNotifications } from "./push";

const insertUserAndToken = async (suffix: string) => {
  const userId = `push-user-${suffix}-${crypto.randomUUID()}`;
  const tokenId = `push-token-${suffix}-${crypto.randomUUID()}`;
  const token = `ExponentPushToken[${crypto.randomUUID()}]`;
  await env.DB.batch([
    env.DB.prepare(
      "insert into user (id, email, name, email_verified) values (?, ?, ?, 1)"
    ).bind(userId, `${userId}@example.com`, "Push Tester"),
    env.DB.prepare(
      "insert into push_token (id, user_id, token, platform) values (?, ?, ?, 'ios')"
    ).bind(tokenId, userId, token),
  ]);
  return { token, tokenId, userId };
};

describe("Expo push sender", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sends a batch and stores the push receipt ticket", async () => {
    const { token, tokenId, userId } = await insertUserAndToken("ok");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json({
        data: [{ id: "ticket-ok", status: "ok" }],
      })
    );

    const result = await sendPushNotifications(
      createDb(env.DB),
      { EXPO_ACCESS_TOKEN: "expo-token" },
      [{ body: "Court 2 is ready", title: "Match ready", userId }]
    );

    expect(result).toEqual({ failed: 0, sent: 1, skipped: 0 });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://exp.host/--/api/v2/push/send",
      expect.objectContaining({
        body: expect.stringContaining(token),
        method: "POST",
      })
    );

    const receipt = await env.DB.prepare(
      "select status, ticket_id from push_receipt where push_token_id = ?"
    )
      .bind(tokenId)
      .first<{ status: string; ticket_id: string }>();
    expect(receipt).toEqual({ status: "pending", ticket_id: "ticket-ok" });
  });

  it("disables a token when Expo reports DeviceNotRegistered", async () => {
    const { tokenId, userId } = await insertUserAndToken("invalid");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json({
        data: [
          {
            details: { error: "DeviceNotRegistered" },
            message: "Device is not registered",
            status: "error",
          },
        ],
      })
    );

    const result = await sendPushNotifications(createDb(env.DB), {}, [
      { body: "Score confirmed", title: "Score confirmed", userId },
    ]);

    expect(result).toEqual({ failed: 1, sent: 0, skipped: 0 });
    const row = await env.DB.prepare(
      "select disabled_at from push_token where id = ?"
    )
      .bind(tokenId)
      .first<{ disabled_at: number | null }>();
    expect(row?.disabled_at).not.toBeNull();
  });
});
