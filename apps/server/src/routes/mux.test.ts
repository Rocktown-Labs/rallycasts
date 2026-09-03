import { env } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";

import app from "../index";
import { replaceMuxAssetPlaybackPolicy } from "../lib/mux-client";

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
  afterEach(() => vi.restoreAllMocks());

  it("creates and revokes playback IDs when a policy changes", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ data: { playback_ids: [] } }))
      .mockResolvedValueOnce(
        Response.json({ data: { id: "signed-playback", policy: "signed" } })
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    await expect(
      replaceMuxAssetPlaybackPolicy(
        "mux-asset-policy",
        "signed",
        "mux-token",
        "mux-secret",
        "public-playback"
      )
    ).resolves.toBe("signed-playback");
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.mux.com/video/v1/assets/mux-asset-policy/playback-ids",
      expect.objectContaining({
        body: JSON.stringify({ policy: "signed" }),
        method: "POST",
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "https://api.mux.com/video/v1/assets/mux-asset-policy/playback-ids/public-playback",
      expect.objectContaining({ method: "DELETE" })
    );
  });

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
