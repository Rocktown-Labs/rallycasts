import { zValidator } from "@hono/zod-validator";
import { createDb } from "@rallycaststv/db";
import { user } from "@rallycaststv/db/schema/auth";
import {
  conversation,
  conversationParticipant,
  friendRequest,
  friendship,
  message,
  notification,
  post,
  postComment,
  postLike,
  share,
} from "@rallycaststv/db/schema/domain";
import { and, desc, eq, inArray, ne, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { z } from "zod";

import type { ChatRealtimeEvent } from "../durable-objects/chat-room";
import { createId } from "../lib/ids";
import { createNotification } from "../lib/notifications";
import type { CreateNotificationInput } from "../lib/notifications";
import {
  scheduleSearchDocumentIndex,
  upsertSearchDocument,
} from "../lib/search-index";
import type { AppEnv } from "../lib/types";
import { requireAuth } from "../middleware/auth";

const postSchema = z.object({
  content: z.string().min(1).max(2000),
});

const commentSchema = z.object({
  content: z.string().min(1).max(1000),
});

const friendRequestSchema = z.object({
  message: z.string().max(500).optional(),
  toUserId: z.string().min(1),
});

const respondToFriendRequestSchema = z.object({
  status: z.enum(["accepted", "declined"]),
});

const startConversationSchema = z
  .object({
    participantUserId: z.string().min(1).optional(),
    participantUserIds: z.array(z.string().min(1)).max(20).optional(),
  })
  .refine(
    (value) =>
      Boolean(value.participantUserId) ||
      Boolean(value.participantUserIds?.length),
    "Choose at least one friend"
  );

const messageSchema = z.object({
  body: z.string().min(1).max(2000),
});

const shareSchema = z.object({
  channel: z
    .enum(["copy_link", "direct_message", "external"])
    .default("copy_link"),
  entityId: z.string().min(1),
  entityType: z.enum(["post", "video", "event", "venue", "profile"]),
  href: z.string().min(1).optional(),
  recipientUserId: z.string().min(1).optional(),
});

const pairConditions = (leftUserId: string, rightUserId: string) =>
  or(
    and(
      eq(friendship.userId, leftUserId),
      eq(friendship.requesterUserId, rightUserId)
    ),
    and(
      eq(friendship.userId, rightUserId),
      eq(friendship.requesterUserId, leftUserId)
    )
  );

type ChatRoomStub = DurableObjectStub & {
  broadcastMessage: (event: ChatRealtimeEvent) => Promise<void>;
};

type UserNotificationsStub = DurableObjectStub & {
  broadcast: (event: {
    notification?: {
      body?: null | string;
      href: string;
      id: string;
      title: string;
      type: string;
    };
    type: "notification";
    unreadCount?: number;
  }) => Promise<void>;
};

const getChatRoom = (env: AppEnv["Bindings"], conversationId: string) =>
  env.CHAT_ROOMS.getByName(conversationId) as ChatRoomStub;

const getUserNotifications = (env: AppEnv["Bindings"], userId: string) =>
  env.USER_NOTIFICATIONS.getByName(userId) as UserNotificationsStub;

const broadcastNotification = async (
  env: AppEnv["Bindings"],
  input: {
    body?: null | string;
    href: string;
    id: string;
    title: string;
    type: string;
    userId: string;
  }
) => {
  try {
    await getUserNotifications(env, input.userId).broadcast({
      notification: {
        body: input.body,
        href: input.href,
        id: input.id,
        title: input.title,
        type: input.type,
      },
      type: "notification",
    });
  } catch {
    // Realtime fanout is best-effort; D1 notifications remain the source of truth.
  }
};

const createLiveNotification = async (
  db: ReturnType<typeof createDb>,
  env: AppEnv["Bindings"],
  input: CreateNotificationInput
) => {
  const record = await createNotification(db, input);
  await broadcastNotification(env, {
    body: record.body,
    href: record.href,
    id: record.id,
    title: record.title,
    type: record.type,
    userId: record.userId,
  });
  return record;
};

export const socialRouter = new Hono<AppEnv>()
  .get("/posts", async (c) => {
    const db = createDb(c.env.DB);
    const rows = await db
      .select({
        author: {
          displayUsername: user.displayUsername,
          id: user.id,
          image: user.image,
          name: user.name,
          username: user.username,
        },
        commentCount: sql<number>`count(distinct ${postComment.id})`,
        likeCount: sql<number>`count(distinct ${postLike.userId})`,
        post,
      })
      .from(post)
      .innerJoin(user, eq(post.userId, user.id))
      .leftJoin(postLike, eq(postLike.postId, post.id))
      .leftJoin(postComment, eq(postComment.postId, post.id))
      .groupBy(post.id)
      .orderBy(desc(post.createdAt))
      .limit(50);

    return c.json({ posts: rows }, HttpStatusCodes.OK);
  })
  .post("/posts", requireAuth, zValidator("json", postSchema), async (c) => {
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    const { content } = c.req.valid("json");
    const record = {
      content,
      id: createId(),
      userId: authUser.id,
    };

    await db.insert(post).values(record);
    const searchRecord = await upsertSearchDocument(db, {
      content,
      entityId: record.id,
      entityType: "post",
      metadata: { authorUserId: authUser.id },
      title: `${authUser.name}'s rally note`,
    });
    scheduleSearchDocumentIndex(() => c.executionCtx, db, c.env, searchRecord);

    return c.json({ post: record }, HttpStatusCodes.CREATED);
  })
  .post("/posts/:id/likes", requireAuth, async (c) => {
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    const postId = c.req.param("id");
    const [record] = await db
      .select()
      .from(post)
      .where(eq(post.id, postId))
      .limit(1);

    if (!record) {
      return c.json({ message: "Post not found" }, HttpStatusCodes.NOT_FOUND);
    }

    await db
      .insert(postLike)
      .values({ postId, userId: authUser.id })
      .onConflictDoNothing();

    if (record.userId !== authUser.id) {
      await createLiveNotification(db, c.env, {
        actorUserId: authUser.id,
        body: `${authUser.name} liked your post.`,
        entityId: postId,
        entityType: "post",
        href: "/",
        title: "New like",
        type: "like",
        userId: record.userId,
      });
    }

    return c.json({ liked: true }, HttpStatusCodes.OK);
  })
  .delete("/posts/:id/likes", requireAuth, async (c) => {
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    const postId = c.req.param("id");

    await db
      .delete(postLike)
      .where(
        and(eq(postLike.postId, postId), eq(postLike.userId, authUser.id))
      );

    return c.json({ liked: false }, HttpStatusCodes.OK);
  })
  .get("/posts/:id/comments", async (c) => {
    const db = createDb(c.env.DB);
    const postId = c.req.param("id");
    const comments = await db
      .select({
        author: {
          displayUsername: user.displayUsername,
          id: user.id,
          image: user.image,
          name: user.name,
          username: user.username,
        },
        comment: postComment,
      })
      .from(postComment)
      .innerJoin(user, eq(postComment.userId, user.id))
      .where(eq(postComment.postId, postId))
      .orderBy(desc(postComment.createdAt));

    return c.json({ comments }, HttpStatusCodes.OK);
  })
  .post(
    "/posts/:id/comments",
    requireAuth,
    zValidator("json", commentSchema),
    async (c) => {
      const db = createDb(c.env.DB);
      const { user: authUser } = c.var.authSession;
      const postId = c.req.param("id");
      const { content } = c.req.valid("json");
      const [record] = await db
        .select()
        .from(post)
        .where(eq(post.id, postId))
        .limit(1);

      if (!record) {
        return c.json({ message: "Post not found" }, HttpStatusCodes.NOT_FOUND);
      }

      const comment = {
        content,
        id: createId(),
        postId,
        userId: authUser.id,
      };

      await db.insert(postComment).values(comment);

      if (record.userId !== authUser.id) {
        await createLiveNotification(db, c.env, {
          actorUserId: authUser.id,
          body: content,
          entityId: comment.id,
          entityType: "comment",
          href: "/",
          title: `${authUser.name} commented on your post`,
          type: "comment",
          userId: record.userId,
        });
      }

      return c.json({ comment }, HttpStatusCodes.CREATED);
    }
  )
  .get("/friends", requireAuth, async (c) => {
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    const friends = await db
      .select({
        displayUsername: user.displayUsername,
        id: user.id,
        image: user.image,
        name: user.name,
        username: user.username,
      })
      .from(friendship)
      .innerJoin(user, eq(friendship.requesterUserId, user.id))
      .where(eq(friendship.userId, authUser.id))
      .orderBy(desc(friendship.createdAt));

    return c.json({ friends }, HttpStatusCodes.OK);
  })
  .post(
    "/friend-requests",
    requireAuth,
    zValidator("json", friendRequestSchema),
    async (c) => {
      const db = createDb(c.env.DB);
      const { user: authUser } = c.var.authSession;
      const { message: requestMessage, toUserId } = c.req.valid("json");

      if (toUserId === authUser.id) {
        return c.json(
          { message: "You cannot friend yourself" },
          HttpStatusCodes.BAD_REQUEST
        );
      }

      const [targetUser] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.id, toUserId))
        .limit(1);

      if (!targetUser) {
        return c.json({ message: "User not found" }, HttpStatusCodes.NOT_FOUND);
      }

      const [existingFriendship] = await db
        .select()
        .from(friendship)
        .where(pairConditions(authUser.id, toUserId))
        .limit(1);

      if (existingFriendship) {
        return c.json(
          { message: "You are already friends" },
          HttpStatusCodes.CONFLICT
        );
      }

      const [existingRequest] = await db
        .select()
        .from(friendRequest)
        .where(
          and(
            eq(friendRequest.fromUserId, authUser.id),
            eq(friendRequest.toUserId, toUserId),
            eq(friendRequest.status, "pending")
          )
        )
        .limit(1);

      if (existingRequest) {
        return c.json({ request: existingRequest }, HttpStatusCodes.OK);
      }

      const request = {
        fromUserId: authUser.id,
        id: createId(),
        message: requestMessage,
        toUserId,
      };

      await db.insert(friendRequest).values(request);
      await createLiveNotification(db, c.env, {
        actorUserId: authUser.id,
        body: requestMessage ?? `${authUser.name} wants to connect.`,
        entityId: request.id,
        entityType: "friend_request",
        href: "/u/messages",
        title: "New friend request",
        type: "friend_request",
        userId: toUserId,
      });

      return c.json({ request }, HttpStatusCodes.CREATED);
    }
  )
  .get("/friend-requests", requireAuth, async (c) => {
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    const requests = await db
      .select({
        fromUser: {
          displayUsername: user.displayUsername,
          id: user.id,
          image: user.image,
          name: user.name,
          username: user.username,
        },
        request: friendRequest,
      })
      .from(friendRequest)
      .innerJoin(user, eq(friendRequest.fromUserId, user.id))
      .where(
        and(
          eq(friendRequest.toUserId, authUser.id),
          eq(friendRequest.status, "pending")
        )
      )
      .orderBy(desc(friendRequest.createdAt));

    return c.json({ requests }, HttpStatusCodes.OK);
  })
  .post(
    "/friend-requests/:id/respond",
    requireAuth,
    zValidator("json", respondToFriendRequestSchema),
    async (c) => {
      const db = createDb(c.env.DB);
      const { user: authUser } = c.var.authSession;
      const id = c.req.param("id");
      const { status } = c.req.valid("json");
      const [request] = await db
        .select()
        .from(friendRequest)
        .where(
          and(
            eq(friendRequest.id, id),
            eq(friendRequest.toUserId, authUser.id),
            eq(friendRequest.status, "pending")
          )
        )
        .limit(1);

      if (!request) {
        return c.json(
          { message: "Friend request not found" },
          HttpStatusCodes.NOT_FOUND
        );
      }

      await db
        .update(friendRequest)
        .set({ respondedAt: new Date(), status, updatedAt: new Date() })
        .where(eq(friendRequest.id, id));

      if (status === "accepted") {
        await db
          .insert(friendship)
          .values([
            { requesterUserId: request.fromUserId, userId: request.toUserId },
            { requesterUserId: request.toUserId, userId: request.fromUserId },
          ])
          .onConflictDoNothing();
        await createLiveNotification(db, c.env, {
          actorUserId: authUser.id,
          body: `${authUser.name} accepted your friend request.`,
          entityId: id,
          entityType: "friendship",
          href: `/players/${authUser.username ?? authUser.id}`,
          title: "Friend request accepted",
          type: "friend_accept",
          userId: request.fromUserId,
        });
      }

      return c.json({ id, status }, HttpStatusCodes.OK);
    }
  )
  .get("/notifications", requireAuth, async (c) => {
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    const rows = await db
      .select({
        actor: {
          displayUsername: user.displayUsername,
          id: user.id,
          image: user.image,
          name: user.name,
          username: user.username,
        },
        notification,
      })
      .from(notification)
      .leftJoin(user, eq(notification.actorUserId, user.id))
      .where(eq(notification.userId, authUser.id))
      .orderBy(desc(notification.createdAt))
      .limit(50);
    const unreadCount = rows.filter((row) => !row.notification.readAt).length;

    return c.json({ notifications: rows, unreadCount }, HttpStatusCodes.OK);
  })
  .post("/notifications/read", requireAuth, async (c) => {
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;

    await db
      .update(notification)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notification.userId, authUser.id),
          sql`${notification.readAt} is null`
        )
      );

    return c.json({ read: true }, HttpStatusCodes.OK);
  })
  .get("/notifications/realtime", requireAuth, (c) => {
    const { user: authUser } = c.var.authSession;
    const stub = c.env.USER_NOTIFICATIONS.getByName(authUser.id);
    const headers = new Headers(c.req.raw.headers);
    headers.set("x-rallycasts-user-id", authUser.id);

    return stub.fetch(new Request(c.req.raw, { headers }));
  })
  .get("/conversations", requireAuth, async (c) => {
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    const mine = await db
      .select({
        conversationId: conversationParticipant.conversationId,
        lastReadAt: conversationParticipant.lastReadAt,
      })
      .from(conversationParticipant)
      .where(eq(conversationParticipant.userId, authUser.id));
    const ids = mine.map((row) => row.conversationId);

    if (ids.length === 0) {
      return c.json({ conversations: [] }, HttpStatusCodes.OK);
    }

    const conversationRows = await db
      .select()
      .from(conversation)
      .where(inArray(conversation.id, ids))
      .orderBy(desc(conversation.updatedAt));
    const participantRows = await db
      .select({
        conversationId: conversationParticipant.conversationId,
        participant: {
          displayUsername: user.displayUsername,
          id: user.id,
          image: user.image,
          name: user.name,
          username: user.username,
        },
      })
      .from(conversationParticipant)
      .innerJoin(user, eq(conversationParticipant.userId, user.id))
      .where(
        and(
          inArray(conversationParticipant.conversationId, ids),
          ne(conversationParticipant.userId, authUser.id)
        )
      );
    const messageRows = await db
      .select()
      .from(message)
      .where(
        and(
          inArray(message.conversationId, ids),
          sql`${message.deletedAt} is null`
        )
      )
      .orderBy(desc(message.createdAt))
      .limit(250);
    const participantsByConversation = new Map<
      string,
      (typeof participantRows)[number]["participant"][]
    >();
    for (const row of participantRows) {
      const participants = participantsByConversation.get(row.conversationId);
      if (participants) {
        participants.push(row.participant);
      } else {
        participantsByConversation.set(row.conversationId, [row.participant]);
      }
    }
    const messagesByConversation = new Map<
      string,
      (typeof messageRows)[number][]
    >();
    for (const row of messageRows) {
      const messages = messagesByConversation.get(row.conversationId);
      if (messages) {
        messages.push(row);
      } else {
        messagesByConversation.set(row.conversationId, [row]);
      }
    }
    const readAtByConversation = new Map(
      mine.map((row) => [row.conversationId, row.lastReadAt])
    );
    const conversations = conversationRows.map((record) => {
      const participants = participantsByConversation.get(record.id) ?? [];
      const messages = messagesByConversation.get(record.id) ?? [];
      const lastReadAt = readAtByConversation.get(record.id);
      const unreadCount = messages.filter(
        (item) =>
          item.senderUserId !== authUser.id &&
          (!lastReadAt || item.createdAt > lastReadAt)
      ).length;

      return {
        conversation: record,
        lastMessage: messages[0] ?? null,
        participant: participants[0] ?? {
          displayUsername: null,
          id: record.id,
          image: null,
          name: "Group chat",
          username: null,
        },
        participants,
        unreadCount,
      };
    });

    return c.json({ conversations }, HttpStatusCodes.OK);
  })
  .post(
    "/conversations",
    requireAuth,
    zValidator("json", startConversationSchema),
    async (c) => {
      const db = createDb(c.env.DB);
      const { user: authUser } = c.var.authSession;
      const data = c.req.valid("json");
      const requestedParticipantIds = [
        ...(data.participantUserId ? [data.participantUserId] : []),
        ...(data.participantUserIds ?? []),
      ];
      const participantUserIds = [...new Set(requestedParticipantIds)];

      if (participantUserIds.includes(authUser.id)) {
        return c.json(
          { message: "Choose another player" },
          HttpStatusCodes.BAD_REQUEST
        );
      }

      const participants = await db
        .select({
          id: user.id,
        })
        .from(user)
        .where(inArray(user.id, participantUserIds));

      if (participants.length !== participantUserIds.length) {
        return c.json(
          { message: "One or more users were not found" },
          HttpStatusCodes.NOT_FOUND
        );
      }

      const mine = await db
        .select({ conversationId: conversationParticipant.conversationId })
        .from(conversationParticipant)
        .where(eq(conversationParticipant.userId, authUser.id));
      const ids = mine.map((row) => row.conversationId);

      const [directParticipantUserId] = participantUserIds;

      if (ids.length > 0 && directParticipantUserId) {
        const [existing] = await db
          .select({ conversationId: conversationParticipant.conversationId })
          .from(conversationParticipant)
          .innerJoin(
            conversation,
            eq(conversationParticipant.conversationId, conversation.id)
          )
          .where(
            and(
              inArray(conversationParticipant.conversationId, ids),
              eq(conversationParticipant.userId, directParticipantUserId),
              eq(conversation.type, "direct")
            )
          )
          .limit(1);

        if (existing) {
          return c.json(
            { conversationId: existing.conversationId },
            HttpStatusCodes.OK
          );
        }
      }

      const conversationId = createId();
      await db
        .insert(conversation)
        .values({ id: conversationId, type: "direct" });
      await db.insert(conversationParticipant).values(
        [authUser.id, ...participantUserIds].map((userId) => ({
          conversationId,
          userId,
        }))
      );

      return c.json({ conversationId }, HttpStatusCodes.CREATED);
    }
  )
  .get("/conversations/:id/realtime", requireAuth, async (c) => {
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    const conversationId = c.req.param("id");
    const [participant] = await db
      .select()
      .from(conversationParticipant)
      .where(
        and(
          eq(conversationParticipant.conversationId, conversationId),
          eq(conversationParticipant.userId, authUser.id)
        )
      )
      .limit(1);

    if (!participant) {
      return c.json(
        { message: "Conversation not found" },
        HttpStatusCodes.NOT_FOUND
      );
    }

    const headers = new Headers(c.req.raw.headers);
    headers.set("x-rallycasts-user-id", authUser.id);
    headers.set("x-rallycasts-user-name", authUser.name);
    const stub = c.env.CHAT_ROOMS.getByName(conversationId);

    return stub.fetch(new Request(c.req.raw, { headers }));
  })
  .get("/conversations/:id/messages", requireAuth, async (c) => {
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    const conversationId = c.req.param("id");
    const [participant] = await db
      .select()
      .from(conversationParticipant)
      .where(
        and(
          eq(conversationParticipant.conversationId, conversationId),
          eq(conversationParticipant.userId, authUser.id)
        )
      )
      .limit(1);

    if (!participant) {
      return c.json(
        { message: "Conversation not found" },
        HttpStatusCodes.NOT_FOUND
      );
    }

    await db
      .update(conversationParticipant)
      .set({ lastReadAt: new Date() })
      .where(
        and(
          eq(conversationParticipant.conversationId, conversationId),
          eq(conversationParticipant.userId, authUser.id)
        )
      );

    const messages = await db
      .select({
        message,
        sender: {
          displayUsername: user.displayUsername,
          id: user.id,
          image: user.image,
          name: user.name,
          username: user.username,
        },
      })
      .from(message)
      .innerJoin(user, eq(message.senderUserId, user.id))
      .where(
        and(
          eq(message.conversationId, conversationId),
          sql`${message.deletedAt} is null`
        )
      )
      .orderBy(desc(message.createdAt))
      .limit(100);

    return c.json({ messages: messages.toReversed() }, HttpStatusCodes.OK);
  })
  .post(
    "/conversations/:id/messages",
    requireAuth,
    zValidator("json", messageSchema),
    async (c) => {
      const db = createDb(c.env.DB);
      const { user: authUser } = c.var.authSession;
      const conversationId = c.req.param("id");
      const { body } = c.req.valid("json");
      const participants = await db
        .select()
        .from(conversationParticipant)
        .where(eq(conversationParticipant.conversationId, conversationId));
      const canSend = participants.some((row) => row.userId === authUser.id);

      if (!canSend) {
        return c.json(
          { message: "Conversation not found" },
          HttpStatusCodes.NOT_FOUND
        );
      }

      const record = {
        body,
        conversationId,
        id: createId(),
        senderUserId: authUser.id,
      };

      await db.insert(message).values(record);
      await db
        .update(conversation)
        .set({ updatedAt: new Date() })
        .where(eq(conversation.id, conversationId));
      const sender = {
        id: authUser.id,
        image: authUser.image,
        name: authUser.name,
        username: authUser.username,
      };

      for (const participant of participants) {
        if (participant.userId === authUser.id) {
          continue;
        }

        await createLiveNotification(db, c.env, {
          actorUserId: authUser.id,
          body,
          entityId: record.id,
          entityType: "message",
          href: "/u/messages",
          title: `New message from ${authUser.name}`,
          type: "message",
          userId: participant.userId,
        });
      }

      await getChatRoom(c.env, conversationId).broadcastMessage({
        conversationId,
        message: {
          body: record.body,
          createdAt: new Date().toISOString(),
          id: record.id,
          senderUserId: record.senderUserId,
        },
        sender,
        type: "message",
      });

      return c.json({ message: record }, HttpStatusCodes.CREATED);
    }
  )
  .post("/shares", requireAuth, zValidator("json", shareSchema), async (c) => {
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    const data = c.req.valid("json");
    const record = {
      id: createId(),
      userId: authUser.id,
      ...data,
    };

    await db.insert(share).values(record);

    if (data.recipientUserId) {
      let conversationId: string | undefined;
      const shareHref = data.href ?? "/";
      if (data.channel === "direct_message") {
        const mine = await db
          .select({ conversationId: conversationParticipant.conversationId })
          .from(conversationParticipant)
          .where(eq(conversationParticipant.userId, authUser.id));
        const ids = mine.map((row) => row.conversationId);
        const [existing] =
          ids.length > 0
            ? await db
                .select({
                  conversationId: conversationParticipant.conversationId,
                })
                .from(conversationParticipant)
                .innerJoin(
                  conversation,
                  eq(conversationParticipant.conversationId, conversation.id)
                )
                .where(
                  and(
                    inArray(conversationParticipant.conversationId, ids),
                    eq(conversationParticipant.userId, data.recipientUserId),
                    eq(conversation.type, "direct")
                  )
                )
                .limit(1)
            : [];
        conversationId = existing?.conversationId ?? createId();
        if (!existing) {
          await db
            .insert(conversation)
            .values({ id: conversationId, type: "direct" });
          await db.insert(conversationParticipant).values([
            { conversationId, userId: authUser.id },
            { conversationId, userId: data.recipientUserId },
          ]);
        }
        const messageBody = `${authUser.name} shared a ${data.entityType}: ${shareHref}`;
        const chatMessage = {
          body: messageBody,
          conversationId,
          id: createId(),
          senderUserId: authUser.id,
        };
        await db.insert(message).values(chatMessage);
        await db
          .update(conversation)
          .set({ updatedAt: new Date() })
          .where(eq(conversation.id, conversationId));
        await getChatRoom(c.env, conversationId).broadcastMessage({
          conversationId,
          message: {
            body: chatMessage.body,
            createdAt: new Date().toISOString(),
            id: chatMessage.id,
            senderUserId: chatMessage.senderUserId,
          },
          sender: {
            id: authUser.id,
            image: authUser.image,
            name: authUser.name,
            username: authUser.username,
          },
          type: "message",
        });
      }
      await createLiveNotification(db, c.env, {
        actorUserId: authUser.id,
        body: `${authUser.name} shared something with you.`,
        entityId: record.id,
        entityType: "share",
        href: conversationId ? "/u/messages" : shareHref,
        title: "Shared with you",
        type: "share",
        userId: data.recipientUserId,
      });
    }

    return c.json({ share: record }, HttpStatusCodes.CREATED);
  });
