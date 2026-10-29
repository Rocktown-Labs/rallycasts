import { env } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";

import app from "../index";

const bytesToHex = (bytes: ArrayBuffer) =>
  Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");

const signMuxPayload = async (payload: string, timestamp: number) => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode("mux-live-webhook-secret"),
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
  await env.DB.prepare("update user set email_verified = 1 where id = ?")
    .bind(body.user.id)
    .run();
  return { cookie, id: body.user.id };
};

const createLiveStream = (cookie: string, title = "Court 1 championship") =>
  app.request(
    "/api/v1/live-streams",
    {
      body: JSON.stringify({ title }),
      headers: { "Content-Type": "application/json", Cookie: cookie },
      method: "POST",
    },
    env
  );

describe("live streams API", () => {
  afterEach(() => vi.restoreAllMocks());

  it("creates a Mux live stream and keeps the stream key owner-only", async () => {
    const owner = await signUp("Live Owner");
    const viewer = await signUp("Live Viewer");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json({
        data: {
          id: "mux-live-1",
          playback_ids: [{ id: "live-playback-1", policy: "public" }],
          status: "idle",
          stream_key: "secret-stream-key",
        },
      })
    );

    const response = await createLiveStream(owner.cookie);
    expect(response.status).toBe(201);
    const body = (await response.json()) as {
      liveStream: { id: string; streamKey: string; ingestUrl: string };
    };
    expect(body.liveStream.streamKey).toBe("secret-stream-key");
    expect(body.liveStream.ingestUrl).toContain("global-live.mux.com");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.mux.com/video/v1/live-streams",
      expect.objectContaining({ method: "POST" })
    );

    const ownerView = await app.request(
      `/api/v1/live-streams/${body.liveStream.id}`,
      { headers: { Cookie: owner.cookie } },
      env
    );
    expect(ownerView.status).toBe(200);
    const ownerBody = (await ownerView.json()) as {
      liveStream: { streamKey?: string };
    };
    expect(ownerBody.liveStream.streamKey).toBe("secret-stream-key");

    const publicView = await app.request(
      `/api/v1/live-streams/${body.liveStream.id}`,
      { headers: { Cookie: viewer.cookie } },
      env
    );
    expect(publicView.status).toBe(200);
    const publicBody = (await publicView.json()) as {
      liveStream: { streamKey?: string };
    };
    expect(publicBody.liveStream.streamKey).toBeUndefined();

    const unsafeUpdate = await app.request(
      `/api/v1/live-streams/${body.liveStream.id}`,
      {
        body: JSON.stringify({ visibility: "private" }),
        headers: { "Content-Type": "application/json", Cookie: owner.cookie },
        method: "PATCH",
      },
      env
    );
    expect(unsafeUpdate.status).toBe(409);
    const unchanged = await env.DB.prepare(
      "select visibility from live_stream where id = ?"
    )
      .bind(body.liveStream.id)
      .first<{ visibility: string }>();
    expect(unchanged?.visibility).toBe("public");
  });

  it("hides private streams from the public directory and detail page", async () => {
    const owner = await signUp("Private Live Owner");
    const viewer = await signUp("Private Live Viewer");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json({
        data: {
          id: "mux-live-private",
          playback_ids: [{ id: "private-playback", policy: "signed" }],
          status: "idle",
          stream_key: "private-stream-key",
        },
      })
    );

    const createResponse = await app.request(
      "/api/v1/live-streams",
      {
        body: JSON.stringify({
          latencyMode: "standard",
          title: "Private practice",
          visibility: "private",
        }),
        headers: { "Content-Type": "application/json", Cookie: owner.cookie },
        method: "POST",
      },
      env
    );
    expect(createResponse.status).toBe(201);
    const created = (await createResponse.json()) as {
      liveStream: { id: string };
    };
    await env.DB.prepare(
      "update live_stream set status = 'active' where id = ?"
    )
      .bind(created.liveStream.id)
      .run();

    const listResponse = await app.request("/api/v1/live-streams", {}, env);
    expect(listResponse.status).toBe(200);
    const list = (await listResponse.json()) as {
      liveStreams: { id: string }[];
    };
    expect(
      list.liveStreams.some((item) => item.id === created.liveStream.id)
    ).toBe(false);

    const viewerDetail = await app.request(
      `/api/v1/live-streams/${created.liveStream.id}`,
      { headers: { Cookie: viewer.cookie } },
      env
    );
    expect(viewerDetail.status).toBe(404);

    const editResponse = await app.request(
      `/api/v1/live-streams/${created.liveStream.id}`,
      {
        body: JSON.stringify({ title: "Updated private practice" }),
        headers: { "Content-Type": "application/json", Cookie: owner.cookie },
        method: "PATCH",
      },
      env
    );
    expect(editResponse.status).toBe(200);
    const edited = (await editResponse.json()) as {
      liveStream: { title: string; visibility: string; latencyMode: string };
    };
    expect(edited.liveStream.title).toBe("Updated private practice");
    expect(edited.liveStream.visibility).toBe("private");
    expect(edited.liveStream.latencyMode).toBe("standard");

    const latencyChange = await app.request(
      `/api/v1/live-streams/${created.liveStream.id}`,
      {
        body: JSON.stringify({ latencyMode: "low" }),
        headers: { "Content-Type": "application/json", Cookie: owner.cookie },
        method: "PATCH",
      },
      env
    );
    expect(latencyChange.status).toBe(409);
  });

  it("updates live status and publishes the recording as a replay video", async () => {
    const owner = await signUp("Live Replay Owner");
    const liveId = `live-${crypto.randomUUID()}`;
    await env.DB.prepare(
      "insert into live_stream (id, owner_user_id, title, status, mux_live_stream_id, mux_stream_key, mux_playback_id, visibility, latency_mode) values (?, ?, 'Friday night doubles', 'idle', 'mux-live-replay', 'key-replay', 'playback-replay', 'public', 'low')"
    )
      .bind(liveId, owner.id)
      .run();

    const activePayload = JSON.stringify({
      data: {
        active_asset_id: "asset-live-1",
        id: "mux-live-replay",
        playback_ids: [{ id: "playback-replay", policy: "public" }],
        status: "active",
      },
      id: `mux-event-${crypto.randomUUID()}`,
      type: "video.live_stream.active",
    });
    const activeTimestamp = Math.floor(Date.now() / 1000);
    const activeResponse = await app.request(
      "/api/v1/mux/webhook",
      {
        body: activePayload,
        headers: {
          "Content-Type": "application/json",
          "Mux-Signature": await signMuxPayload(activePayload, activeTimestamp),
        },
        method: "POST",
      },
      { ...env, MUX_WEBHOOK_SECRET: "mux-live-webhook-secret" }
    );
    expect(activeResponse.status).toBe(202);

    const activeRow = await env.DB.prepare(
      "select status from live_stream where id = ?"
    )
      .bind(liveId)
      .first<{ status: string }>();
    expect(activeRow?.status).toBe("active");

    const completedPayload = JSON.stringify({
      data: {
        duration: 123.4,
        id: "asset-live-replay",
        live_stream_id: "mux-live-replay",
        playback_ids: [{ id: "replay-playback", policy: "public" }],
        status: "ready",
      },
      id: `mux-event-${crypto.randomUUID()}`,
      type: "video.asset.live_stream_completed",
    });
    const completedResponse = await app.request(
      "/api/v1/mux/webhook",
      {
        body: completedPayload,
        headers: {
          "Content-Type": "application/json",
          "Mux-Signature": await signMuxPayload(
            completedPayload,
            activeTimestamp
          ),
        },
        method: "POST",
      },
      { ...env, MUX_WEBHOOK_SECRET: "mux-live-webhook-secret" }
    );
    expect(completedResponse.status).toBe(202);

    const replay = await env.DB.prepare(
      "select recording_video_id, status from live_stream where id = ?"
    )
      .bind(liveId)
      .first<{ recording_video_id: string; status: string }>();
    expect(replay?.status).toBe("completed");
    expect(replay?.recording_video_id).toBeTruthy();

    const replayVideo = await env.DB.prepare(
      "select title, status, duration_seconds, mux_playback_id from video where id = ?"
    )
      .bind(replay?.recording_video_id)
      .first<{
        duration_seconds: number;
        mux_playback_id: string;
        status: string;
        title: string;
      }>();
    expect(replayVideo?.status).toBe("ready");
    expect(replayVideo?.title).toBe("Friday night doubles replay");
    expect(replayVideo?.duration_seconds).toBe(123);
    expect(replayVideo?.mux_playback_id).toBe("replay-playback");

    // A second broadcast on the same ingest key must not replace the first.
    const { applyMuxLiveStreamUpdate } = await import("../lib/live-streams");
    const { createDb } = await import("@rallycaststv/db");
    const db = createDb(env.DB);
    const secondAsset = {
      duration: 45,
      id: "asset-live-replay-second",
      live_stream_id: "mux-live-replay",
      playback_ids: [{ id: "second-playback", policy: "public" }],
    };
    const secondReplay = await applyMuxLiveStreamUpdate(
      db,
      env,
      "video.asset.live_stream_completed",
      secondAsset
    );
    const retriedReplay = await applyMuxLiveStreamUpdate(
      db,
      env,
      "video.asset.live_stream_completed",
      secondAsset
    );
    expect(secondReplay?.id).not.toBe(replay?.recording_video_id);
    expect(retriedReplay?.id).toBe(secondReplay?.id);
    const original = await env.DB.prepare(
      "select mux_playback_id from video where id = ?"
    )
      .bind(replay?.recording_video_id)
      .first<{ mux_playback_id: string }>();
    expect(original?.mux_playback_id).toBe("replay-playback");
  });
});
