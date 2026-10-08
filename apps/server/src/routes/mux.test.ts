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

  it("corrects the media type when the footage orientation disagrees", async () => {
    const owner = `orientation${crypto.randomUUID().slice(0, 8)}`;
    const signUpResponse = await app.request(
      "/api/auth/sign-up/email",
      {
        body: JSON.stringify({
          email: `${owner}@example.com`,
          name: "Orientation Owner",
          password: "password-12345678",
          username: owner,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
      env
    );
    const signUpBody = (await signUpResponse.json()) as {
      user: { id: string };
    };
    const videoId = `orientation-${crypto.randomUUID()}`;
    await env.DB.prepare(
      "insert into video (id, title, owner_user_id, status, visibility, media_type, mux_upload_id, mux_playback_policy) values (?, ?, ?, 'processing', 'public', 'short', ?, 'public')"
    )
      .bind(videoId, "Landscape clip", signUpBody.user.id, `upload-${videoId}`)
      .run();

    const timestamp = Math.floor(Date.now() / 1000);
    const payload = JSON.stringify({
      data: {
        duration: 42,
        id: `asset-${videoId}`,
        playback_ids: [{ id: `playback-${videoId}`, policy: "public" }],
        status: "ready",
        tracks: [{ max_height: 1080, max_width: 1920, type: "video" }],
        upload_id: `upload-${videoId}`,
      },
      id: `mux-event-${crypto.randomUUID()}`,
      type: "video.asset.ready",
    });
    const signature = await signMuxPayload(payload, timestamp);
    const response = await app.request(
      "/api/v1/mux/webhook",
      {
        body: payload,
        headers: {
          "Content-Type": "application/json",
          "Mux-Signature": `t=${timestamp},v1=${signature}`,
        },
        method: "POST",
      },
      { ...env, MUX_WEBHOOK_SECRET: "mux-webhook-secret" }
    );
    expect(response.status).toBe(202);

    const stored = await env.DB.prepare(
      "select media_type, status from video where id = ?"
    )
      .bind(videoId)
      .first<{ media_type: string; status: string }>();
    // A landscape upload declared as a short becomes a regular video: the
    // asset wins and the shelves stay honest.
    expect(stored).toMatchObject({ media_type: "video", status: "ready" });
  });

  it("keeps vertical footage as a short", async () => {
    const owner = `vertical${crypto.randomUUID().slice(0, 8)}`;
    const signUpResponse = await app.request(
      "/api/auth/sign-up/email",
      {
        body: JSON.stringify({
          email: `${owner}@example.com`,
          name: "Vertical Owner",
          password: "password-12345678",
          username: owner,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
      env
    );
    const signUpBody = (await signUpResponse.json()) as {
      user: { id: string };
    };
    const videoId = `vertical-${crypto.randomUUID()}`;
    await env.DB.prepare(
      "insert into video (id, title, owner_user_id, status, visibility, media_type, mux_upload_id, mux_playback_policy) values (?, ?, ?, 'processing', 'public', 'short', ?, 'public')"
    )
      .bind(videoId, "Vertical clip", signUpBody.user.id, `upload-${videoId}`)
      .run();

    const timestamp = Math.floor(Date.now() / 1000);
    const payload = JSON.stringify({
      data: {
        duration: 30,
        id: `asset-${videoId}`,
        playback_ids: [{ id: `playback-${videoId}`, policy: "public" }],
        status: "ready",
        tracks: [{ max_height: 1920, max_width: 1080, type: "video" }],
        upload_id: `upload-${videoId}`,
      },
      id: `mux-event-${crypto.randomUUID()}`,
      type: "video.asset.ready",
    });
    const signature = await signMuxPayload(payload, timestamp);
    const response = await app.request(
      "/api/v1/mux/webhook",
      {
        body: payload,
        headers: {
          "Content-Type": "application/json",
          "Mux-Signature": `t=${timestamp},v1=${signature}`,
        },
        method: "POST",
      },
      { ...env, MUX_WEBHOOK_SECRET: "mux-webhook-secret" }
    );
    expect(response.status).toBe(202);

    const stored = await env.DB.prepare(
      "select media_type, status from video where id = ?"
    )
      .bind(videoId)
      .first<{ media_type: string; status: string }>();
    expect(stored).toMatchObject({ media_type: "short", status: "ready" });
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
