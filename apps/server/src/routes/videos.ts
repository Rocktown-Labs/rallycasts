import { zValidator } from "@hono/zod-validator";
import { createDb } from "@rallycaststv/db";
import { user } from "@rallycaststv/db/schema/auth";
import { video, videoComment } from "@rallycaststv/db/schema/domain";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { z } from "zod";

import { createId } from "../lib/ids";
import type { AppEnv } from "../lib/types";
import { requireAuth } from "../middleware/auth";

const createVideoSchema = z.object({
  description: z.string().max(2000).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  mediaType: z.enum(["video", "short", "photo"]).default("video"),
  title: z.string().min(1).max(160),
  venueId: z.string().min(1).optional(),
  visibility: z.enum(["public", "friends", "private"]).default("public"),
});

const updateVideoSchema = createVideoSchema.partial().extend({
  durationSeconds: z.number().int().min(0).optional(),
  muxAssetId: z.string().optional(),
  muxPlaybackId: z.string().optional(),
  muxStatus: z.string().optional(),
  muxUploadId: z.string().optional(),
  r2Key: z.string().optional(),
  status: z
    .enum(["draft", "uploading", "processing", "ready", "failed", "deleted"])
    .optional(),
  thumbnailUrl: z.url().optional(),
});

export const videosRouter = new Hono<AppEnv>()
  .get("/", async (c) => {
    const db = createDb(c.env.DB);
    const videos = await db
      .select()
      .from(video)
      .where(and(eq(video.status, "ready"), eq(video.visibility, "public")))
      .orderBy(desc(video.publishedAt))
      .limit(50);

    return c.json({ videos }, HttpStatusCodes.OK);
  })
  .get("/me", requireAuth, async (c) => {
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    const videos = await db
      .select()
      .from(video)
      .where(eq(video.ownerUserId, authUser.id))
      .orderBy(desc(video.updatedAt))
      .limit(100);

    return c.json({ videos }, HttpStatusCodes.OK);
  })
  .post("/", requireAuth, zValidator("json", createVideoSchema), async (c) => {
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    const data = c.req.valid("json");
    const draft = {
      id: createId(),
      ownerUserId: authUser.id,
      ...data,
    };

    await db.insert(video).values(draft);

    return c.json({ video: draft }, HttpStatusCodes.CREATED);
  })
  .get("/:id", async (c) => {
    const db = createDb(c.env.DB);
    const id = c.req.param("id");

    const [record] = await db
      .select({
        owner: {
          displayUsername: user.displayUsername,
          id: user.id,
          image: user.image,
          name: user.name,
          username: user.username,
        },
        video,
      })
      .from(video)
      .innerJoin(user, eq(video.ownerUserId, user.id))
      .where(eq(video.id, id))
      .limit(1);

    if (!record || record.video.status === "deleted") {
      return c.json({ message: "Video not found" }, HttpStatusCodes.NOT_FOUND);
    }

    return c.json(
      { owner: record.owner, video: record.video },
      HttpStatusCodes.OK
    );
  })
  .patch(
    "/:id",
    requireAuth,
    zValidator("json", updateVideoSchema),
    async (c) => {
      const db = createDb(c.env.DB);
      const { user: authUser } = c.var.authSession;
      const id = c.req.param("id");
      const data = c.req.valid("json");
      const publishedAt = data.status === "ready" ? new Date() : undefined;

      await db
        .update(video)
        .set({
          ...data,
          publishedAt,
          updatedAt: new Date(),
        })
        .where(and(eq(video.id, id), eq(video.ownerUserId, authUser.id)));

      return c.json({ id, ...data }, HttpStatusCodes.OK);
    }
  )
  .get("/:id/comments", async (c) => {
    const db = createDb(c.env.DB);
    const id = c.req.param("id");

    const comments = await db
      .select({
        content: videoComment.content,
        createdAt: videoComment.createdAt,
        id: videoComment.id,
        updatedAt: videoComment.updatedAt,
        user: {
          displayUsername: user.displayUsername,
          id: user.id,
          image: user.image,
          name: user.name,
          username: user.username,
        },
      })
      .from(videoComment)
      .innerJoin(user, eq(videoComment.userId, user.id))
      .where(eq(videoComment.videoId, id))
      .orderBy(desc(videoComment.createdAt));

    return c.json({ comments }, HttpStatusCodes.OK);
  })
  .post(
    "/:id/comments",
    requireAuth,
    zValidator("json", z.object({ content: z.string().min(1).max(1000) })),
    async (c) => {
      const db = createDb(c.env.DB);
      const { user: authUser } = c.var.authSession;
      const id = c.req.param("id");
      const { content } = c.req.valid("json");

      // Verify video exists first
      const [record] = await db
        .select()
        .from(video)
        .where(eq(video.id, id))
        .limit(1);

      if (!record || record.status === "deleted") {
        return c.json(
          { message: "Video not found" },
          HttpStatusCodes.NOT_FOUND
        );
      }

      const commentId = createId();
      const newComment = {
        content,
        createdAt: new Date(),
        id: commentId,
        updatedAt: new Date(),
        userId: authUser.id,
        videoId: id,
      };

      await db.insert(videoComment).values(newComment);

      return c.json(
        {
          comment: {
            ...newComment,
            user: {
              displayUsername: authUser.displayUsername,
              id: authUser.id,
              image: authUser.image,
              name: authUser.name,
              username: authUser.username,
            },
          },
        },
        HttpStatusCodes.CREATED
      );
    }
  );
