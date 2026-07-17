import type { createDb } from "@rallycaststv/db";
import { user } from "@rallycaststv/db/schema/auth";
import {
  event,
  post,
  userProfile,
  venue,
  video,
} from "@rallycaststv/db/schema/domain";
import { eq } from "drizzle-orm";

import {
  scheduleSearchDocumentIndex,
  upsertSearchDocument,
} from "./search-index";
import type { AppEnv } from "./types";

type Db = ReturnType<typeof createDb>;
type WaitUntilExecutionContext = Pick<ExecutionContext, "waitUntil">;

export const backfillSearchDocuments = async ({
  db,
  env,
  getExecutionContext,
}: {
  db: Db;
  env: AppEnv["Bindings"];
  getExecutionContext: () => WaitUntilExecutionContext | undefined;
}) => {
  const [videos, posts, events, venues, profiles] = await Promise.all([
    db.select().from(video).where(eq(video.status, "ready")).limit(100),
    db
      .select({ authorName: user.name, post })
      .from(post)
      .innerJoin(user, eq(post.userId, user.id))
      .limit(100),
    db.select().from(event).where(eq(event.status, "published")).limit(100),
    db.select().from(venue).limit(100),
    db
      .select({ profile: userProfile, user })
      .from(userProfile)
      .innerJoin(user, eq(userProfile.userId, user.id))
      .where(eq(userProfile.onboardingStatus, "complete"))
      .limit(100),
  ]);

  const queueDocument = async (
    input: Parameters<typeof upsertSearchDocument>[1]
  ) => {
    const record = await upsertSearchDocument(db, input);
    scheduleSearchDocumentIndex(getExecutionContext, db, env, record);
  };

  for (const record of videos) {
    await queueDocument({
      content: [record.title, record.description].filter(Boolean).join("\n"),
      entityId: record.id,
      entityType: "video",
      metadata: {
        mediaType: record.mediaType,
        ownerUserId: record.ownerUserId,
        venueId: record.venueId,
      },
      title: record.title,
    });
  }

  for (const record of posts) {
    await queueDocument({
      content: record.post.content,
      entityId: record.post.id,
      entityType: "post",
      metadata: { authorUserId: record.post.userId },
      title: `${record.authorName}'s rally note`,
    });
  }

  for (const record of events) {
    await queueDocument({
      content: [record.description, record.eventType, record.hostLabel]
        .filter(Boolean)
        .join(". "),
      entityId: record.id,
      entityType: "event",
      metadata: {
        organizationId: record.organizationId,
        venueId: record.venueId,
      },
      title: record.name,
    });
  }

  for (const record of venues) {
    await queueDocument({
      content: [record.description, record.venueType, record.city, record.state]
        .filter(Boolean)
        .join(". "),
      entityId: record.id,
      entityType: "venue",
      metadata: { city: record.city, state: record.state },
      title: record.name,
    });
  }

  for (const record of profiles) {
    await queueDocument({
      content: [
        record.profile.bio,
        record.profile.skillLevel
          ? `${record.profile.skillLevel} pickleball player`
          : null,
        record.profile.homeCourtName,
        record.profile.homeCity,
        record.profile.homeState,
      ]
        .filter(Boolean)
        .join(". "),
      entityId: record.user.id,
      entityType: "profile",
      metadata: {
        homeCity: record.profile.homeCity,
        homeState: record.profile.homeState,
        skillLevel: record.profile.skillLevel,
      },
      title: record.user.name,
    });
  }

  return {
    events: events.length,
    posts: posts.length,
    profiles: profiles.length,
    venues: venues.length,
    videos: videos.length,
  };
};
