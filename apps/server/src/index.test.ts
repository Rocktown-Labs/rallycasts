import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

import app from "./index";

describe("RallyCasts API", () => {
  it("returns health status", async () => {
    const response = await app.request("/health", {}, env);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  it("returns stoker JSON for missing routes", async () => {
    const response = await app.request("/missing", {}, env);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      message: "Not Found - /missing",
    });
  });

  it("rejects protected routes without a session", async () => {
    const response = await app.request("/api/casting-jobs", {}, env);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ message: "Unauthorized" });
  });

  it("rejects unsigned Stripe webhooks", async () => {
    const response = await app.request(
      "/api/stripe/webhook",
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
