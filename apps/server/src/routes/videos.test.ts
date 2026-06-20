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

  it("keeps private and processing videos out of public detail routes", async () => {
    const owner = await signUp("Private Video Owner");
    const privateVideoId = `private-${crypto.randomUUID()}`;
    await env.DB.prepare(
      "insert into video (id, owner_user_id, title, status, visibility) values (?, ?, ?, 'processing', 'private')"
    )
      .bind(privateVideoId, owner.id, "Private processing rally")
      .run();

    const publicResponse = await app.request(
      `/api/videos/${privateVideoId}`,
      {},
      env
    );
    expect(publicResponse.status).toBe(404);

    const studioResponse = await app.request(
      `/api/videos/${privateVideoId}/studio`,
      { headers: { Cookie: owner.cookie } },
      env
    );
    expect(studioResponse.status).toBe(200);
  });

  it("creates an owner-linked private draft before direct Mux upload", async () => {
    const owner = await signUp("Mux Upload Owner");
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
      "/api/upload/mux",
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

    const firstResponse = await app.request("/api/videos?limit=5", {}, env);
    expect(firstResponse.status).toBe(200);
    const firstPage = (await firstResponse.json()) as {
      nextCursor: string | null;
      videos: { id: string }[];
    };

    expect(firstPage.videos).toHaveLength(5);
    expect(firstPage.nextCursor).toBeTruthy();

    const secondResponse = await app.request(
      `/api/videos?limit=5&cursor=${encodeURIComponent(firstPage.nextCursor ?? "")}`,
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
      `/api/videos/${firstPage.videos[0]?.id}`,
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
      "/api/videos?cursor=not-a-cursor",
      {},
      env
    );
    expect(invalidResponse.status).toBe(400);
  });

  it("lets video owners pin one comment to the top", async () => {
    const owner = await signUp("Video Owner");
    const commenter = await signUp("Comment Friend");
    const videoResponse = await jsonRequest("/api/videos", owner.cookie, {
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
    const commentResponse = await jsonRequest(
      `/api/videos/${videoId}/comments`,
      commenter.cookie,
      { content: "Pin this scouting note." }
    );

    expect(commentResponse.status).toBe(201);
    const commentData = (await commentResponse.json()) as {
      comment: { id: string };
    };

    const unauthorizedPin = await jsonRequest(
      `/api/videos/${videoId}/comments/${commentData.comment.id}/pin`,
      commenter.cookie,
      { pinned: true },
      "PATCH"
    );

    expect(unauthorizedPin.status).toBe(404);

    const pinResponse = await jsonRequest(
      `/api/videos/${videoId}/comments/${commentData.comment.id}/pin`,
      owner.cookie,
      { pinned: true },
      "PATCH"
    );

    expect(pinResponse.status).toBe(200);

    const commentsResponse = await app.request(
      `/api/videos/${videoId}/comments`,
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
