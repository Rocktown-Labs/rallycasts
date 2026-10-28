import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

import app from "../index";

const signUp = async (name: string) => {
  const username = `${name.toLowerCase().replaceAll(" ", "")}${crypto.randomUUID().slice(0, 8)}`;
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
  expect(response.status).toBe(200);
  const cookie = response.headers.get("set-cookie") ?? "";
  const body = (await response.json()) as { user: { id: string } };
  return { cookie, id: body.user.id };
};

const register = (
  cookie: string,
  token: string,
  platform: "ios" | "android" | "unknown" = "ios"
) =>
  app.request(
    "/api/v1/push/register",
    {
      body: JSON.stringify({ platform, token }),
      headers: { "Content-Type": "application/json", Cookie: cookie },
      method: "POST",
    },
    env
  );

describe("push token API", () => {
  it("registers a device token and moves it when another user signs in", async () => {
    const first = await signUp("Push One");
    const second = await signUp("Push Two");
    const token = `ExponentPushToken[${crypto.randomUUID()}]`;

    const firstResponse = await register(first.cookie, token);
    expect(firstResponse.status).toBe(200);

    const stored = await env.DB.prepare(
      "select user_id from push_token where token = ?"
    )
      .bind(token)
      .first<{ user_id: string }>();
    expect(stored?.user_id).toBe(first.id);

    const secondResponse = await register(second.cookie, token, "android");
    expect(secondResponse.status).toBe(200);

    const moved = await env.DB.prepare(
      "select platform, user_id from push_token where token = ?"
    )
      .bind(token)
      .first<{ platform: string; user_id: string }>();
    expect(moved?.user_id).toBe(second.id);
    expect(moved?.platform).toBe("android");

    const statusResponse = await app.request(
      "/api/v1/push/status",
      { headers: { Cookie: second.cookie } },
      env
    );
    expect(statusResponse.status).toBe(200);
    const statusBody = (await statusResponse.json()) as { devices: number };
    expect(statusBody.devices).toBe(1);
  });

  it("rejects malformed tokens and unregisters a device", async () => {
    const player = await signUp("Push Unregister");
    const token = `ExponentPushToken[${crypto.randomUUID()}]`;

    const invalid = await register(player.cookie, "not-a-token");
    expect(invalid.status).toBe(400);

    const registered = await register(player.cookie, token);
    expect(registered.status).toBe(200);
    const unregister = await app.request(
      "/api/v1/push/unregister",
      {
        body: JSON.stringify({ token }),
        headers: { "Content-Type": "application/json", Cookie: player.cookie },
        method: "POST",
      },
      env
    );
    expect(unregister.status).toBe(200);

    const remaining = await env.DB.prepare(
      "select count(*) as count from push_token where token = ?"
    )
      .bind(token)
      .first<{ count: number }>();
    expect(remaining?.count).toBe(0);
  });
});
