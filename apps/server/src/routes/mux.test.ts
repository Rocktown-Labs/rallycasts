import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

import app from "../index";

const bytesToHex = (bytes: ArrayBuffer) =>
  Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");

const signMuxPayload = async (payload: string, timestamp: number) => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode("mux-webhook-secret"),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"]
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${payload}`)
  );
  return `t=${timestamp},v1=${bytesToHex(digest)}`;
};

describe("Mux webhooks", () => {
  it("rejects unsigned events", async () => {
    const response = await app.request(
      "/api/v1/mux/webhook",
      {
        body: JSON.stringify({
          id: "mux-event-unsigned",
          type: "video.asset.ready",
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
      { ...env, MUX_WEBHOOK_SECRET: "mux-webhook-secret" }
    );

    expect(response.status).toBe(401);
  });

  it("verifies and idempotently stores signed events", async () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = JSON.stringify({
      data: { id: "mux-asset-test", status: "ready" },
      id: `mux-event-${crypto.randomUUID()}`,
      type: "video.asset.ready",
    });
    const signature = await signMuxPayload(payload, timestamp);
    const request = () =>
      app.request(
        "/api/v1/mux/webhook",
        {
          body: payload,
          headers: {
            "Content-Type": "application/json",
            "Mux-Signature": signature,
          },
          method: "POST",
        },
        { ...env, MUX_WEBHOOK_SECRET: "mux-webhook-secret" }
      );

    const firstResponse = await request();
    const duplicateResponse = await request();
    expect(firstResponse.status).toBe(202);
    expect(duplicateResponse.status).toBe(200);
  });
});
