import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

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
