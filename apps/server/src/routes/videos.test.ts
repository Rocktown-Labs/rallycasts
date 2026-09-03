import { env } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";

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

  const cookie = response.headers.get("set-cookie");
  const body = (await response.json()) as { user: { id: string } };

  expect(cookie).toBeTruthy();

  return {
    cookie: cookie ?? "",
    id: body.user.id,
  };
};

const markEmailVerified = async (userId: string) => {
  await env.DB.prepare("update user set email_verified = 1 where id = ?")
    .bind(userId)
    .run();
};

const publishVideo = async (videoId: string, title: string) => {
  await env.DB.batch([
    env.DB.prepare(
      "update video set status = 'ready', published_at = ? where id = ?"
    ).bind(Date.now(), videoId),
    env.DB.prepare(
      "insert into search_document (id, entity_id, entity_type, title, content, embedding_status) values (?, ?, 'video', ?, ?, 'ready')"
    ).bind(crypto.randomUUID(), videoId, title, title),
  ]);
};

const jsonRequest = (
  path: string,
  cookie: string,
  body: Record<string, unknown>,
  method = "POST"
) =>
  app.request(
    path,
    {
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      method,
    },
    env
  );

describe("videos API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("issues signed playback only to an authenticated private-video owner", async () => {
    const owner = await signUp("Private Playback Owner");
    await markEmailVerified(owner.id);
    const videoId = `private-playback-${crypto.randomUUID()}`;
    await env.DB.prepare(
      "insert into video (id, owner_user_id, title, status, visibility, mux_playback_id) values (?, ?, ?, 'ready', 'private', ?)"
    )
      .bind(videoId, owner.id, "Private rally", "private-playback-id")
      .run();

    const signingKey = (await crypto.subtle.generateKey(
      {
        hash: "SHA-256",
        modulusLength: 2048,
        name: "RSASSA-PKCS1-v1_5",
        publicExponent: new Uint8Array([1, 0, 1]),
      },
      true,
      ["sign", "verify"]
    )) as CryptoKeyPair;
    const privateKey = btoa(
      String.fromCodePoint(
        ...new Uint8Array(
          await crypto.subtle.exportKey("pkcs8", signingKey.privateKey)
        )
      )
    );

    const response = await app.request(
      `/api/v1/videos/${videoId}/playback`,
      { headers: { Cookie: owner.cookie } },
      {
        ...env,
        MUX_SIGNING_KEY_ID: "test-signing-key",
        MUX_SIGNING_KEY_SECRET: privateKey,
      }
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { playbackUrl: string };
    const playbackUrl = new URL(body.playbackUrl);
    const token = playbackUrl.searchParams.get("token");
    expect(playbackUrl.hostname).toBe("stream.mux.com");
    expect(token).toBeTruthy();
    expect(token).not.toContain("private-playback-id");
    const [, encodedPayload] = token?.split(".") ?? [];
    const payload = JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(
          atob(
            `${encodedPayload}${"=".repeat((4 - ((encodedPayload?.length ?? 0) % 4)) % 4)}`
              .replaceAll("-", "+")
              .replaceAll("_", "/")
          ),
          (character) => character.codePointAt(0) ?? 0
        )
      )
    ) as { aud: string; kid: string; sub: string };
    expect(payload).toMatchObject({
      aud: "v",
      kid: "test-signing-key",
      sub: "private-playback-id",
    });
  });

  it("does not expose internal media fields in public video responses", async () => {
    const owner = await signUp("Public Media Owner");
    const videoId = `public-media-${crypto.randomUUID()}`;
    await env.DB.prepare(
      "insert into video (id, owner_user_id, title, status, visibility, mux_asset_id, mux_playback_id, mux_playback_policy, mux_status, mux_upload_id, r2_key) values (?, ?, ?, 'ready', 'public', ?, ?, 'public', ?, ?, ?)"
    )
      .bind(
        videoId,
        owner.id,
        "Public response privacy",
        "private-asset-id",
        "public-playback-id",
        "ready",
        "private-upload-id",
        "private/r2-key"
      )
      .run();

    const response = await app.request(`/api/v1/videos/${videoId}`, {}, env);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { video: Record<string, unknown> };
    expect(body.video).not.toHaveProperty("muxAssetId");
    expect(body.video).not.toHaveProperty("muxPlaybackPolicy");
    expect(body.video).not.toHaveProperty("muxStatus");
    expect(body.video).not.toHaveProperty("muxUploadId");
    expect(body.video).not.toHaveProperty("r2Key");
    expect(body.video).toHaveProperty("muxPlaybackId", "public-playback-id");
  });

  it("does not expose a signed playback ID through a public serializer", async () => {
    const owner = await signUp("Signed Public Video Owner");
    const videoId = `signed-public-${crypto.randomUUID()}`;
    await env.DB.prepare(
      "insert into video (id, owner_user_id, title, status, visibility, mux_playback_id, mux_playback_policy) values (?, ?, ?, 'ready', 'public', ?, 'signed')"
    )
      .bind(videoId, owner.id, "Signed public rally", "signed-playback-id")
      .run();

    const response = await app.request(`/api/v1/videos/${videoId}`, {}, env);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { video: Record<string, unknown> };
    expect(body.video).not.toHaveProperty("muxPlaybackId");
    expect(body.video).not.toHaveProperty("thumbnailUrl");
  });

  it("keeps private and processing videos out of public detail routes", async () => {
    const owner = await signUp("Private Video Owner");
    const privateVideoId = `private-${crypto.randomUUID()}`;
    await env.DB.prepare(
      "insert into video (id, owner_user_id, title, status, visibility) values (?, ?, ?, 'processing', 'private')"
    )
      .bind(privateVideoId, owner.id, "Private processing rally")
      .run();

    const publicResponse = await app.request(
      `/api/v1/videos/${privateVideoId}`,
      {},
      env
    );
    expect(publicResponse.status).toBe(404);

    const searchResponse = await app.request(
      "/api/v1/search?q=Private%20processing&type=videos",
      {},
      env
    );
    expect(searchResponse.status).toBe(200);
    await expect(searchResponse.json()).resolves.toMatchObject({ videos: [] });

    const studioResponse = await app.request(
      `/api/v1/videos/${privateVideoId}/studio`,
      { headers: { Cookie: owner.cookie } },
      env
    );
    expect(studioResponse.status).toBe(200);
  });

  it("updates Mux policy before making an asset public", async () => {
    const owner = await signUp("Mux Policy Owner");
    await markEmailVerified(owner.id);
    const videoId = `mux-policy-${crypto.randomUUID()}`;
    await env.DB.prepare(
      "insert into video (id, owner_user_id, title, status, visibility, mux_asset_id, mux_playback_policy) values (?, ?, ?, 'ready', 'private', ?, 'signed')"
    )
      .bind(videoId, owner.id, "Mux policy transition", "asset-to-publish")
      .run();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ data: { playback_ids: [] } }))
      .mockResolvedValueOnce(
        Response.json({
          data: { id: "public-playback-replacement", policy: "public" },
        })
      );

    const response = await jsonRequest(
      `/api/v1/videos/${videoId}`,
      owner.cookie,
      { visibility: "public" },
      "PATCH"
    );

    expect(response.status).toBe(200);
    const updated = await env.DB.prepare(
      "select visibility, mux_playback_policy from video where id = ?"
    )
      .bind(videoId)
      .first<{ mux_playback_policy: string; visibility: string }>();
    expect(updated).toEqual({
      mux_playback_policy: "public",
      visibility: "public",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.mux.com/video/v1/assets/asset-to-publish/playback-ids",
      expect.objectContaining({
        body: JSON.stringify({ policy: "public" }),
        method: "POST",
      })
    );
  });

  it("removes a video search document when its visibility becomes private", async () => {
    const owner = await signUp("Search Visibility Owner");
    const createResponse = await jsonRequest("/api/v1/videos", owner.cookie, {
      status: "ready",
      title: "Public semantic kitchen battle",
      visibility: "public",
    });
    expect(createResponse.status).toBe(201);
    const created = (await createResponse.json()) as { video: { id: string } };
    await publishVideo(created.video.id, "Public semantic kitchen battle");

    const indexedBefore = await env.DB.prepare(
      "select id from search_document where entity_type = 'video' and entity_id = ?"
    )
      .bind(created.video.id)
      .first();
    expect(indexedBefore).toBeTruthy();

    const updateResponse = await jsonRequest(
      `/api/v1/videos/${created.video.id}`,
      owner.cookie,
      { visibility: "private" },
      "PATCH"
    );
    expect(updateResponse.status).toBe(200);

    const indexedAfter = await env.DB.prepare(
      "select id from search_document where entity_type = 'video' and entity_id = ?"
    )
      .bind(created.video.id)
      .first();
    expect(indexedAfter).toBeNull();
  });

  it("returns semantic video matches when keywords do not match", async () => {
    const owner = await signUp("Semantic Search Owner");
    const videoId = `semantic-video-${crypto.randomUUID()}`;
    const documentId = `semantic-document-${crypto.randomUUID()}`;
    await env.DB.batch([
      env.DB.prepare(
        "insert into video (id, owner_user_id, title, status, visibility) values (?, ?, ?, 'ready', 'public')"
      ).bind(videoId, owner.id, "Third shot reset masterclass"),
      env.DB.prepare(
        "insert into search_document (id, entity_id, entity_type, title, content, embedding_status) values (?, ?, 'video', ?, ?, 'ready')"
      ).bind(
        documentId,
        videoId,
        "Third shot reset masterclass",
        "Advanced transition-zone strategy"
      ),
    ]);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ embedding: { values: [0.1, 0.2] } })
    );

    const response = await app.request(
      "/api/v1/search?q=soft%20game%20strategy&type=videos",
      {},
      {
        ...env,
        SEARCH_INDEX: {
          query: () =>
            Promise.resolve({
              matches: [{ id: documentId, score: 0.92 }],
            }),
          upsert: () => Promise.resolve(),
        },
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ai: { mode: "semantic" },
      videos: [{ id: videoId }],
    });
  });

  it("builds an authenticated hybrid recommendation feed", async () => {
    const owner = await signUp("Feed Video Owner");
    const viewer = await signUp("Feed Viewer");
    const videoId = `feed-video-${crypto.randomUUID()}`;
    const documentId = `feed-document-${crypto.randomUUID()}`;
    await env.DB.batch([
      env.DB.prepare(
        "insert into video (id, owner_user_id, title, status, visibility) values (?, ?, ?, 'ready', 'public')"
      ).bind(videoId, owner.id, "Advanced doubles transition strategy"),
      env.DB.prepare(
        "insert into search_document (id, entity_id, entity_type, title, content, embedding_status) values (?, ?, 'video', ?, ?, 'ready')"
      ).bind(
        documentId,
        videoId,
        "Advanced doubles transition strategy",
        "Competitive pickleball match analysis"
      ),
      env.DB.prepare(
        "insert into user_profile (user_id, bio, skill_level, onboarding_status) values (?, ?, 'advanced', 'complete') on conflict(user_id) do update set bio = excluded.bio, skill_level = excluded.skill_level"
      ).bind(viewer.id, "Competitive doubles and match analysis"),
    ]);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ embedding: { values: [0.1, 0.2] } })
    );

    const response = await app.request(
      "/api/v1/videos/feed",
      { headers: { Cookie: viewer.cookie } },
      {
        ...env,
        SEARCH_INDEX: {
          query: () =>
            Promise.resolve({
              matches: [{ id: documentId, score: 0.95 }],
            }),
          upsert: () => Promise.resolve(),
        },
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      mode: "hybrid",
      videos: [
        {
          id: videoId,
          recommendationReason: "Matches your pickleball interests",
        },
      ],
    });
  });

  it("creates an owner-linked private draft before direct Mux upload", async () => {
    const owner = await signUp("Mux Upload Owner");
    await markEmailVerified(owner.id);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json(
        {
          data: {
            id: "mux-upload-test",
            new_asset_settings: { playback_policy: ["public"] },
            status: "waiting",
            url: "https://storage.googleapis.com/video-upload-test",
          },
        },
        { status: 201 }
      )
    );

    const response = await app.request(
      "/api/v1/upload/mux",
      {
        body: JSON.stringify({ title: "Uploaded kitchen battle" }),
        headers: {
          "Content-Type": "application/json",
          Cookie: owner.cookie,
        },
        method: "POST",
      },
      { ...env, MUX_TOKEN_ID: "mux-token", MUX_TOKEN_SECRET: "mux-secret" }
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      uploadId: "mux-upload-test",
      video: {
        ownerUserId: owner.id,
        status: "uploading",
        visibility: "private",
      },
    });
  });

  it("paginates public videos with an opaque cursor", async () => {
    const owner = await signUp("Pagination Owner");
    await env.DB.batch(
      Array.from({ length: 13 }, (_, index) =>
        env.DB.prepare(
          "insert into video (id, owner_user_id, title, status, visibility) values (?, ?, ?, 'ready', 'public')"
        ).bind(
          `pagination-video-${index.toString().padStart(2, "0")}`,
          owner.id,
          `Pagination rally ${index}`
        )
      )
    );

    const firstResponse = await app.request("/api/v1/videos?limit=5", {}, env);
    expect(firstResponse.status).toBe(200);
    const firstPage = (await firstResponse.json()) as {
      nextCursor: string | null;
      videos: { id: string }[];
    };

    expect(firstPage.videos).toHaveLength(5);
    expect(firstPage.nextCursor).toBeTruthy();

    const secondResponse = await app.request(
      `/api/v1/videos?limit=5&cursor=${encodeURIComponent(firstPage.nextCursor ?? "")}`,
      {},
      env
    );
    expect(secondResponse.status).toBe(200);
    const secondPage = (await secondResponse.json()) as {
      nextCursor: string | null;
      videos: { id: string }[];
    };

    expect(secondPage.videos).toHaveLength(5);
    expect(
      secondPage.videos.some((video) =>
        firstPage.videos.some((firstVideo) => firstVideo.id === video.id)
      )
    ).toBe(false);

    const detailResponse = await app.request(
      `/api/v1/videos/${firstPage.videos[0]?.id}`,
      {},
      env
    );
    expect(detailResponse.status).toBe(200);
    const detail = (await detailResponse.json()) as {
      relatedVideos: { id: string }[];
      video: { id: string };
    };
    expect(detail.relatedVideos.length).toBeGreaterThan(0);
    expect(detail.relatedVideos).not.toContainEqual(
      expect.objectContaining({ id: detail.video.id })
    );

    const invalidResponse = await app.request(
      "/api/v1/videos?cursor=not-a-cursor",
      {},
      env
    );
    expect(invalidResponse.status).toBe(400);
  });

  it("lets video owners pin one comment to the top", async () => {
    const owner = await signUp("Video Owner");
    const commenter = await signUp("Comment Friend");
    const videoResponse = await jsonRequest("/api/v1/videos", owner.cookie, {
      description: "Arkansas open play test clip",
      mediaType: "video",
      title: "Bentonville kitchen battle",
      visibility: "public",
    });

    expect(videoResponse.status).toBe(201);
    const videoData = (await videoResponse.json()) as {
      video: { id: string };
    };
    const videoId = videoData.video.id;
    await publishVideo(videoId, "Bentonville kitchen battle");
    const commentResponse = await jsonRequest(
      `/api/v1/videos/${videoId}/comments`,
      commenter.cookie,
      { content: "Pin this scouting note." }
    );

    expect(commentResponse.status).toBe(201);
    const commentData = (await commentResponse.json()) as {
      comment: { id: string };
    };

    const unauthorizedPin = await jsonRequest(
      `/api/v1/videos/${videoId}/comments/${commentData.comment.id}/pin`,
      commenter.cookie,
      { pinned: true },
      "PATCH"
    );

    expect(unauthorizedPin.status).toBe(404);

    const pinResponse = await jsonRequest(
      `/api/v1/videos/${videoId}/comments/${commentData.comment.id}/pin`,
      owner.cookie,
      { pinned: true },
      "PATCH"
    );

    expect(pinResponse.status).toBe(200);

    const commentsResponse = await app.request(
      `/api/v1/videos/${videoId}/comments`,
      {},
      env
    );
    const commentsData = (await commentsResponse.json()) as {
      comments: { id: string; isPinned: boolean }[];
    };

    expect(commentsData.comments[0]).toMatchObject({
      id: commentData.comment.id,
      isPinned: true,
    });
  });
});
