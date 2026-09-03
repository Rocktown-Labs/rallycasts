import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

import app from "../index";

const signUp = async (name: string, email?: string) => {
  const username = `${name.toLowerCase().replaceAll(" ", "")}${crypto.randomUUID().slice(0, 8)}`;
  const response = await app.request(
    "/api/auth/sign-up/email",
    {
      body: JSON.stringify({
        email: email ?? `${username}@example.com`,
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

  const cookie = response.headers.get("set-cookie");
  const body = (await response.json()) as { user: { id: string } };
  expect(cookie).toBeTruthy();

  return { cookie: cookie ?? "", id: body.user.id };
};

const promoteToAdmin = async (userId: string) => {
  await env.DB.prepare(
    "insert into user_profile (user_id, platform_role) values (?, 'admin') on conflict(user_id) do update set platform_role = 'admin'"
  )
    .bind(userId)
    .run();
  await env.DB.prepare("update user set email_verified = 1 where id = ?")
    .bind(userId)
    .run();
};

describe("admin API", () => {
  it("rejects non-admin users", async () => {
    const { cookie } = await signUp("Regular Player");
    const response = await app.request(
      "/api/v1/admin/dashboard",
      {
        headers: { Cookie: cookie },
      },
      env
    );

    expect(response.status).toBe(403);
  });

  it("returns platform metrics for admins", async () => {
    const admin = await signUp("RallyCasts Admin", "camstewart7@gmail.com");
    await promoteToAdmin(admin.id);
    const response = await app.request(
      "/api/v1/admin/dashboard",
      {
        headers: { Cookie: admin.cookie },
      },
      env
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      health: {
        apiVersion: "v1",
      },
      totals: {
        users: 1,
      },
      users: {
        onboarded: 0,
      },
    });
  });

  it("allows admins to queue search backfill", async () => {
    const admin = await signUp("RallyCasts Admin", "camstewart7@gmail.com");
    await promoteToAdmin(admin.id);
    const response = await app.request(
      "/api/v1/admin/search/backfill",
      {
        headers: { Cookie: admin.cookie },
        method: "POST",
      },
      env
    );

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({
      queued: {
        events: 0,
        posts: 0,
        profiles: 0,
        venues: 0,
        videos: 0,
      },
    });
  });
});
