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
import { desc, eq, inArray, like, or } from "drizzle-orm";
import { Hono } from "hono";
import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppEnv } from "../lib/types";

const searchPattern = (query: string | undefined) => `%${query ?? ""}%`;

export const searchRouter = new Hono<AppEnv>().get("/", async (c) => {
  const db = createDb(c.env.DB);
  const query = c.req.query("q") ?? "";
  const type = c.req.query("type") ?? "all";
  const pattern = searchPattern(query);
  const shouldSearch = query.trim().length > 1;
  const semanticDocuments = await (async () => {
    if (!(type === "all" && c.env.AI && c.env.SEARCH_INDEX && shouldSearch)) {
      return [];
    }

    const embeddings = await c.env.AI.run("@cf/baai/bge-base-en-v1.5", {
      text: [query],
    });
    const vector = embeddings.data?.[0];

    if (!vector) {
      return [];
    }

    const vectorResults = await c.env.SEARCH_INDEX.query(vector, { topK: 10 });
    const ids = vectorResults.matches.map((match) => match.id);

    if (ids.length === 0) {
      return [];
    }

    return db
      .select()
      .from(searchDocument)
      .where(inArray(searchDocument.id, ids))
      .limit(10);
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
  }
  const videos =
    type === "all" || type === "videos"
      ? await db
          .select()
          .from(video)
          .where(
            or(like(video.title, pattern), like(video.description, pattern))
          )
          .limit(6)
      : [];
  const posts =
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
  const players =
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
  const events =
    type === "all" || type === "events"
      ? await db
          .select()
          .from(event)
          .where(
            or(like(event.name, pattern), like(event.description, pattern))
          )
          .limit(6)
      : [];
  const venues =
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
});
