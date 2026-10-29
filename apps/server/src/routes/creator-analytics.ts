import { createDb } from "@rallycaststv/db";
import {
  creatorFollow,
  friendship,
  liveStream,
  video,
  videoView,
} from "@rallycaststv/db/schema/domain";
import { and, desc, eq, gte, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppEnv } from "../lib/types";
import { requireAuth } from "../middleware/auth";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Creator analytics is computed from first-party rows only: video.view_count
 * increments on each real view, video_view carries watch progress, and
 * creator_follow is the real follow graph. No seeded or display-only values.
 */
export const creatorAnalyticsRouter = new Hono<AppEnv>().get(
  "/",
  requireAuth,
  async (c) => {
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    const since = new Date(Date.now() - THIRTY_DAYS_MS);

    const videos = await db
      .select({
        createdAt: video.createdAt,
        id: video.id,
        mediaType: video.mediaType,
        muxPlaybackId: video.muxPlaybackId,
        status: video.status,
        thumbnailUrl: video.thumbnailUrl,
        title: video.title,
        viewCount: video.viewCount,
      })
      .from(video)
      .where(and(eq(video.ownerUserId, authUser.id), eq(video.status, "ready")))
      .orderBy(desc(video.viewCount))
      .limit(50);

    const [videoStats] = await db
      .select({
        totalVideos: sql<number>`count(*)`,
        totalViews: sql<number>`coalesce(sum(${video.viewCount}), 0)`,
      })
      .from(video)
      .where(
        and(eq(video.ownerUserId, authUser.id), eq(video.status, "ready"))
      );

    const [watchStats] = await db
      .select({
        completedViews: sql<number>`coalesce(sum(case when ${videoView.completed} then 1 else 0 end), 0)`,
        watchTimeSeconds: sql<number>`coalesce(sum(${videoView.watchedSeconds}), 0)`,
      })
      .from(videoView)
      .innerJoin(video, eq(videoView.videoId, video.id))
      .where(
        and(eq(video.ownerUserId, authUser.id), eq(video.status, "ready"))
      );

    const viewsByDay = await db
      .select({
        date: sql<string>`date(${videoView.createdAt} / 1000, 'unixepoch')`,
        views: sql<number>`count(*)`,
      })
      .from(videoView)
      .innerJoin(video, eq(videoView.videoId, video.id))
      .where(
        and(
          eq(video.ownerUserId, authUser.id),
          eq(video.status, "ready"),
          gte(videoView.createdAt, since)
        )
      )
      .groupBy(sql`date(${videoView.createdAt} / 1000, 'unixepoch')`)
      .orderBy(sql`date(${videoView.createdAt} / 1000, 'unixepoch')`);

    const [friendStats] = await db
      .select({ count: sql<number>`count(*)` })
      .from(friendship)
      .where(
        or(
          eq(friendship.userId, authUser.id),
          eq(friendship.requesterUserId, authUser.id)
        )
      );

    const [followerStats] = await db
      .select({ count: sql<number>`count(*)` })
      .from(creatorFollow)
      .where(eq(creatorFollow.creatorUserId, authUser.id));

    const [followingStats] = await db
      .select({ count: sql<number>`count(*)` })
      .from(creatorFollow)
      .where(eq(creatorFollow.followerUserId, authUser.id));

    const [liveStats] = await db
      .select({ count: sql<number>`count(*)` })
      .from(liveStream)
      .where(eq(liveStream.ownerUserId, authUser.id));

    return c.json(
      {
        followers: followerStats?.count ?? 0,
        following: followingStats?.count ?? 0,
        friends: friendStats?.count ?? 0,
        liveStreams: liveStats?.count ?? 0,
        topVideos: videos.slice(0, 5),
        totals: {
          completedViews: watchStats?.completedViews ?? 0,
          totalVideos: videoStats?.totalVideos ?? 0,
          totalViews: videoStats?.totalViews ?? 0,
          watchTimeSeconds: watchStats?.watchTimeSeconds ?? 0,
        },
        viewsByDay,
      },
      HttpStatusCodes.OK
    );
  }
);
