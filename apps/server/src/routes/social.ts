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

import { createId } from "../lib/ids";
import { createNotification } from "../lib/notifications";
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

const startConversationSchema = z.object({
  participantUserId: z.string().min(1),
});

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
    scheduleSearchDocumentIndex(() => c.executionCtx, c.env, searchRecord);

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
      await createNotification(db, {
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
        await createNotification(db, {
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
      await createNotification(db, {
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
        await createNotification(db, {
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
  .get("/conversations", requireAuth, async (c) => {
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    const mine = await db
      .select({ conversationId: conversationParticipant.conversationId })
      .from(conversationParticipant)
      .where(eq(conversationParticipant.userId, authUser.id));
    const ids = mine.map((row) => row.conversationId);

    if (ids.length === 0) {
      return c.json({ conversations: [] }, HttpStatusCodes.OK);
    }

    const conversations = await db
      .select({
        conversation,
        participant: {
          displayUsername: user.displayUsername,
          id: user.id,
          image: user.image,
          name: user.name,
          username: user.username,
        },
      })
      .from(conversationParticipant)
      .innerJoin(
        conversation,
        eq(conversationParticipant.conversationId, conversation.id)
      )
      .innerJoin(user, eq(conversationParticipant.userId, user.id))
      .where(
        and(
          inArray(conversationParticipant.conversationId, ids),
          ne(conversationParticipant.userId, authUser.id)
        )
      )
      .orderBy(desc(conversation.updatedAt));

    return c.json({ conversations }, HttpStatusCodes.OK);
  })
  .post(
    "/conversations",
    requireAuth,
    zValidator("json", startConversationSchema),
    async (c) => {
      const db = createDb(c.env.DB);
      const { user: authUser } = c.var.authSession;
      const { participantUserId } = c.req.valid("json");

      if (participantUserId === authUser.id) {
        return c.json(
          { message: "Choose another player" },
          HttpStatusCodes.BAD_REQUEST
        );
      }

      const [participant] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.id, participantUserId))
        .limit(1);

      if (!participant) {
        return c.json({ message: "User not found" }, HttpStatusCodes.NOT_FOUND);
      }

      const mine = await db
        .select({ conversationId: conversationParticipant.conversationId })
        .from(conversationParticipant)
        .where(eq(conversationParticipant.userId, authUser.id));
      const ids = mine.map((row) => row.conversationId);

      if (ids.length > 0) {
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
              eq(conversationParticipant.userId, participantUserId),
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
      await db.insert(conversationParticipant).values([
        { conversationId, userId: authUser.id },
        { conversationId, userId: participantUserId },
      ]);

      return c.json({ conversationId }, HttpStatusCodes.CREATED);
    }
  )
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

      for (const participant of participants) {
        if (participant.userId === authUser.id) {
          continue;
        }

        await createNotification(db, {
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
      await createNotification(db, {
        actorUserId: authUser.id,
        body: `${authUser.name} shared something with you.`,
        entityId: record.id,
        entityType: "share",
        href: data.href ?? "/",
        title: "Shared with you",
        type: "share",
        userId: data.recipientUserId,
      });
    }

    return c.json({ share: record }, HttpStatusCodes.CREATED);
  });
