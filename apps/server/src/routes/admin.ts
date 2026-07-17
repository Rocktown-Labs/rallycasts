import { createDb } from "@rallycaststv/db";
import { user } from "@rallycaststv/db/schema/auth";
import {
  castingJob,
  challenge,
  event,
  eventRegistration,
  notification,
  organization,
  searchDocument,
  userProfile,
  venue,
  video,
  webhookEvent,
} from "@rallycaststv/db/schema/domain";
import { count, desc, eq, gte, sql } from "drizzle-orm";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { isPlatformAdminEmail } from "../lib/admin";
import { backfillSearchDocuments } from "../lib/search-backfill";
import type { AppEnv } from "../lib/types";
import { requireAuth } from "../middleware/auth";

const requirePlatformAdmin = createMiddleware<AppEnv>(async (c, next) => {
  const { user: authUser } = c.var.authSession;
  if (!isPlatformAdminEmail(authUser.email, c.env)) {
    return c.json({ message: "Forbidden" }, HttpStatusCodes.FORBIDDEN);
  }

  await next();
});

const readCount = (rows: { count: number }[]) => rows[0]?.count ?? 0;

const groupRowsByStatus = <Status extends string | null>(
  rows: { count: number; status: Status }[]
) =>
  Object.fromEntries(
    rows.map((row) => [row.status ?? "unknown", row.count])
  ) as Record<string, number>;

export const adminRouter = new Hono<AppEnv>()
  .use("*", requireAuth, requirePlatformAdmin)
  .get("/dashboard", async (c) => {
    const db = createDb(c.env.DB);
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsers24h,
      completedOnboarding,
      pendingOnboarding,
      playerProfiles,
      organizerProfiles,
      casterProfiles,
      totalOrganizations,
      totalVenues,
      totalVideos,
      totalEvents,
      totalEventRegistrations,
      totalCastingJobs,
      totalChallenges,
      totalNotifications,
      searchDocuments,
      pendingSearchDocuments,
      failedSearchDocuments,
      recentUsers,
      videoStatuses,
      eventStatuses,
      castingJobStatuses,
      challengeStatuses,
      webhookStatuses,
      embeddingModels,
    ] = await Promise.all([
      db.select({ count: count() }).from(user),
      db
        .select({ count: count() })
        .from(user)
        .where(gte(user.createdAt, dayAgo)),
      db
        .select({ count: count() })
        .from(userProfile)
        .where(eq(userProfile.onboardingStatus, "complete")),
      db
        .select({ count: count() })
        .from(userProfile)
        .where(eq(userProfile.onboardingStatus, "pending")),
      db
        .select({ count: count() })
        .from(userProfile)
        .where(eq(userProfile.isPlayer, true)),
      db
        .select({ count: count() })
        .from(userProfile)
        .where(eq(userProfile.isOrganizer, true)),
      db
        .select({ count: count() })
        .from(userProfile)
        .where(eq(userProfile.isCaster, true)),
      db.select({ count: count() }).from(organization),
      db.select({ count: count() }).from(venue),
      db.select({ count: count() }).from(video),
      db.select({ count: count() }).from(event),
      db.select({ count: count() }).from(eventRegistration),
      db.select({ count: count() }).from(castingJob),
      db.select({ count: count() }).from(challenge),
      db.select({ count: count() }).from(notification),
      db.select({ count: count() }).from(searchDocument),
      db
        .select({ count: count() })
        .from(searchDocument)
        .where(eq(searchDocument.embeddingStatus, "pending")),
      db
        .select({ count: count() })
        .from(searchDocument)
        .where(eq(searchDocument.embeddingStatus, "failed")),
      db
        .select({
          createdAt: user.createdAt,
          email: user.email,
          id: user.id,
          name: user.name,
          onboardingStatus: userProfile.onboardingStatus,
          username: user.username,
        })
        .from(user)
        .leftJoin(userProfile, eq(userProfile.userId, user.id))
        .orderBy(desc(user.createdAt))
        .limit(8),
      db
        .select({ count: count(), status: video.status })
        .from(video)
        .groupBy(video.status),
      db
        .select({ count: count(), status: event.status })
        .from(event)
        .groupBy(event.status),
      db
        .select({ count: count(), status: castingJob.status })
        .from(castingJob)
        .groupBy(castingJob.status),
      db
        .select({ count: count(), status: challenge.status })
        .from(challenge)
        .groupBy(challenge.status),
      db
        .select({
          count: count(),
          status: sql<string>`${webhookEvent.provider} || ':' || ${webhookEvent.status}`,
        })
        .from(webhookEvent)
        .groupBy(webhookEvent.provider, webhookEvent.status),
      db
        .select({
          count: count(),
          model: sql<string>`coalesce(${searchDocument.embeddingModel}, 'none')`,
        })
        .from(searchDocument)
        .groupBy(searchDocument.embeddingModel),
    ]);

    const queuedForEmbedding =
      readCount(pendingSearchDocuments) + readCount(failedSearchDocuments);

    return c.json(
      {
        health: {
          apiVersion: "v1",
          geminiConfigured: Boolean(c.env.GOOGLE_GENERATIVE_AI_API_KEY),
          searchBackfillReady: Boolean(
            c.env.GOOGLE_GENERATIVE_AI_API_KEY && c.env.SEARCH_INDEX
          ),
          searchIndexConfigured: Boolean(c.env.SEARCH_INDEX),
        },
        recentUsers: recentUsers.map((record) => ({
          createdAt: record.createdAt,
          email: record.email,
          id: record.id,
          name: record.name,
          onboardingStatus: record.onboardingStatus ?? "missing",
          username: record.username,
        })),
        search: {
          documents: readCount(searchDocuments),
          embeddingModels: Object.fromEntries(
            embeddingModels.map((record) => [record.model, record.count])
          ),
          failed: readCount(failedSearchDocuments),
          pending: readCount(pendingSearchDocuments),
          queuedForEmbedding,
        },
        statusBreakdown: {
          castingJobs: groupRowsByStatus(castingJobStatuses),
          challenges: groupRowsByStatus(challengeStatuses),
          events: groupRowsByStatus(eventStatuses),
          videos: groupRowsByStatus(videoStatuses),
          webhooks: groupRowsByStatus(webhookStatuses),
        },
        totals: {
          castingJobs: readCount(totalCastingJobs),
          challenges: readCount(totalChallenges),
          eventRegistrations: readCount(totalEventRegistrations),
          events: readCount(totalEvents),
          newUsers24h: readCount(newUsers24h),
          notifications: readCount(totalNotifications),
          organizations: readCount(totalOrganizations),
          users: readCount(totalUsers),
          venues: readCount(totalVenues),
          videos: readCount(totalVideos),
        },
        users: {
          casters: readCount(casterProfiles),
          onboarded: readCount(completedOnboarding),
          organizers: readCount(organizerProfiles),
          pendingOnboarding: readCount(pendingOnboarding),
          players: readCount(playerProfiles),
        },
      },
      HttpStatusCodes.OK
    );
  })
  .post("/search/backfill", async (c) => {
    const db = createDb(c.env.DB);
    const queued = await backfillSearchDocuments({
      db,
      env: c.env,
      getExecutionContext: () => c.executionCtx,
    });

    return c.json(
      {
        queued,
        ready: Boolean(
          c.env.GOOGLE_GENERATIVE_AI_API_KEY && c.env.SEARCH_INDEX
        ),
      },
      HttpStatusCodes.ACCEPTED
    );
  });
