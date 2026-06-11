import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

import app from "../index";

const signUp = async (name: string) => {
  const username = name.toLowerCase().replaceAll(" ", "");
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

describe("social API", () => {
  it("creates friend request notifications and accepts friendships", async () => {
    const alice = await signUp("Alice Rally");
    const bob = await signUp("Bob Kitchen");

    const requestResponse = await jsonRequest(
      "/api/social/friend-requests",
      alice.cookie,
      {
        message: "Open play later?",
        toUserId: bob.id,
      }
    );

    expect(requestResponse.status).toBe(201);

    const bobNotifications = await app.request(
      "/api/social/notifications",
      {
        headers: { Cookie: bob.cookie },
      },
      env
    );
    const notificationData = (await bobNotifications.json()) as {
      unreadCount: number;
    };

    expect(notificationData.unreadCount).toBe(1);

    const requestsResponse = await app.request(
      "/api/social/friend-requests",
      {
        headers: { Cookie: bob.cookie },
      },
      env
    );
    const requestData = (await requestsResponse.json()) as {
      requests: { request: { id: string } }[];
    };

    expect(requestData.requests).toHaveLength(1);
    const requestId = requestData.requests[0]?.request.id;
    expect(requestId).toBeTruthy();

    const acceptResponse = await jsonRequest(
      `/api/social/friend-requests/${requestId}/respond`,
      bob.cookie,
      { status: "accepted" }
    );

    expect(acceptResponse.status).toBe(200);

    const friendsResponse = await app.request(
      "/api/social/friends",
      {
        headers: { Cookie: alice.cookie },
      },
      env
    );
    const friendsData = (await friendsResponse.json()) as {
      friends: { id: string }[];
    };

    expect(friendsData.friends).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: bob.id })])
    );
  });

  it("creates conversations, messages, and message notifications", async () => {
    const alice = await signUp("Alice Dink");
    const bob = await signUp("Bob Drive");

    const conversationResponse = await jsonRequest(
      "/api/social/conversations",
      alice.cookie,
      { participantUserId: bob.id }
    );

    expect(conversationResponse.status).toBe(201);

    const { conversationId } = (await conversationResponse.json()) as {
      conversationId: string;
    };

    const messageResponse = await jsonRequest(
      `/api/social/conversations/${conversationId}/messages`,
      alice.cookie,
      { body: "Meet at court 3?" }
    );

    expect(messageResponse.status).toBe(201);

    const bobNotifications = await app.request(
      "/api/social/notifications",
      {
        headers: { Cookie: bob.cookie },
      },
      env
    );
    const notificationData = (await bobNotifications.json()) as {
      notifications: { notification: { type: string } }[];
    };

    expect(notificationData.notifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          notification: expect.objectContaining({ type: "message" }),
        }),
      ])
    );
  });

  it("indexes new posts for search", async () => {
    const alice = await signUp("Alice Search");

    const postResponse = await jsonRequest("/api/social/posts", alice.cookie, {
      content: "Tonight at Crestwood has spicy 4.0 doubles open play.",
    });

    expect(postResponse.status).toBe(201);

    const searchResponse = await app.request(
      "/api/search?q=Crestwood&type=all",
      {},
      env
    );
    const searchData = (await searchResponse.json()) as {
      documents: { entityType: string; title: string }[];
      posts: { post: { content: string } }[];
    };

    expect(searchData.documents).toEqual(
      expect.arrayContaining([expect.objectContaining({ entityType: "post" })])
    );
    expect(searchData.posts[0]?.post.content).toContain("Crestwood");
  });
});
