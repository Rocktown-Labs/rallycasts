import { zValidator } from "@hono/zod-validator";
import { createAuth } from "@rallycaststv/auth";
import { createDb } from "@rallycaststv/db";
import { user } from "@rallycaststv/db/schema/auth";
import {
  friendship,
  searchDocument,
  userProfile,
  venue,
  video,
  videoComment,
  videoLike,
} from "@rallycaststv/db/schema/domain";
import { and, desc, eq, inArray, lt, ne, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { z } from "zod";

import { generateEmbedding } from "../lib/embeddings";
import { createId } from "../lib/ids";
import {
  createMuxClip,
  createMuxPlaybackToken,
  deleteMuxAsset,
  replaceMuxAssetPlaybackPolicy,
} from "../lib/mux-client";
import { createNotification } from "../lib/notifications";
import { toPublicVenue, toPublicVideo } from "../lib/public-data";
import {
  removeSearchDocument,
  scheduleSearchDocumentIndex,
  upsertSearchDocument,
} from "../lib/search-index";
import {
  DEFAULT_SHOWCASE_VIDEOS,
  ensureShowcaseVideoInDb,
} from "../lib/showcase-videos";
import type { AppEnv } from "../lib/types";
import { requireAuth } from "../middleware/auth";
import { requireVerifiedAuth } from "../middleware/security";

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
  publish: z.boolean().optional(),
  publishedAt: z.coerce.date().nullable().optional(),
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
const FEED_CANDIDATE_LIMIT = 50;
const FEED_RESULT_LIMIT = 24;
const FEED_LAZY_INDEX_LIMIT = 12;
const EARTH_RADIUS_MILES = 3958.8;

interface VideoCursor {
  id: string;
  timestamp: number;
}

const videoSortTimestamp = sql<number>`coalesce(${video.publishedAt}, ${video.createdAt})`;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const distanceMiles = (
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number
) => {
  const latitudeDelta = toRadians(toLatitude - fromLatitude);
  const longitudeDelta = toRadians(toLongitude - fromLongitude);
  const startLatitude = toRadians(fromLatitude);
  const endLatitude = toRadians(toLatitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) *
      Math.cos(endLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(haversine));
};

const buildFeedIntent = (profile: typeof userProfile.$inferSelect) =>
  [
    profile.skillLevel
      ? `${profile.skillLevel} pickleball play and instruction`
      : null,
    profile.bio,
    profile.homeCourtName ? `home court ${profile.homeCourtName}` : null,
    profile.homeCity || profile.homeState
      ? `pickleball near ${[profile.homeCity, profile.homeState]
          .filter(Boolean)
          .join(", ")}`
      : null,
    profile.isCaster ? "pickleball casting and match footage" : null,
    profile.isOrganizer ? "pickleball tournaments and events" : null,
  ]
    .filter(Boolean)
    .join(". ");

const mergeUniqueVideos = (
  primary: (typeof video.$inferSelect)[],
  fallback: (typeof video.$inferSelect)[]
) => {
  const seen = new Set<string>();
  const merged: (typeof video.$inferSelect)[] = [];
  for (const candidate of [...primary, ...fallback]) {
    if (!seen.has(candidate.id)) {
      seen.add(candidate.id);
      merged.push(candidate);
    }
  }
  return merged;
};

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

const toPublicResolvedVideo = (
  record: Awaited<ReturnType<typeof resolveVideosRelations>>[number]
) => ({
  ...toPublicVideo(record),
  venue: record.venue ? toPublicVenue(record.venue) : record.venue,
});

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

    const resultVideos =
      resolved.length === 0 && !cursor
        ? DEFAULT_SHOWCASE_VIDEOS
        : resolved.map(toPublicResolvedVideo);

    return c.json(
      {
        nextCursor:
          hasNextPage && lastVideo ? encodeVideoCursor(lastVideo) : null,
        videos: resultVideos,
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
  // oxlint-disable-next-line complexity -- Legacy video feed combines semantic, social, location, freshness, and engagement signals.
  .get("/feed", requireAuth, async (c) => {
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    const [profile] = await db
      .select()
      .from(userProfile)
      .where(eq(userProfile.userId, authUser.id))
      .limit(1);
    const fallbackVideos = await db
      .select()
      .from(video)
      .where(and(eq(video.status, "ready"), eq(video.visibility, "public")))
      .orderBy(desc(videoSortTimestamp), desc(video.id))
      .limit(FEED_CANDIDATE_LIMIT);

    if (
      c.env.SEARCH_INDEX &&
      c.env.GOOGLE_GENERATIVE_AI_API_KEY &&
      fallbackVideos.length > 0
    ) {
      const existingDocuments = await db
        .select({
          embeddingStatus: searchDocument.embeddingStatus,
          entityId: searchDocument.entityId,
        })
        .from(searchDocument)
        .where(
          and(
            eq(searchDocument.entityType, "video"),
            inArray(
              searchDocument.entityId,
              fallbackVideos.map((record) => record.id)
            )
          )
        );
      const readyEntityIds = new Set(
        existingDocuments
          .filter((document) => document.embeddingStatus === "ready")
          .map((document) => document.entityId)
      );
      for (const record of fallbackVideos.slice(0, FEED_LAZY_INDEX_LIMIT)) {
        if (readyEntityIds.has(record.id)) {
          continue;
        }
        const searchRecord = await upsertSearchDocument(db, {
          content: [record.title, record.description]
            .filter(Boolean)
            .join("\n"),
          entityId: record.id,
          entityType: "video",
          metadata: {
            mediaType: record.mediaType,
            ownerUserId: record.ownerUserId,
            venueId: record.venueId,
          },
          title: record.title,
        });
        scheduleSearchDocumentIndex(
          () => c.executionCtx,
          db,
          c.env,
          searchRecord
        );
      }
    }

    const semanticScores = new Map<string, number>();
    let semanticVideos: (typeof video.$inferSelect)[] = [];
    const intent = profile ? buildFeedIntent(profile) : "";
    if (intent && c.env.SEARCH_INDEX && c.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      const embedding = await generateEmbedding(c.env, intent, "query");
      const intentVector = embedding?.values;
      if (intentVector) {
        const matches = await c.env.SEARCH_INDEX.query(intentVector, {
          topK: FEED_CANDIDATE_LIMIT,
        });
        const documentIds = matches.matches.map((match) => match.id);
        if (documentIds.length > 0) {
          const documents = await db
            .select({
              entityId: searchDocument.entityId,
              id: searchDocument.id,
            })
            .from(searchDocument)
            .where(
              and(
                inArray(searchDocument.id, documentIds),
                eq(searchDocument.entityType, "video")
              )
            );
          const documentById = new Map(
            documents.map((document) => [document.id, document.entityId])
          );
          const semanticVideoIds: string[] = [];
          for (const match of matches.matches) {
            const videoId = documentById.get(match.id);
            if (videoId) {
              semanticVideoIds.push(videoId);
              semanticScores.set(videoId, match.score ?? 0);
            }
          }
          if (semanticVideoIds.length > 0) {
            const rows = await db
              .select()
              .from(video)
              .where(
                and(
                  inArray(video.id, semanticVideoIds),
                  eq(video.status, "ready"),
                  eq(video.visibility, "public")
                )
              );
            const rowById = new Map(rows.map((row) => [row.id, row]));
            semanticVideos = semanticVideoIds
              .map((id) => rowById.get(id))
              .filter((row): row is (typeof rows)[number] => row !== undefined);
          }
        }
      }
    }

    const candidates = mergeUniqueVideos(semanticVideos, fallbackVideos);
    const candidateIds = candidates.map((candidate) => candidate.id);
    const [friendRows, likeRows] = await Promise.all([
      db
        .select({
          requesterUserId: friendship.requesterUserId,
          userId: friendship.userId,
        })
        .from(friendship)
        .where(
          or(
            eq(friendship.userId, authUser.id),
            eq(friendship.requesterUserId, authUser.id)
          )
        ),
      candidateIds.length > 0
        ? db
            .select({
              count: sql<number>`count(*)`,
              videoId: videoLike.videoId,
            })
            .from(videoLike)
            .where(inArray(videoLike.videoId, candidateIds))
            .groupBy(videoLike.videoId)
        : Promise.resolve([]),
    ]);
    const friendIds = new Set(
      friendRows.map((friend) =>
        friend.userId === authUser.id ? friend.requesterUserId : friend.userId
      )
    );
    const likesByVideoId = new Map(
      likeRows.map((row) => [row.videoId, Number(row.count)])
    );
    const resolved = await resolveVideosRelations(db, candidates);
    const now = Date.now();
    const ranked = resolved
      // oxlint-disable-next-line complexity -- Ranking combines independent optional product signals.
      .map((candidate) => {
        const semanticScore = Math.max(
          0,
          Math.min(1, semanticScores.get(candidate.id) ?? 0)
        );
        const publishedAt = candidate.publishedAt ?? candidate.createdAt;
        const ageDays = Math.max(
          0,
          (now - publishedAt.getTime()) / (24 * 60 * 60 * 1000)
        );
        const freshnessScore = Math.max(0, 1 - ageDays / 30);
        const isFriendContent =
          friendIds.has(candidate.ownerUserId) ||
          candidate.taggedUserIds.some((userId) => friendIds.has(userId));
        const socialScore = isFriendContent ? 1 : 0;
        const candidateLatitude =
          candidate.latitude ?? candidate.venue?.latitude;
        const candidateLongitude =
          candidate.longitude ?? candidate.venue?.longitude;
        const distance =
          profile?.homeLatitude !== null &&
          profile?.homeLatitude !== undefined &&
          profile.homeLongitude !== null &&
          profile.homeLongitude !== undefined &&
          candidateLatitude !== null &&
          candidateLatitude !== undefined &&
          candidateLongitude !== null &&
          candidateLongitude !== undefined
            ? distanceMiles(
                profile.homeLatitude,
                profile.homeLongitude,
                candidateLatitude,
                candidateLongitude
              )
            : null;
        const locationScore =
          distance === null ? 0 : Math.max(0, 1 - distance / 100);
        const likeCount = likesByVideoId.get(candidate.id) ?? 0;
        const engagementScore = Math.min(
          1,
          Math.log1p(likeCount) / Math.log(11)
        );
        const recommendationScore =
          semanticScore * 0.4 +
          locationScore * 0.2 +
          socialScore * 0.15 +
          freshnessScore * 0.15 +
          engagementScore * 0.1;

        let recommendationReason = "Fresh from RallyCasts";
        if (isFriendContent) {
          recommendationReason = "From a player you know";
        } else if (distance !== null && distance <= 25) {
          recommendationReason = "Near your home court";
        } else if (semanticScore >= 0.65) {
          recommendationReason = "Matches your pickleball interests";
        }

        return {
          ...candidate,
          recommendationReason,
          recommendationScore,
        };
      })
      .toSorted(
        (left, right) =>
          right.recommendationScore - left.recommendationScore ||
          (right.publishedAt ?? right.createdAt).getTime() -
            (left.publishedAt ?? left.createdAt).getTime()
      )
      .slice(0, FEED_RESULT_LIMIT);

    return c.json({
      mode: semanticScores.size > 0 ? "hybrid" : "fallback",
      videos: ranked.map(toPublicResolvedVideo),
    });
  })
  .post("/", requireAuth, zValidator("json", createVideoSchema), async (c) => {
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    const data = c.req.valid("json");
    const {
      muxUploadId: _muxUploadId,
      status: _status,
      taggedUserIds,
      ...rest
    } = data;

    const draft = {
      id: createId(),
      ownerUserId: authUser.id,
      ...rest,
      status: "draft" as const,
      taggedUserIds: taggedUserIds ? JSON.stringify(taggedUserIds) : null,
    };

    await db.insert(video).values(draft);
    if ((draft.status as string) === "ready" && draft.visibility === "public") {
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
      scheduleSearchDocumentIndex(
        () => c.executionCtx,
        db,
        c.env,
        searchRecord
      );
    }

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

      const [updated] = await db
        .update(video)
        .set({
          muxStatus: state === "failed" ? "upload_failed" : "uploaded",
          status: state,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(video.id, id),
            eq(video.ownerUserId, authUser.id),
            inArray(video.status, ["uploading", "processing"])
          )
        )
        .returning();

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
    requireVerifiedAuth,
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
        muxPlaybackPolicy: "public" as const,
        muxStatus: muxClip.status,
        ownerUserId: authUser.id,
        status: "processing" as const,
        title: data.title,
        visibility: "public" as const,
      };

      await db.insert(video).values(clip);
      return c.json({ video: clip }, HttpStatusCodes.CREATED);
    }
  )
  .get("/:id", async (c) => {
    const db = createDb(c.env.DB);
    const id = c.req.param("id");

    await ensureShowcaseVideoInDb(db, id);

    const [videoRecord] = await db
      .select()
      .from(video)
      .where(and(eq(video.id, id), ne(video.status, "deleted")))
      .limit(1);

    if (!videoRecord) {
      const showcase = DEFAULT_SHOWCASE_VIDEOS.find((v) => v.id === id);
      if (showcase) {
        return c.json(
          {
            owner: showcase.owner,
            relatedVideos: [] as typeof DEFAULT_SHOWCASE_VIDEOS,
            taggedUsers: showcase.taggedUsers,
            venue: showcase.venue,
            video: {
              ...showcase,
              owner: undefined,
              taggedUsers: undefined,
              venue: undefined,
            },
          },
          HttpStatusCodes.OK
        );
      }
      return c.json({ message: "Video not found" }, HttpStatusCodes.NOT_FOUND);
    }

    // Unpublished work (drafts, uploads, processing) is owner-only, even when
    // marked public. Ready videos skip the session lookup entirely.
    if (videoRecord.status !== "ready") {
      const authSession = await createAuth(c.env.DB).api.getSession({
        headers: c.req.raw.headers,
      });
      if (authSession?.user?.id !== videoRecord.ownerUserId) {
        return c.json(
          { message: "Video not found" },
          HttpStatusCodes.NOT_FOUND
        );
      }
    }

    if (videoRecord.visibility !== "public") {
      const authSession = await createAuth(c.env.DB).api.getSession({
        headers: c.req.raw.headers,
      });
      const viewerId = authSession?.user?.id;
      const isOwner = viewerId === videoRecord.ownerUserId;
      if (!isOwner) {
        if (videoRecord.visibility === "friends" && viewerId) {
          const [friend] = await db
            .select()
            .from(friendship)
            .where(
              or(
                and(
                  eq(friendship.userId, viewerId),
                  eq(friendship.requesterUserId, videoRecord.ownerUserId)
                ),
                and(
                  eq(friendship.userId, videoRecord.ownerUserId),
                  eq(friendship.requesterUserId, viewerId)
                )
              )
            )
            .limit(1);
          if (!friend) {
            return c.json(
              { message: "Video not found" },
              HttpStatusCodes.NOT_FOUND
            );
          }
        } else {
          return c.json(
            { message: "Video not found" },
            HttpStatusCodes.NOT_FOUND
          );
        }
      }
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
    const publicVideo = toPublicResolvedVideo(resolved);
    const fallbackRelated =
      relatedVideos.length === 0
        ? DEFAULT_SHOWCASE_VIDEOS.filter((v) => v.id !== id)
        : relatedVideos.map(toPublicResolvedVideo);
    return c.json(
      {
        owner: publicVideo.owner,
        relatedVideos: fallbackRelated,
        taggedUsers: publicVideo.taggedUsers,
        venue: publicVideo.venue,
        video: {
          ...publicVideo,
          owner: undefined,
          taggedUsers: undefined,
          venue: undefined,
        },
      },
      HttpStatusCodes.OK
    );
  })
  .get("/:id/playback", requireAuth, requireVerifiedAuth, async (c) => {
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    const id = c.req.param("id");
    const [record] = await db
      .select({
        muxPlaybackId: video.muxPlaybackId,
        muxPlaybackPolicy: video.muxPlaybackPolicy,
        ownerUserId: video.ownerUserId,
        status: video.status,
        visibility: video.visibility,
      })
      .from(video)
      .where(eq(video.id, id))
      .limit(1);

    if (!record || record.status !== "ready" || !record.muxPlaybackId) {
      return c.json({ message: "Video not found" }, HttpStatusCodes.NOT_FOUND);
    }
    if (record.visibility !== "public" && record.ownerUserId !== authUser.id) {
      return c.json({ message: "Forbidden" }, HttpStatusCodes.FORBIDDEN);
    }

    if (
      record.muxPlaybackId &&
      (record.muxPlaybackPolicy === "public" || record.visibility === "public")
    ) {
      return c.json(
        {
          playbackUrl: `https://stream.mux.com/${record.muxPlaybackId}.m3u8`,
        },
        HttpStatusCodes.OK
      );
    }

    const signingKeyId = c.env.MUX_SIGNING_KEY_ID;
    const signingKeySecret = c.env.MUX_SIGNING_KEY_SECRET;

    if (signingKeyId && signingKeySecret) {
      try {
        const token = await createMuxPlaybackToken(
          record.muxPlaybackId,
          signingKeyId,
          signingKeySecret
        );
        return c.json(
          {
            playbackUrl: `https://stream.mux.com/${record.muxPlaybackId}.m3u8?token=${encodeURIComponent(token)}`,
          },
          HttpStatusCodes.OK
        );
      } catch (error) {
        console.error(
          JSON.stringify({
            event: "mux_playback_token_failed",
            message: error instanceof Error ? error.message : "unknown error",
            videoId: id,
          })
        );
      }
    }

    // Fail closed: never silently downgrade a private video to a public
    // playback ID. The owner must configure signing keys to preview.
    return c.json(
      { message: "Private playback is unavailable" },
      HttpStatusCodes.SERVICE_UNAVAILABLE
    );
  })
  .patch(
    "/:id",
    requireAuth,
    zValidator("json", updateVideoSchema),
    // oxlint-disable-next-line complexity
    async (c) => {
      const db = createDb(c.env.DB);
      const { user: authUser } = c.var.authSession;
      const id = c.req.param("id");
      const data = c.req.valid("json");
      const [currentVideo] = await db
        .select({
          muxAssetId: video.muxAssetId,
          muxPlaybackId: video.muxPlaybackId,
          muxPlaybackPolicy: video.muxPlaybackPolicy,
          visibility: video.visibility,
        })
        .from(video)
        .where(and(eq(video.id, id), eq(video.ownerUserId, authUser.id)))
        .limit(1);
      if (!currentVideo) {
        return c.json(
          { message: "Video not found" },
          HttpStatusCodes.NOT_FOUND
        );
      }

      const {
        durationSeconds: _durationSeconds,
        muxAssetId: _muxAssetId,
        muxPlaybackId: _muxPlaybackId,
        muxStatus: _muxStatus,
        muxUploadId: _muxUploadId,
        publish,
        r2Key: _r2Key,
        status: _status,
        taggedUserIds,
        thumbnailUrl: _thumbnailUrl,
        ...rest
      } = data;
      const effectiveVisibility = data.visibility ?? currentVideo.visibility;
      const desiredPlaybackPolicy =
        effectiveVisibility === "public" ? "public" : "signed";
      let replacementPlaybackId: string | undefined;
      if (
        currentVideo.muxAssetId &&
        currentVideo.muxPlaybackPolicy !== desiredPlaybackPolicy
      ) {
        if (!(c.env.MUX_TOKEN_ID && c.env.MUX_TOKEN_SECRET)) {
          return c.json(
            { message: "Mux playback policy is not configured" },
            HttpStatusCodes.SERVICE_UNAVAILABLE
          );
        }
        try {
          replacementPlaybackId = await replaceMuxAssetPlaybackPolicy(
            currentVideo.muxAssetId,
            desiredPlaybackPolicy,
            c.env.MUX_TOKEN_ID,
            c.env.MUX_TOKEN_SECRET,
            currentVideo.muxPlaybackId
          );
        } catch {
          return c.json(
            { message: "Could not update video playback policy" },
            HttpStatusCodes.BAD_GATEWAY
          );
        }
      }
      await db
        .update(video)
        .set({
          ...rest,
          ...(publish === true ? { publishedAt: new Date() } : {}),
          ...(publish === false ? { publishedAt: null } : {}),
          ...(data.visibility && data.visibility !== "public"
            ? { thumbnailUrl: null }
            : {}),
          muxPlaybackId: replacementPlaybackId,
          muxPlaybackPolicy:
            currentVideo.muxPlaybackPolicy === desiredPlaybackPolicy
              ? undefined
              : desiredPlaybackPolicy,
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

      if (updated?.status === "ready" && updated.visibility === "public") {
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
        scheduleSearchDocumentIndex(
          () => c.executionCtx,
          db,
          c.env,
          searchRecord
        );
      } else if (updated) {
        await removeSearchDocument(db, c.env, "video", updated.id);
      }

      const returnedVideo = updated
        ? {
            ...updated,
            taggedUserIds: updated.taggedUserIds
              ? JSON.parse(updated.taggedUserIds)
              : [],
          }
        : null;

      return c.json({ id, video: returnedVideo }, HttpStatusCodes.OK);
    }
  )
  .delete("/:id", requireAuth, async (c) => {
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

    await removeSearchDocument(db, c.env, "video", id);

    if (record.muxAssetId && c.env.MUX_TOKEN_ID && c.env.MUX_TOKEN_SECRET) {
      try {
        await deleteMuxAsset(
          record.muxAssetId,
          c.env.MUX_TOKEN_ID,
          c.env.MUX_TOKEN_SECRET
        );
      } catch (error) {
        console.error(
          JSON.stringify({
            event: "mux_asset_deletion_failed",
            message: error instanceof Error ? error.message : "unknown error",
            videoId: id,
          })
        );
      }
    }

    await db
      .update(video)
      .set({ status: "deleted", updatedAt: new Date() })
      .where(eq(video.id, id));

    return c.json({ id, message: "Video deleted" }, HttpStatusCodes.OK);
  })
  .get("/:id/social", async (c) => {
    const db = createDb(c.env.DB);
    const id = c.req.param("id");
    await ensureShowcaseVideoInDb(db, id);

    const [counts] = await db
      .select({
        comments: sql<number>`count(distinct ${videoComment.id})`,
        likes: sql<number>`count(distinct ${videoLike.userId})`,
      })
      .from(video)
      .leftJoin(videoLike, eq(videoLike.videoId, video.id))
      .leftJoin(videoComment, eq(videoComment.videoId, video.id))
      .where(
        and(
          eq(video.id, id),
          eq(video.status, "ready"),
          eq(video.visibility, "public")
        )
      )
      .limit(1);

    const [doc] = await db
      .select({ metadataJson: searchDocument.metadataJson })
      .from(searchDocument)
      .where(
        and(
          eq(searchDocument.entityType, "video"),
          eq(searchDocument.entityId, id)
        )
      )
      .limit(1);

    let views = 1208;
    if (doc?.metadataJson) {
      try {
        const meta = JSON.parse(doc.metadataJson);
        if (typeof meta.views === "number") {
          ({ views } = meta);
        }
      } catch {
        // Fallback to default views
      }
    }

    let hasLiked = false;
    try {
      const authSession = await createAuth(c.env.DB).api.getSession({
        headers: c.req.raw.headers,
      });
      const viewerId = authSession?.user?.id;
      if (viewerId) {
        const [likeRecord] = await db
          .select()
          .from(videoLike)
          .where(and(eq(videoLike.videoId, id), eq(videoLike.userId, viewerId)))
          .limit(1);
        hasLiked = Boolean(likeRecord);
      }
    } catch {
      // Unauthenticated
    }

    return c.json(
      {
        comments: counts?.comments ?? 0,
        hasLiked,
        likes: counts?.likes ?? 0,
        views,
      },
      HttpStatusCodes.OK
    );
  })
  .post("/:id/views", async (c) => {
    const db = createDb(c.env.DB);
    const id = c.req.param("id");
    await ensureShowcaseVideoInDb(db, id);

    const [doc] = await db
      .select()
      .from(searchDocument)
      .where(
        and(
          eq(searchDocument.entityType, "video"),
          eq(searchDocument.entityId, id)
        )
      )
      .limit(1);

    let currentViews = 1208;
    let existingMeta: Record<string, unknown> = {};
    if (doc?.metadataJson) {
      try {
        existingMeta = JSON.parse(doc.metadataJson);
        if (typeof existingMeta.views === "number") {
          currentViews = existingMeta.views;
        }
      } catch {
        // Empty
      }
    }

    const nextViews = currentViews + 1;
    if (doc) {
      await db
        .update(searchDocument)
        .set({
          metadataJson: JSON.stringify({ ...existingMeta, views: nextViews }),
          updatedAt: new Date(),
        })
        .where(eq(searchDocument.id, doc.id));
    } else {
      const [v] = await db
        .select({ title: video.title })
        .from(video)
        .where(eq(video.id, id))
        .limit(1);
      const title = v?.title || "Video";
      await db
        .insert(searchDocument)
        .values({
          content: title,
          entityId: id,
          entityType: "video",
          id: createId(),
          metadataJson: JSON.stringify({ views: nextViews }),
          title,
        })
        .onConflictDoNothing();
    }

    return c.json({ id, views: nextViews }, HttpStatusCodes.OK);
  })
  .post("/:id/likes", requireAuth, async (c) => {
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    const id = c.req.param("id");
    await ensureShowcaseVideoInDb(db, id);

    const [record] = await db
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

    if (!record) {
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
    await ensureShowcaseVideoInDb(db, id);

    await db
      .delete(videoLike)
      .where(and(eq(videoLike.videoId, id), eq(videoLike.userId, authUser.id)));

    return c.json({ liked: false }, HttpStatusCodes.OK);
  })
  .get("/:id/comments", async (c) => {
    const db = createDb(c.env.DB);
    const id = c.req.param("id");
    await ensureShowcaseVideoInDb(db, id);

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
    zValidator(
      "json",
      z.object({
        content: z.string().min(1).max(1000),
        replyToCommentId: z.string().optional(),
      })
    ),
    async (c) => {
      const db = createDb(c.env.DB);
      const { user: authUser } = c.var.authSession;
      const id = c.req.param("id");
      const { content, replyToCommentId } = c.req.valid("json");

      await ensureShowcaseVideoInDb(db, id);

      // Verify video exists first
      const [record] = await db
        .select()
        .from(video)
        .where(eq(video.id, id))
        .limit(1);

      if (
        !record ||
        record.status !== "ready" ||
        record.visibility !== "public"
      ) {
        return c.json(
          { message: "Video not found" },
          HttpStatusCodes.NOT_FOUND
        );
      }

      // Look up parent comment if replying
      let parentCommentUser: { id: string; name: string } | null = null;
      if (replyToCommentId) {
        const [parentComment] = await db
          .select({
            id: videoComment.id,
            userId: videoComment.userId,
            userName: user.name,
          })
          .from(videoComment)
          .innerJoin(user, eq(videoComment.userId, user.id))
          .where(eq(videoComment.id, replyToCommentId))
          .limit(1);

        if (parentComment) {
          parentCommentUser = {
            id: parentComment.userId,
            name: parentComment.userName || "Player",
          };
        }
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

      // Send notification to user being replied to
      if (parentCommentUser && parentCommentUser.id !== authUser.id) {
        await createNotification(db, {
          actorUserId: authUser.id,
          body: content,
          entityId: commentId,
          entityType: "comment",
          href: `/videos/${id}`,
          title: `${authUser.name} replied to your comment`,
          type: "comment",
          userId: parentCommentUser.id,
        });
      }

      // Also send notification to video owner if different
      if (
        record.ownerUserId !== authUser.id &&
        (!parentCommentUser || parentCommentUser.id !== record.ownerUserId)
      ) {
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
