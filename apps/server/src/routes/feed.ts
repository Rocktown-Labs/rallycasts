import { createDb } from "@rallycaststv/db";
import { user } from "@rallycaststv/db/schema/auth";
import {
  event,
  friendship,
  post,
  postLike,
  searchDocument,
  userProfile,
  venue,
  video,
  videoLike,
} from "@rallycaststv/db/schema/domain";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { getDisplaySponsorships } from "../lib/ads";
import { generateEmbedding } from "../lib/embeddings";
import { haversineDistance } from "../lib/geo";
import { toPublicVenue, toPublicVideo } from "../lib/public-data";
import type { AppEnv } from "../lib/types";
import { requireAuth } from "../middleware/auth";

const FEED_CANDIDATE_LIMIT = 32;
const FEED_RESULT_LIMIT = 24;
const MAX_SPONSORED_ITEMS = 2;
const NEARBY_MILES = 100;
const EVENT_NEARBY_MILES = 200;
const FRESHNESS_WINDOW_DAYS = 30;

type FeedEntityType = "event" | "player" | "post" | "venue" | "video";

interface FeedSignals {
  engagement: number;
  freshness: number;
  location: number;
  semantic: number;
  social: number;
}

interface FeedItem {
  entity: unknown;
  entityType: FeedEntityType;
  id: string;
  reason: string;
  score: number;
  signals: FeedSignals;
  title: string;
}

const buildHomeFeedIntent = (
  profile: typeof userProfile.$inferSelect | undefined
) =>
  [
    profile?.skillLevel
      ? `${profile.skillLevel} pickleball videos, players, parks, and events`
      : "pickleball videos, players, parks, and events",
    profile?.bio,
    profile?.homeCourtName ? `home park ${profile.homeCourtName}` : null,
    profile?.homeCity || profile?.homeState
      ? `pickleball near ${[profile.homeCity, profile.homeState]
          .filter(Boolean)
          .join(", ")}`
      : null,
    profile?.isCaster ? "RallyCasts casting and match recording" : null,
    profile?.isOrganizer ? "pickleball tournaments and organizer tools" : null,
  ]
    .filter(Boolean)
    .join(". ");

const clampScore = (value: number) => Math.max(0, Math.min(1, value));

const daysSince = (date: Date | null | undefined) => {
  if (!date) {
    return FRESHNESS_WINDOW_DAYS;
  }
  return Math.max(0, (Date.now() - date.getTime()) / 86_400_000);
};

const freshnessScore = (date: Date | null | undefined) =>
  clampScore(1 - daysSince(date) / FRESHNESS_WINDOW_DAYS);

const engagementScore = (count: number) =>
  clampScore(Math.log1p(count) / Math.log(11));

const locationScore = (
  profile: typeof userProfile.$inferSelect | undefined,
  latitude: number | null | undefined,
  longitude: number | null | undefined,
  radiusMiles: number
) => {
  if (
    profile?.homeLatitude === null ||
    profile?.homeLatitude === undefined ||
    profile.homeLongitude === null ||
    profile.homeLongitude === undefined ||
    latitude === null ||
    latitude === undefined ||
    longitude === null ||
    longitude === undefined
  ) {
    return 0;
  }

  const distance = haversineDistance(
    profile.homeLatitude,
    profile.homeLongitude,
    latitude,
    longitude
  );

  return clampScore(1 - distance / radiusMiles);
};

const rankItem = (
  item: Omit<FeedItem, "reason" | "score" | "signals">,
  signals: FeedSignals
): FeedItem => {
  const score =
    signals.semantic * 0.4 +
    signals.location * 0.2 +
    signals.social * 0.15 +
    signals.freshness * 0.15 +
    signals.engagement * 0.1;

  let reason = "Fresh on RallyCasts";
  if (signals.social >= 1) {
    reason = "From your friends";
  } else if (signals.location >= 0.75) {
    reason = "Near your home park";
  } else if (signals.semantic >= 0.65) {
    reason = "Matches your pickleball interests";
  } else if (signals.engagement >= 0.5) {
    reason = "Getting attention";
  }

  return {
    ...item,
    reason,
    score,
    signals,
  };
};

const byScoreThenFreshness = <
  Item extends FeedItem & { sortDate?: Date | null | undefined },
>(
  left: Item,
  right: Item
) =>
  right.score - left.score ||
  (right.sortDate?.getTime() ?? 0) - (left.sortDate?.getTime() ?? 0);

const getSemanticScores = async (
  db: ReturnType<typeof createDb>,
  env: AppEnv["Bindings"],
  intent: string
) => {
  const scores = new Map<string, number>();

  if (!(env.SEARCH_INDEX && env.GOOGLE_GENERATIVE_AI_API_KEY)) {
    return scores;
  }

  const embedding = await generateEmbedding(env, intent, "query");
  if (!embedding) {
    return scores;
  }

  const matches = await env.SEARCH_INDEX.query(embedding.values, {
    topK: FEED_CANDIDATE_LIMIT,
  });
  const documentIds = matches.matches.map((match) => match.id);
  if (documentIds.length === 0) {
    return scores;
  }

  const documents = await db
    .select({
      entityId: searchDocument.entityId,
      entityType: searchDocument.entityType,
      id: searchDocument.id,
    })
    .from(searchDocument)
    .where(inArray(searchDocument.id, documentIds));
  const documentById = new Map(documents.map((row) => [row.id, row]));

  for (const match of matches.matches) {
    const document = documentById.get(match.id);
    if (document) {
      scores.set(
        `${document.entityType}:${document.entityId}`,
        clampScore(match.score ?? 0)
      );
    }
  }

  return scores;
};

export const feedRouter = new Hono<AppEnv>().get(
  "/home",
  requireAuth,
  async (c) => {
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    const [profile] = await db
      .select()
      .from(userProfile)
      .where(eq(userProfile.userId, authUser.id))
      .limit(1);
    const intent = buildHomeFeedIntent(profile);

    const [
      semanticScores,
      friendRows,
      latestVideos,
      upcomingEvents,
      activeVenues,
      nearbyPlayers,
      latestPosts,
    ] = await Promise.all([
      getSemanticScores(db, c.env, intent),
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
      db
        .select({
          owner: {
            displayUsername: user.displayUsername,
            id: user.id,
            image: user.image,
            name: user.name,
            username: user.username,
          },
          venue,
          video,
        })
        .from(video)
        .innerJoin(user, eq(video.ownerUserId, user.id))
        .leftJoin(venue, eq(video.venueId, venue.id))
        .where(and(eq(video.status, "ready"), eq(video.visibility, "public")))
        .orderBy(desc(video.publishedAt), desc(video.createdAt))
        .limit(FEED_CANDIDATE_LIMIT),
      db
        .select({ event, venue })
        .from(event)
        .leftJoin(venue, eq(event.venueId, venue.id))
        .where(eq(event.status, "published"))
        .orderBy(desc(event.startsAt))
        .limit(FEED_CANDIDATE_LIMIT),
      db
        .select()
        .from(venue)
        .orderBy(desc(venue.updatedAt))
        .limit(FEED_CANDIDATE_LIMIT),
      db
        .select({
          bio: userProfile.bio,
          displayUsername: user.displayUsername,
          homeCity: userProfile.homeCity,
          homeLatitude: userProfile.homeLatitude,
          homeLongitude: userProfile.homeLongitude,
          homeState: userProfile.homeState,
          id: user.id,
          image: user.image,
          name: user.name,
          skillLevel: userProfile.skillLevel,
          username: user.username,
        })
        .from(userProfile)
        .innerJoin(user, eq(userProfile.userId, user.id))
        .where(
          and(
            eq(userProfile.isPlayer, true),
            eq(userProfile.onboardingStatus, "complete"),
            sql`${user.id} != ${authUser.id}`
          )
        )
        .limit(FEED_CANDIDATE_LIMIT),
      db
        .select({
          author: {
            displayUsername: user.displayUsername,
            id: user.id,
            image: user.image,
            name: user.name,
            username: user.username,
          },
          post,
        })
        .from(post)
        .innerJoin(user, eq(post.userId, user.id))
        .orderBy(desc(post.createdAt))
        .limit(FEED_CANDIDATE_LIMIT),
    ]);

    const friendIds = new Set(
      friendRows.map((friend) =>
        friend.userId === authUser.id ? friend.requesterUserId : friend.userId
      )
    );
    const videoIds = latestVideos.map((row) => row.video.id);
    const postIds = latestPosts.map((row) => row.post.id);
    const [videoLikes, postLikes] = await Promise.all([
      videoIds.length > 0
        ? db
            .select({
              count: sql<number>`count(*)`,
              videoId: videoLike.videoId,
            })
            .from(videoLike)
            .where(inArray(videoLike.videoId, videoIds))
            .groupBy(videoLike.videoId)
        : Promise.resolve([]),
      postIds.length > 0
        ? db
            .select({
              count: sql<number>`count(*)`,
              postId: postLike.postId,
            })
            .from(postLike)
            .where(inArray(postLike.postId, postIds))
            .groupBy(postLike.postId)
        : Promise.resolve([]),
    ]);
    const likesByVideoId = new Map(
      videoLikes.map((row) => [row.videoId, Number(row.count)])
    );
    const likesByPostId = new Map(
      postLikes.map((row) => [row.postId, Number(row.count)])
    );

    const videos = latestVideos.map((row) => {
      const key = `video:${row.video.id}`;
      const social =
        friendIds.has(row.video.ownerUserId) ||
        parseTaggedUserIds(row.video.taggedUserIds).some((id) =>
          friendIds.has(id)
        )
          ? 1
          : 0;
      const signals = {
        engagement: engagementScore(likesByVideoId.get(row.video.id) ?? 0),
        freshness: freshnessScore(row.video.publishedAt ?? row.video.createdAt),
        location: locationScore(
          profile,
          row.video.latitude ?? row.venue?.latitude,
          row.video.longitude ?? row.venue?.longitude,
          NEARBY_MILES
        ),
        semantic: semanticScores.get(key) ?? 0,
        social,
      };

      return {
        ...rankItem(
          {
            entity: {
              ...toPublicVideo(row.video),
              owner: row.owner,
              taggedUserIds: parseTaggedUserIds(row.video.taggedUserIds),
              venue: row.venue ? toPublicVenue(row.venue) : row.venue,
            },
            entityType: "video" as const,
            id: row.video.id,
            title: row.video.title,
          },
          signals
        ),
        sortDate: row.video.publishedAt ?? row.video.createdAt,
      };
    });

    const events = upcomingEvents.map((row) => {
      const key = `event:${row.event.id}`;
      const signals = {
        engagement: 0,
        freshness: freshnessScore(row.event.createdAt),
        location: locationScore(
          profile,
          row.venue?.latitude,
          row.venue?.longitude,
          EVENT_NEARBY_MILES
        ),
        semantic: semanticScores.get(key) ?? 0,
        social: friendIds.has(row.event.organizerUserId) ? 1 : 0,
      };

      return {
        ...rankItem(
          {
            entity: {
              ...row.event,
              location: [row.venue?.city, row.venue?.state]
                .filter(Boolean)
                .join(", "),
            },
            entityType: "event" as const,
            id: row.event.id,
            title: row.event.name,
          },
          signals
        ),
        sortDate: row.event.startsAt,
      };
    });

    const venues = activeVenues.map((record) => {
      const key = `venue:${record.id}`;
      const signals = {
        engagement: engagementScore(record.userRatingsTotal ?? 0),
        freshness: freshnessScore(record.updatedAt ?? record.createdAt),
        location: locationScore(
          profile,
          record.latitude,
          record.longitude,
          NEARBY_MILES
        ),
        semantic: semanticScores.get(key) ?? 0,
        social: 0,
      };

      return {
        ...rankItem(
          {
            entity: toPublicVenue(record),
            entityType: "venue" as const,
            id: record.id,
            title: record.name,
          },
          signals
        ),
        sortDate: record.updatedAt ?? record.createdAt,
      };
    });

    const players = nearbyPlayers.map((record) => {
      const key = `profile:${record.id}`;
      const signals = {
        engagement: 0,
        freshness: 0.2,
        location: locationScore(
          profile,
          record.homeLatitude,
          record.homeLongitude,
          NEARBY_MILES
        ),
        semantic: semanticScores.get(key) ?? 0,
        social: friendIds.has(record.id) ? 1 : 0,
      };
      const {
        homeLatitude: _homeLatitude,
        homeLongitude: _homeLongitude,
        ...player
      } = record;

      return {
        ...rankItem(
          {
            entity: player,
            entityType: "player" as const,
            id: record.id,
            title: record.name,
          },
          signals
        ),
        sortDate: undefined,
      };
    });

    const posts = latestPosts.map((row) => {
      const key = `post:${row.post.id}`;
      const signals = {
        engagement: engagementScore(likesByPostId.get(row.post.id) ?? 0),
        freshness: freshnessScore(row.post.createdAt),
        location: 0,
        semantic: semanticScores.get(key) ?? 0,
        social: friendIds.has(row.post.userId) ? 1 : 0,
      };

      return {
        ...rankItem(
          {
            entity: { ...row.post, author: row.author },
            entityType: "post" as const,
            id: row.post.id,
            title: `${row.author.name}'s rally note`,
          },
          signals
        ),
        sortDate: row.post.createdAt,
      };
    });

    const items = [...videos, ...events, ...venues, ...players, ...posts]
      .toSorted(byScoreThenFreshness)
      .slice(0, FEED_RESULT_LIMIT - MAX_SPONSORED_ITEMS)
      .map(({ sortDate: _sortDate, ...item }) => item);

    const sponsorships = await getDisplaySponsorships(db, {
      city: profile?.homeCity ?? null,
      skillLevel: profile?.skillLevel ?? null,
      state: profile?.homeState ?? null,
    });
    const sponsoredItems = sponsorships
      .slice(0, MAX_SPONSORED_ITEMS)
      .map((sponsorship) => ({
        entity: {
          ...sponsorship.event,
          adCampaignId: sponsorship.campaign.id,
          adCreativeId: sponsorship.creative.id,
          location: "",
          sponsored: true as const,
        },
        entityType: "event" as const,
        id: sponsorship.event.id,
        reason: "Promoted tournament",
        score: 0,
        signals: {
          engagement: 0,
          freshness: 0,
          location: 0,
          semantic: 0,
          social: 0,
        },
        title: sponsorship.event.name,
      }));
    // Fixed slots keep sponsored placement deterministic and auditable.
    for (const [slot, item] of [
      [3, sponsoredItems[0]],
      [12, sponsoredItems[1]],
    ] as const) {
      if (item) {
        items.splice(Math.min(slot, items.length), 0, item);
      }
    }

    return c.json(
      {
        algorithm: {
          mode: semanticScores.size > 0 ? "semantic-hybrid" : "fallback-hybrid",
          version: "home-feed-v1",
          weights: {
            engagement: 0.1,
            freshness: 0.15,
            location: 0.2,
            semantic: 0.4,
            social: 0.15,
          },
        },
        items,
      },
      HttpStatusCodes.OK
    );
  }
);

const parseTaggedUserIds = (value: string | null) => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
};
