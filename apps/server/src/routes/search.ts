import { createDb } from "@rallycaststv/db";
import { user } from "@rallycaststv/db/schema/auth";
import {
  event,
  post,
  searchDocument,
  userProfile,
  venue,
  video,
} from "@rallycaststv/db/schema/domain";
import { and, desc, eq, inArray, like, or } from "drizzle-orm";
import { Hono } from "hono";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { isPlatformAdminEmail } from "../lib/admin";
import {
  scheduleSearchDocumentIndex,
  upsertSearchDocument,
} from "../lib/search-index";
import type { AppEnv } from "../lib/types";
import { requireAuth } from "../middleware/auth";

const searchPattern = (query: string | undefined) => `%${query ?? ""}%`;

const mergeById = <RecordType extends { id: string }>(
  primary: RecordType[],
  fallback: RecordType[]
) => {
  const seen = new Set<string>();
  return [...primary, ...fallback].filter((record) => {
    if (seen.has(record.id)) {
      return false;
    }
    seen.add(record.id);
    return true;
  });
};

export const searchRouter = new Hono<AppEnv>()
  // oxlint-disable-next-line complexity -- Search intentionally fans out across supported entity types.
  .get("/", async (c) => {
    const db = createDb(c.env.DB);
    const query = c.req.query("q") ?? "";
    const type = c.req.query("type") ?? "all";
    const pattern = searchPattern(query);
    const shouldSearch = query.trim().length > 1;
    const semanticDocuments = await (async () => {
      const semanticType = new Set([
        "all",
        "events",
        "parks",
        "players",
        "posts",
        "videos",
      ]);
      if (
        !(
          semanticType.has(type) &&
          c.env.AI &&
          c.env.SEARCH_INDEX &&
          shouldSearch
        )
      ) {
        return [];
      }

      const embeddings = await c.env.AI.run("@cf/baai/bge-base-en-v1.5", {
        text: [query],
      });
      const vector = embeddings.data?.[0];

      if (!vector) {
        return [];
      }

      const vectorResults = await c.env.SEARCH_INDEX.query(vector, {
        topK: 10,
      });
      const ids = vectorResults.matches.map((match) => match.id);

      if (ids.length === 0) {
        return [];
      }

      const rows = await db
        .select()
        .from(searchDocument)
        .where(inArray(searchDocument.id, ids))
        .limit(10);

      const rowById = new Map(rows.map((row) => [row.id, row]));
      const ordered = ids
        .map((id) => rowById.get(id))
        .filter((row): row is (typeof rows)[number] => row !== undefined);
      if (type === "videos") {
        return ordered.filter((row) => row.entityType === "video");
      }
      if (type === "posts") {
        return ordered.filter((row) => row.entityType === "post");
      }
      if (type === "events") {
        return ordered.filter((row) => row.entityType === "event");
      }
      if (type === "parks") {
        return ordered.filter((row) => row.entityType === "venue");
      }
      if (type === "players") {
        return ordered.filter((row) => row.entityType === "profile");
      }
      return ordered;
    })();

    if (!shouldSearch) {
      return c.json(
        {
          casters: [],
          documents: [],
          events: [],
          players: [],
          posts: [],
          venues: [],
          videos: [],
        },
        HttpStatusCodes.OK
      );
    }

    let documents: (typeof searchDocument.$inferSelect)[] = [];

    if (type === "all") {
      documents =
        semanticDocuments.length > 0
          ? semanticDocuments
          : await db
              .select()
              .from(searchDocument)
              .where(
                or(
                  like(searchDocument.title, pattern),
                  like(searchDocument.content, pattern)
                )
              )
              .orderBy(desc(searchDocument.updatedAt))
              .limit(10);

      const videoEntityIds = documents
        .filter((document) => document.entityType === "video")
        .map((document) => document.entityId);
      if (videoEntityIds.length > 0) {
        const visibleVideos = await db
          .select({ id: video.id })
          .from(video)
          .where(
            and(
              inArray(video.id, videoEntityIds),
              eq(video.status, "ready"),
              eq(video.visibility, "public")
            )
          );
        const visibleVideoIds = new Set(visibleVideos.map((item) => item.id));
        documents = documents.filter(
          (document) =>
            document.entityType !== "video" ||
            visibleVideoIds.has(document.entityId)
        );
      }
    }
    const keywordVideos =
      type === "all" || type === "videos"
        ? await db
            .select()
            .from(video)
            .where(
              and(
                eq(video.status, "ready"),
                eq(video.visibility, "public"),
                or(like(video.title, pattern), like(video.description, pattern))
              )
            )
            .limit(6)
        : [];
    const semanticVideoIds = semanticDocuments
      .filter((document) => document.entityType === "video")
      .map((document) => document.entityId);
    const semanticVideoRows =
      semanticVideoIds.length > 0
        ? await db
            .select()
            .from(video)
            .where(
              and(
                inArray(video.id, semanticVideoIds),
                eq(video.status, "ready"),
                eq(video.visibility, "public")
              )
            )
        : [];
    const semanticVideoById = new Map(
      semanticVideoRows.map((record) => [record.id, record])
    );
    const orderedSemanticVideos = semanticVideoIds
      .map((id) => semanticVideoById.get(id))
      .filter(
        (record): record is (typeof semanticVideoRows)[number] =>
          record !== undefined
      );
    const videos = mergeById(orderedSemanticVideos, keywordVideos).slice(0, 6);
    const keywordPosts =
      type === "all" || type === "posts"
        ? await db
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
            .where(like(post.content, pattern))
            .limit(6)
        : [];
    const semanticPostIds = semanticDocuments
      .filter((document) => document.entityType === "post")
      .map((document) => document.entityId);
    const semanticPostRows =
      semanticPostIds.length > 0
        ? await db
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
            .where(inArray(post.id, semanticPostIds))
        : [];
    const semanticPostById = new Map(
      semanticPostRows.map((record) => [record.post.id, record])
    );
    const orderedSemanticPosts = semanticPostIds
      .map((id) => semanticPostById.get(id))
      .filter(
        (record): record is (typeof semanticPostRows)[number] =>
          record !== undefined
      );
    const posts = mergeById(
      orderedSemanticPosts.map((record) => ({ ...record, id: record.post.id })),
      keywordPosts.map((record) => ({ ...record, id: record.post.id }))
    )
      .slice(0, 6)
      .map(({ id: _id, ...record }) => record);
    const keywordPlayers =
      type === "all" || type === "players"
        ? await db
            .select({
              displayUsername: user.displayUsername,
              homeCity: userProfile.homeCity,
              homeState: userProfile.homeState,
              id: user.id,
              image: user.image,
              name: user.name,
              username: user.username,
            })
            .from(userProfile)
            .innerJoin(user, eq(userProfile.userId, user.id))
            .where(or(like(user.name, pattern), like(user.username, pattern)))
            .limit(6)
        : [];
    const semanticPlayerIds = semanticDocuments
      .filter((document) => document.entityType === "profile")
      .map((document) => document.entityId);
    const semanticPlayerRows =
      semanticPlayerIds.length > 0
        ? await db
            .select({
              displayUsername: user.displayUsername,
              homeCity: userProfile.homeCity,
              homeState: userProfile.homeState,
              id: user.id,
              image: user.image,
              name: user.name,
              username: user.username,
            })
            .from(userProfile)
            .innerJoin(user, eq(userProfile.userId, user.id))
            .where(inArray(user.id, semanticPlayerIds))
        : [];
    const semanticPlayerById = new Map(
      semanticPlayerRows.map((record) => [record.id, record])
    );
    const orderedSemanticPlayers = semanticPlayerIds
      .map((id) => semanticPlayerById.get(id))
      .filter(
        (record): record is (typeof semanticPlayerRows)[number] =>
          record !== undefined
      );
    const players = mergeById(orderedSemanticPlayers, keywordPlayers).slice(
      0,
      6
    );
    const keywordEvents =
      type === "all" || type === "events"
        ? await db
            .select()
            .from(event)
            .where(
              and(
                eq(event.status, "published"),
                or(like(event.name, pattern), like(event.description, pattern))
              )
            )
            .limit(6)
        : [];
    const semanticEventIds = semanticDocuments
      .filter((document) => document.entityType === "event")
      .map((document) => document.entityId);
    const semanticEventRows =
      semanticEventIds.length > 0
        ? await db
            .select()
            .from(event)
            .where(
              and(
                inArray(event.id, semanticEventIds),
                eq(event.status, "published")
              )
            )
        : [];
    const semanticEventById = new Map(
      semanticEventRows.map((record) => [record.id, record])
    );
    const orderedSemanticEvents = semanticEventIds
      .map((id) => semanticEventById.get(id))
      .filter(
        (record): record is (typeof semanticEventRows)[number] =>
          record !== undefined
      );
    const events = mergeById(orderedSemanticEvents, keywordEvents).slice(0, 6);
    const keywordVenues =
      type === "all" || type === "parks"
        ? await db
            .select()
            .from(venue)
            .where(
              or(
                like(venue.name, pattern),
                like(venue.city, pattern),
                like(venue.state, pattern)
              )
            )
            .limit(6)
        : [];
    const semanticVenueIds = semanticDocuments
      .filter((document) => document.entityType === "venue")
      .map((document) => document.entityId);
    const semanticVenueRows =
      semanticVenueIds.length > 0
        ? await db
            .select()
            .from(venue)
            .where(inArray(venue.id, semanticVenueIds))
        : [];
    const semanticVenueById = new Map(
      semanticVenueRows.map((record) => [record.id, record])
    );
    const orderedSemanticVenues = semanticVenueIds
      .map((id) => semanticVenueById.get(id))
      .filter(
        (record): record is (typeof semanticVenueRows)[number] =>
          record !== undefined
      );
    const venues = mergeById(orderedSemanticVenues, keywordVenues).slice(0, 6);

    return c.json(
      {
        ai: {
          embeddingBackfill: documents.some(
            (document) => document.embeddingStatus === "pending"
          ),
          mode: semanticDocuments.length > 0 ? "semantic" : "keyword",
          vectorReady: Boolean(c.env.AI && c.env.SEARCH_INDEX),
        },
        casters: [],
        documents,
        events,
        players,
        posts,
        venues,
        videos,
      },
      HttpStatusCodes.OK
    );
  })
  .post("/backfill", requireAuth, async (c) => {
    const { user: authUser } = c.var.authSession;
    if (!isPlatformAdminEmail(authUser.email, c.env)) {
      return c.json({ message: "Forbidden" }, HttpStatusCodes.FORBIDDEN);
    }
    const db = createDb(c.env.DB);
    const [videos, posts, events, venues, profiles] = await Promise.all([
      db
        .select()
        .from(video)
        .where(and(eq(video.status, "ready"), eq(video.visibility, "public")))
        .limit(100),
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
      scheduleSearchDocumentIndex(() => c.executionCtx, db, c.env, record);
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
        content: [
          record.description,
          record.venueType,
          record.city,
          record.state,
        ]
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

    return c.json(
      {
        queued: {
          events: events.length,
          posts: posts.length,
          profiles: profiles.length,
          venues: venues.length,
          videos: videos.length,
        },
      },
      HttpStatusCodes.ACCEPTED
    );
  });
