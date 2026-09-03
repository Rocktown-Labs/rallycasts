import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

import app from "./index";

describe("RallyCasts API", () => {
  it("returns health status", async () => {
    const response = await app.request("/health", {}, env);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("SAMEORIGIN");
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  it("returns stoker JSON for missing routes", async () => {
    const response = await app.request("/missing", {}, env);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      message: "Not Found - /missing",
    });
  });

  it("rejects cross-site authentication mutations", async () => {
    const response = await app.request(
      "/api/auth/sign-in/email",
      {
        body: JSON.stringify({
          email: "player@example.com",
          password: "password-12345678",
        }),
        headers: {
          "Content-Type": "application/json",
          Origin: "https://attacker.example",
        },
        method: "POST",
      },
      env
    );

    expect(response.status).toBe(403);
  });

  it("rejects cross-site WebSocket upgrades", async () => {
    const response = await app.request(
      "/api/v1/social/notifications/realtime",
      {
        headers: {
          Origin: "https://attacker.example",
          Upgrade: "websocket",
        },
      },
      env
    );

    expect(response.status).toBe(403);
  });

  it("rejects protected routes without a session", async () => {
    const response = await app.request("/api/v1/casting-jobs", {}, env);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ message: "Unauthorized" });
  });

  it("does not expose unversioned app API routes", async () => {
    const response = await app.request("/api/casting-jobs", {}, env);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      message: "Not Found - /api/casting-jobs",
    });
  });

  it("rejects unsigned Stripe webhooks", async () => {
    const response = await app.request(
      "/api/v1/stripe/webhook",
      {
        body: JSON.stringify({
          id: "evt_test_1",
          type: "payment_intent.succeeded",
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
      env
    );

    expect(response.status).toBe(401);
  });

  it("exposes Better Auth health through the mounted auth route", async () => {
    const response = await app.request("/api/auth/ok", {}, env);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
