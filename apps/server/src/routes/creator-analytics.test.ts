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
  const cookie = response.headers.get("set-cookie") ?? "";
  const body = (await response.json()) as { user: { id: string } };
  return { cookie, id: body.user.id, username };
};

describe("creator analytics", () => {
  it("counts real views, watch progress, and follows", async () => {
    const owner = await signUp("Analytics Owner");
    const viewer = await signUp("Analytics Viewer");
    const videoId = `analytics-video-${crypto.randomUUID()}`;
    await env.DB.prepare(
      "insert into video (id, owner_user_id, title, status, visibility, media_type) values (?, ?, 'Real views only', 'ready', 'public', 'video')"
    )
      .bind(videoId, owner.id)
      .run();

    const initialSocial = await app.request(
      `/api/v1/videos/${videoId}/social`,
      {},
      env
    );
    expect(initialSocial.status).toBe(200);
    expect(((await initialSocial.json()) as { views: number }).views).toBe(0);

    const viewResponse = await app.request(
      `/api/v1/videos/${videoId}/views`,
      { method: "POST" },
      env
    );
    expect(viewResponse.status).toBe(200);
    const viewBody = (await viewResponse.json()) as {
      viewId: string;
      views: number;
    };
    expect(viewBody.views).toBe(1);

    const progressResponse = await app.request(
      `/api/v1/videos/${videoId}/views/${viewBody.viewId}`,
      {
        body: JSON.stringify({ completed: true, watchedSeconds: 12 }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      },
      env
    );
    expect(progressResponse.status).toBe(200);

    const followResponse = await app.request(
      `/api/v1/social/follows/${owner.id}`,
      { headers: { Cookie: viewer.cookie }, method: "POST" },
      env
    );
    expect(followResponse.status).toBe(200);

    const analyticsResponse = await app.request(
      "/api/v1/creator/analytics",
      { headers: { Cookie: owner.cookie } },
      env
    );
    expect(analyticsResponse.status).toBe(200);
    const analytics = (await analyticsResponse.json()) as {
      followers: number;
      topVideos: { id: string; viewCount: number }[];
      totals: {
        completedViews: number;
        totalViews: number;
        watchTimeSeconds: number;
      };
      viewsByDay: { date: string; views: number }[];
    };
    expect(analytics.totals.totalViews).toBe(1);
    expect(analytics.totals.watchTimeSeconds).toBe(12);
    expect(analytics.totals.completedViews).toBe(1);
    expect(analytics.followers).toBe(1);
    expect(analytics.topVideos[0]?.id).toBe(videoId);
    expect(analytics.topVideos[0]?.viewCount).toBe(1);
    expect(analytics.viewsByDay).toHaveLength(1);
    expect(analytics.viewsByDay[0]?.views).toBe(1);
  });

  it("stores profile likes as real rows", async () => {
    const owner = await signUp("Profile Like Owner");
    const viewer = await signUp("Profile Like Viewer");
    await env.DB.prepare(
      "insert into user_profile (user_id, onboarding_status) values (?, 'complete')"
    )
      .bind(owner.id)
      .run();

    const likeResponse = await app.request(
      `/api/v1/players/${owner.username}/like`,
      { headers: { Cookie: viewer.cookie }, method: "POST" },
      env
    );
    expect(likeResponse.status).toBe(200);

    const profileResponse = await app.request(
      `/api/v1/players/${owner.username}`,
      { headers: { Cookie: viewer.cookie } },
      env
    );
    expect(profileResponse.status).toBe(200);
    const profile = (await profileResponse.json()) as {
      stats: { isLiked: boolean; likesCount: number };
    };
    expect(profile.stats.likesCount).toBe(1);
    expect(profile.stats.isLiked).toBe(true);

    const unlikeResponse = await app.request(
      `/api/v1/players/${owner.username}/like`,
      { headers: { Cookie: viewer.cookie }, method: "DELETE" },
      env
    );
    expect(unlikeResponse.status).toBe(200);
    const unlikeBody = (await unlikeResponse.json()) as { likesCount: number };
    expect(unlikeBody.likesCount).toBe(0);
  });
});
