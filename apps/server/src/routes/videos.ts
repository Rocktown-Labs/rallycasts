import { zValidator } from "@hono/zod-validator";
import { createDb } from "@rallycaststv/db";
import { user } from "@rallycaststv/db/schema/auth";
import {
  venue,
  video,
  videoComment,
  videoLike,
} from "@rallycaststv/db/schema/domain";
import { and, desc, eq, inArray, lt, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { z } from "zod";

import { createId } from "../lib/ids";
import { createMuxClip } from "../lib/mux-client";
import { createNotification } from "../lib/notifications";
import {
  scheduleSearchDocumentIndex,
  upsertSearchDocument,
} from "../lib/search-index";
import type { AppEnv } from "../lib/types";
import { requireAuth } from "../middleware/auth";

const createVideoSchema = z.object({
  description: z.string().max(2000).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  mediaType: z.enum(["video", "short", "photo"]).default("video"),
  muxUploadId: z.string().optional(),
  status: z
    .enum(["draft", "uploading", "processing", "ready", "failed", "deleted"])
    .default("draft"),
  taggedUserIds: z.array(z.string()).optional(),
  title: z.string().min(1).max(160),
  venueId: z.string().min(1).nullable().optional(),
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

const pinCommentSchema = z.object({
  pinned: z.boolean(),
});

const uploadStateSchema = z.object({
  state: z.enum(["failed", "processing"]),
});

const createClipSchema = z
  .object({
    endTime: z.number().positive(),
    startTime: z.number().min(0),
    title: z.string().trim().min(1).max(160),
  })
  .refine(({ endTime, startTime }) => endTime > startTime, {
    message: "Clip end time must be after its start time",
  })
  .refine(({ endTime, startTime }) => endTime - startTime <= 120, {
    message: "Clips can be up to 2 minutes long",
  });

const DEFAULT_VIDEO_PAGE_SIZE = 12;
const MAX_VIDEO_PAGE_SIZE = 50;

interface VideoCursor {
  id: string;
  timestamp: number;
}

const videoSortTimestamp = sql<number>`coalesce(${video.publishedAt}, ${video.createdAt})`;

const encodeVideoCursor = (record: typeof video.$inferSelect): string =>
  btoa(
    JSON.stringify({
      id: record.id,
      timestamp: (record.publishedAt ?? record.createdAt).getTime(),
    } satisfies VideoCursor)
  );

const decodeVideoCursor = (cursor: string): VideoCursor | null => {
  try {
    const value = JSON.parse(atob(cursor)) as Partial<VideoCursor>;
    if (
      typeof value.id !== "string" ||
      typeof value.timestamp !== "number" ||
      !Number.isFinite(value.timestamp)
    ) {
      return null;
    }
    return { id: value.id, timestamp: value.timestamp };
  } catch {
    return null;
  }
};

async function resolveVideosRelations(
  db: ReturnType<typeof createDb>,
  videosList: (typeof video.$inferSelect)[]
) {
  if (videosList.length === 0) {
    return [];
  }

  // 1. Gather all venue IDs
  const venueIds = [
    ...new Set(videosList.map((v) => v.venueId).filter(Boolean)),
  ] as string[];
  const venues =
    venueIds.length > 0
      ? await db.select().from(venue).where(inArray(venue.id, venueIds))
      : [];

  // 2. Gather all owner user IDs
  const ownerIds = [
    ...new Set(videosList.map((v) => v.ownerUserId).filter(Boolean)),
  ];

  // 3. Gather all tagged user IDs
  const taggedIds: string[] = [];
  for (const v of videosList) {
    if (v.taggedUserIds) {
      try {
        const parsed = JSON.parse(v.taggedUserIds);
        if (Array.isArray(parsed)) {
          taggedIds.push(...parsed);
        }
      } catch {
        // ignore JSON parsing errors
      }
    }
  }

  // 4. Combine all user IDs to fetch in a single query
  const allUserIds = [...new Set([...ownerIds, ...taggedIds])];
  const users =
    allUserIds.length > 0
      ? await db
          .select({
            displayUsername: user.displayUsername,
            id: user.id,
            image: user.image,
            name: user.name,
            username: user.username,
          })
          .from(user)
          .where(inArray(user.id, allUserIds))
      : [];

  const venueMap = new Map(venues.map((v) => [v.id, v]));
  const userMap = new Map(users.map((u) => [u.id, u]));

  return videosList.map((v) => {
    let parsedTaggedUserIds: string[] = [];
    if (v.taggedUserIds) {
      try {
        const parsed = JSON.parse(v.taggedUserIds);
        if (Array.isArray(parsed)) {
          parsedTaggedUserIds = parsed;
        }
      } catch {
        // ignore JSON parsing errors
      }
    }

    const resolvedOwner = userMap.get(v.ownerUserId) || null;
    const resolvedVenue = v.venueId ? venueMap.get(v.venueId) || null : null;
    const resolvedTaggedUsers = parsedTaggedUserIds
      .map((id) => userMap.get(id))
      .filter(Boolean);

    return {
      ...v,
      owner: resolvedOwner,
      taggedUserIds: parsedTaggedUserIds,
      taggedUsers: resolvedTaggedUsers,
      venue: resolvedVenue,
    };
  });
}

export const videosRouter = new Hono<AppEnv>()
  .get("/", async (c) => {
    const db = createDb(c.env.DB);
    const requestedLimit = Number.parseInt(c.req.query("limit") ?? "", 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), MAX_VIDEO_PAGE_SIZE)
      : DEFAULT_VIDEO_PAGE_SIZE;
    const cursorParam = c.req.query("cursor");
    const cursor = cursorParam ? decodeVideoCursor(cursorParam) : null;

    if (cursorParam && !cursor) {
      return c.json(
        { message: "Invalid video cursor" },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    const visibilityFilter = and(
      eq(video.status, "ready"),
      eq(video.visibility, "public")
    );
    const pageFilter = cursor
      ? and(
          visibilityFilter,
          or(
            lt(videoSortTimestamp, cursor.timestamp),
            and(
              eq(videoSortTimestamp, cursor.timestamp),
              lt(video.id, cursor.id)
            )
          )
        )
      : visibilityFilter;
    const videos = await db
      .select()
      .from(video)
      .where(pageFilter)
      .orderBy(desc(videoSortTimestamp), desc(video.id))
      .limit(limit + 1);

    const hasNextPage = videos.length > limit;
    const page = videos.slice(0, limit);
    const resolved = await resolveVideosRelations(db, page);
    const lastVideo = page.at(-1);

    return c.json(
      {
        nextCursor:
          hasNextPage && lastVideo ? encodeVideoCursor(lastVideo) : null,
        videos: resolved,
      },
      HttpStatusCodes.OK
    );
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

    const resolved = await resolveVideosRelations(db, videos);
    return c.json({ videos: resolved }, HttpStatusCodes.OK);
  })
  .post("/", requireAuth, zValidator("json", createVideoSchema), async (c) => {
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    const data = c.req.valid("json");
    const { taggedUserIds, ...rest } = data;

    const draft = {
      id: createId(),
      ownerUserId: authUser.id,
      ...rest,
      taggedUserIds: taggedUserIds ? JSON.stringify(taggedUserIds) : null,
    };

    await db.insert(video).values(draft);
    const searchRecord = await upsertSearchDocument(db, {
      content: [data.title, data.description].filter(Boolean).join("\n"),
      entityId: draft.id,
      entityType: "video",
      metadata: {
        mediaType: data.mediaType,
        ownerUserId: authUser.id,
        venueId: data.venueId,
      },
      title: data.title,
    });
    scheduleSearchDocumentIndex(() => c.executionCtx, c.env, searchRecord);

    const returnedVideo = {
      ...draft,
      taggedUserIds: taggedUserIds || [],
    };

    return c.json({ video: returnedVideo }, HttpStatusCodes.CREATED);
  })
  .post(
    "/:id/upload-state",
    requireAuth,
    zValidator("json", uploadStateSchema),
    async (c) => {
      const db = createDb(c.env.DB);
      const { user: authUser } = c.var.authSession;
      const id = c.req.param("id");
      const { state } = c.req.valid("json");

      await db
        .update(video)
        .set({
          muxStatus: state === "failed" ? "upload_failed" : "uploaded",
          status: state,
          updatedAt: new Date(),
        })
        .where(and(eq(video.id, id), eq(video.ownerUserId, authUser.id)));

      const [updated] = await db
        .select()
        .from(video)
        .where(and(eq(video.id, id), eq(video.ownerUserId, authUser.id)))
        .limit(1);

      if (!updated) {
        return c.json(
          { message: "Video not found" },
          HttpStatusCodes.NOT_FOUND
        );
      }

      return c.json({ video: updated }, HttpStatusCodes.OK);
    }
  )
  .get("/:id/studio", requireAuth, async (c) => {
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    const id = c.req.param("id");
    const [record] = await db
      .select()
      .from(video)
      .where(and(eq(video.id, id), eq(video.ownerUserId, authUser.id)))
      .limit(1);

    if (!record || record.status === "deleted") {
      return c.json({ message: "Video not found" }, HttpStatusCodes.NOT_FOUND);
    }

    const [resolved] = await resolveVideosRelations(db, [record]);
    return c.json({ video: resolved ?? record }, HttpStatusCodes.OK);
  })
  .post(
    "/:id/clips",
    requireAuth,
    zValidator("json", createClipSchema),
    async (c) => {
      const db = createDb(c.env.DB);
      const { user: authUser } = c.var.authSession;
      const id = c.req.param("id");
      const data = c.req.valid("json");
      const [sourceVideo] = await db
        .select()
        .from(video)
        .where(and(eq(video.id, id), eq(video.ownerUserId, authUser.id)))
        .limit(1);

      if (
        !sourceVideo?.muxAssetId ||
        sourceVideo.status !== "ready" ||
        (sourceVideo.durationSeconds !== null &&
          data.endTime > sourceVideo.durationSeconds)
      ) {
        return c.json(
          { message: "The source video is not ready for that clip range" },
          HttpStatusCodes.BAD_REQUEST
        );
      }

      if (!c.env.MUX_TOKEN_ID || !c.env.MUX_TOKEN_SECRET) {
        return c.json(
          { message: "Mux not configured" },
          HttpStatusCodes.INTERNAL_SERVER_ERROR
        );
      }

      const clipId = createId();
      const muxClip = await createMuxClip(
        sourceVideo.muxAssetId,
        data.startTime,
        data.endTime,
        c.env.MUX_TOKEN_ID,
        c.env.MUX_TOKEN_SECRET,
        clipId
      );
      const clip = {
        description: `Clip from ${sourceVideo.title}`,
        durationSeconds: Math.round(data.endTime - data.startTime),
        id: clipId,
        mediaType: "short" as const,
        muxAssetId: muxClip.assetId,
        muxPlaybackId: muxClip.playbackId,
        muxStatus: muxClip.status,
        ownerUserId: authUser.id,
        status: "processing" as const,
        title: data.title,
        visibility: "private" as const,
      };

      await db.insert(video).values(clip);
      return c.json({ video: clip }, HttpStatusCodes.CREATED);
    }
  )
  .get("/:id", async (c) => {
    const db = createDb(c.env.DB);
    const id = c.req.param("id");

    const [videoRecord] = await db
      .select()
      .from(video)
      .where(
        and(
          eq(video.id, id),
          eq(video.status, "ready"),
          eq(video.visibility, "public")
        )
      )
      .limit(1);

    if (!videoRecord) {
      return c.json({ message: "Video not found" }, HttpStatusCodes.NOT_FOUND);
    }

    const relatedRecords = await db
      .select()
      .from(video)
      .where(
        and(
          eq(video.status, "ready"),
          eq(video.visibility, "public"),
          sql`${video.id} != ${id}`
        )
      )
      .orderBy(desc(videoSortTimestamp))
      .limit(8);
    const [resolvedList, relatedVideos] = await Promise.all([
      resolveVideosRelations(db, [videoRecord]),
      resolveVideosRelations(db, relatedRecords),
    ]);
    const [resolved] = resolvedList;
    if (!resolved) {
      return c.json({ message: "Video not found" }, HttpStatusCodes.NOT_FOUND);
    }
    return c.json(
      {
        owner: resolved.owner,
        relatedVideos,
        taggedUsers: resolved.taggedUsers,
        venue: resolved.venue,
        video: {
          ...resolved,
          owner: undefined,
          taggedUsers: undefined,
          venue: undefined,
        },
      },
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

      const { taggedUserIds, ...rest } = data;
      await db
        .update(video)
        .set({
          ...rest,
          publishedAt,
          taggedUserIds: taggedUserIds
            ? JSON.stringify(taggedUserIds)
            : undefined,
          updatedAt: new Date(),
        })
        .where(and(eq(video.id, id), eq(video.ownerUserId, authUser.id)));

      const [updated] = await db
        .select()
        .from(video)
        .where(and(eq(video.id, id), eq(video.ownerUserId, authUser.id)))
        .limit(1);

      if (updated) {
        const searchRecord = await upsertSearchDocument(db, {
          content: [updated.title, updated.description]
            .filter(Boolean)
            .join("\n"),
          entityId: updated.id,
          entityType: "video",
          metadata: {
            mediaType: updated.mediaType,
            ownerUserId: updated.ownerUserId,
            venueId: updated.venueId,
          },
          title: updated.title,
        });
        scheduleSearchDocumentIndex(() => c.executionCtx, c.env, searchRecord);
      }

      const returnedVideo = updated
        ? {
            ...updated,
            taggedUserIds: updated.taggedUserIds
              ? JSON.parse(updated.taggedUserIds)
              : [],
          }
        : null;

      return c.json({ id, ...data, video: returnedVideo }, HttpStatusCodes.OK);
    }
  )
  .get("/:id/social", async (c) => {
    const db = createDb(c.env.DB);
    const id = c.req.param("id");
    const [counts] = await db
      .select({
        comments: sql<number>`count(distinct ${videoComment.id})`,
        likes: sql<number>`count(distinct ${videoLike.userId})`,
      })
      .from(video)
      .leftJoin(videoLike, eq(videoLike.videoId, video.id))
      .leftJoin(videoComment, eq(videoComment.videoId, video.id))
      .where(eq(video.id, id))
      .limit(1);

    return c.json(
      { comments: counts?.comments ?? 0, likes: counts?.likes ?? 0 },
      HttpStatusCodes.OK
    );
  })
  .post("/:id/likes", requireAuth, async (c) => {
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    const id = c.req.param("id");
    const [record] = await db
      .select()
      .from(video)
      .where(eq(video.id, id))
      .limit(1);

    if (!record || record.status === "deleted") {
      return c.json({ message: "Video not found" }, HttpStatusCodes.NOT_FOUND);
    }

    await db
      .insert(videoLike)
      .values({ userId: authUser.id, videoId: id })
      .onConflictDoNothing();

    if (record.ownerUserId !== authUser.id) {
      await createNotification(db, {
        actorUserId: authUser.id,
        body: `${authUser.name} liked ${record.title}.`,
        entityId: id,
        entityType: "video",
        href: `/videos/${id}`,
        title: "Your video got a like",
        type: "like",
        userId: record.ownerUserId,
      });
    }

    return c.json({ liked: true }, HttpStatusCodes.OK);
  })
  .delete("/:id/likes", requireAuth, async (c) => {
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    const id = c.req.param("id");

    await db
      .delete(videoLike)
      .where(and(eq(videoLike.videoId, id), eq(videoLike.userId, authUser.id)));

    return c.json({ liked: false }, HttpStatusCodes.OK);
  })
  .get("/:id/comments", async (c) => {
    const db = createDb(c.env.DB);
    const id = c.req.param("id");

    const comments = await db
      .select({
        content: videoComment.content,
        createdAt: videoComment.createdAt,
        id: videoComment.id,
        isPinned: videoComment.isPinned,
        pinnedAt: videoComment.pinnedAt,
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
      .orderBy(
        desc(videoComment.isPinned),
        desc(videoComment.pinnedAt),
        desc(videoComment.createdAt)
      );

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

      if (record.ownerUserId !== authUser.id) {
        await createNotification(db, {
          actorUserId: authUser.id,
          body: content,
          entityId: commentId,
          entityType: "comment",
          href: `/videos/${id}`,
          title: `${authUser.name} commented on your video`,
          type: "comment",
          userId: record.ownerUserId,
        });
      }

      return c.json(
        {
          comment: {
            ...newComment,
            isPinned: false,
            pinnedAt: null,
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
  )
  .patch(
    "/:id/comments/:commentId/pin",
    requireAuth,
    zValidator("json", pinCommentSchema),
    async (c) => {
      const db = createDb(c.env.DB);
      const { user: authUser } = c.var.authSession;
      const id = c.req.param("id");
      const commentId = c.req.param("commentId");
      const { pinned } = c.req.valid("json");
      const [record] = await db
        .select()
        .from(video)
        .where(and(eq(video.id, id), eq(video.ownerUserId, authUser.id)))
        .limit(1);

      if (!record) {
        return c.json(
          { message: "Video not found" },
          HttpStatusCodes.NOT_FOUND
        );
      }

      const [comment] = await db
        .select()
        .from(videoComment)
        .where(
          and(eq(videoComment.id, commentId), eq(videoComment.videoId, id))
        )
        .limit(1);

      if (!comment) {
        return c.json(
          { message: "Comment not found" },
          HttpStatusCodes.NOT_FOUND
        );
      }

      if (pinned) {
        await db
          .update(videoComment)
          .set({ isPinned: false, pinnedAt: null })
          .where(eq(videoComment.videoId, id));
      }

      await db
        .update(videoComment)
        .set({
          isPinned: pinned,
          pinnedAt: pinned ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(videoComment.id, commentId));

      return c.json({ id: commentId, pinned }, HttpStatusCodes.OK);
    }
  );
