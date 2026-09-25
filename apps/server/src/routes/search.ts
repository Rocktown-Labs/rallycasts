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

import { isPlatformAdminUser } from "../lib/admin";
import {
  getDisplaySponsorships,
  adsSecret,
  signDisplayTracking,
} from "../lib/ads";
import { generateEmbedding } from "../lib/embeddings";
import { toPublicVenue, toPublicVideo } from "../lib/public-data";
import { backfillSearchDocuments } from "../lib/search-backfill";
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
    let semanticEmbeddingModel: string | null = null;
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
          c.env.GOOGLE_GENERATIVE_AI_API_KEY &&
          c.env.SEARCH_INDEX &&
          shouldSearch
        )
      ) {
        return [];
      }

      const embedding = await generateEmbedding(c.env, query, "query");
      const vector = embedding?.values;
      semanticEmbeddingModel = embedding?.model ?? null;

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
    const videos = mergeById(orderedSemanticVideos, keywordVideos)
      .slice(0, 6)
      .map(toPublicVideo);
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
            .where(
              and(
                eq(userProfile.onboardingStatus, "complete"),
                or(like(user.name, pattern), like(user.username, pattern))
              )
            )
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
            .where(
              and(
                eq(userProfile.onboardingStatus, "complete"),
                inArray(user.id, semanticPlayerIds)
              )
            )
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
    let events = mergeById(orderedSemanticEvents, keywordEvents).slice(0, 6);
    if (type === "all" || type === "events") {
      // Sponsored events match the query text so intent is preserved,
      // and they are labeled instead of blended into semantic order.
      const sponsorships = await getDisplaySponsorships(db, {});
      const needle = query.trim().toLowerCase();
      const sponsored = await Promise.all(
        sponsorships
          .filter((sponsorship) =>
            `${sponsorship.event.name} ${sponsorship.event.description ?? ""}`
              .toLowerCase()
              .includes(needle)
          )
          .slice(0, 2)
          .map(async (sponsorship) => ({
            ...sponsorship.event,
            adCampaignId: sponsorship.campaign.id,
            adCreativeId: sponsorship.creative.id,
            adTracking: await signDisplayTracking(
              adsSecret(c.env),
              sponsorship.campaign.id,
              sponsorship.creative.id
            ),
            sponsored: true as const,
          }))
      );
      events = [...sponsored, ...events].slice(0, 6);
    }
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

    const publicDocuments = documents.map((document) => ({
      entityId: document.entityId,
      entityType: document.entityType,
      id: document.id,
      title: document.title,
    }));

    return c.json(
      {
        ai: {
          embeddingBackfill: documents.some(
            (document) => document.embeddingStatus === "pending"
          ),
          embeddingModel:
            semanticDocuments.length > 0 ? semanticEmbeddingModel : null,
          mode: semanticDocuments.length > 0 ? "semantic" : "keyword",
          vectorReady: Boolean(
            c.env.SEARCH_INDEX && c.env.GOOGLE_GENERATIVE_AI_API_KEY
          ),
        },
        casters: [],
        documents: publicDocuments,
        events,
        players,
        posts,
        venues: venues.map(toPublicVenue),
        videos,
      },
      HttpStatusCodes.OK
    );
  })
  .post("/backfill", requireAuth, async (c) => {
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    if (
      !authUser.emailVerified ||
      !(await isPlatformAdminUser(db, authUser.id))
    ) {
      return c.json({ message: "Forbidden" }, HttpStatusCodes.FORBIDDEN);
    }
    const queued = await backfillSearchDocuments({
      db,
      env: c.env,
      getExecutionContext: () => c.executionCtx,
    });

    return c.json(
      {
        queued,
      },
      HttpStatusCodes.ACCEPTED
    );
  });
