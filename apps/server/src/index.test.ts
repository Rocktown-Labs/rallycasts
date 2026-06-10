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

  it("persists Stripe webhook stubs through the D1 binding", async () => {
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

    expect(response.status).toBe(202);

    const event = await env.DB.prepare(
      "select provider, provider_event_id, event_type from webhook_event where provider_event_id = ?"
    )
      .bind("evt_test_1")
      .first();

    expect(event).toEqual({
      event_type: "payment_intent.succeeded",
      provider: "stripe",
      provider_event_id: "evt_test_1",
    });
  });

  it("exposes Better Auth health through the mounted auth route", async () => {
    const response = await app.request("/api/auth/ok", {}, env);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
