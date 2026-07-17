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
      "/api/v1/social/friend-requests",
      alice.cookie,
      {
        message: "Open play later?",
        toUserId: bob.id,
      }
    );

    expect(requestResponse.status).toBe(201);

    const bobNotifications = await app.request(
      "/api/v1/social/notifications",
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
      "/api/v1/social/friend-requests",
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
      `/api/v1/social/friend-requests/${requestId}/respond`,
      bob.cookie,
      { status: "accepted" }
    );

    expect(acceptResponse.status).toBe(200);

    const friendsResponse = await app.request(
      "/api/v1/social/friends",
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
      "/api/v1/social/conversations",
      alice.cookie,
      { participantUserId: bob.id }
    );

    expect(conversationResponse.status).toBe(201);

    const { conversationId } = (await conversationResponse.json()) as {
      conversationId: string;
    };

    const messageResponse = await jsonRequest(
      `/api/v1/social/conversations/${conversationId}/messages`,
      alice.cookie,
      { body: "Meet at court 3?" }
    );

    expect(messageResponse.status).toBe(201);

    const bobNotifications = await app.request(
      "/api/v1/social/notifications",
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

  it("creates group conversations and rejects self conversations", async () => {
    const alice = await signUp("Alice Group");
    const bob = await signUp("Bob Group");
    const cam = await signUp("Cam Group");

    const selfResponse = await jsonRequest(
      "/api/v1/social/conversations",
      alice.cookie,
      { participantUserId: alice.id }
    );

    expect(selfResponse.status).toBe(400);

    const groupResponse = await jsonRequest(
      "/api/v1/social/conversations",
      alice.cookie,
      { participantUserIds: [bob.id, cam.id] }
    );

    expect(groupResponse.status).toBe(201);

    const { conversationId } = (await groupResponse.json()) as {
      conversationId: string;
    };
    const conversationsResponse = await app.request(
      "/api/v1/social/conversations",
      {
        headers: { Cookie: alice.cookie },
      },
      env
    );
    const conversationsData = (await conversationsResponse.json()) as {
      conversations: {
        conversation: { id: string };
        participants: { id: string }[];
      }[];
    };

    expect(conversationsData.conversations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          conversation: expect.objectContaining({ id: conversationId }),
          participants: expect.arrayContaining([
            expect.objectContaining({ id: bob.id }),
            expect.objectContaining({ id: cam.id }),
          ]),
        }),
      ])
    );
  });

  it("shares videos into direct messages", async () => {
    const alice = await signUp("Alice Share");
    const bob = await signUp("Bob Share");
    const videoId = "video-share-api-test";

    const shareResponse = await jsonRequest(
      "/api/v1/social/shares",
      alice.cookie,
      {
        channel: "direct_message",
        entityId: videoId,
        entityType: "video",
        href: `/videos/${videoId}`,
        recipientUserId: bob.id,
      }
    );

    expect(shareResponse.status).toBe(201);

    const conversationsResponse = await app.request(
      "/api/v1/social/conversations",
      {
        headers: { Cookie: bob.cookie },
      },
      env
    );
    const conversationsData = (await conversationsResponse.json()) as {
      conversations: {
        conversation: { id: string };
        lastMessage: { body: string } | null;
      }[];
    };
    const conversation = conversationsData.conversations.find((item) =>
      item.lastMessage?.body.includes(`/videos/${videoId}`)
    );

    expect(conversation).toBeTruthy();

    const messagesResponse = await app.request(
      `/api/v1/social/conversations/${conversation?.conversation.id}/messages`,
      {
        headers: { Cookie: bob.cookie },
      },
      env
    );
    const messagesData = (await messagesResponse.json()) as {
      messages: { message: { body: string } }[];
    };

    expect(messagesData.messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: expect.objectContaining({
            body: expect.stringContaining(`/videos/${videoId}`),
          }),
        }),
      ])
    );
  });

  it("indexes new posts for search", async () => {
    const alice = await signUp("Alice Search");

    const postResponse = await jsonRequest(
      "/api/v1/social/posts",
      alice.cookie,
      {
        content: "Tonight at Crestwood has spicy 4.0 doubles open play.",
      }
    );

    expect(postResponse.status).toBe(201);

    const searchResponse = await app.request(
      "/api/v1/search?q=Crestwood&type=all",
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
