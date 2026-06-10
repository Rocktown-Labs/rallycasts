import { createDb } from "@rallycaststv/db";
import { user } from "@rallycaststv/db/schema/auth";
import {
  event,
  userProfile,
  venue,
  video,
} from "@rallycaststv/db/schema/domain";
import { eq, like, or } from "drizzle-orm";
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

  if (!shouldSearch) {
    return c.json(
      { casters: [], events: [], players: [], venues: [], videos: [] },
      HttpStatusCodes.OK
    );
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
    { casters: [], events, players, venues, videos },
    HttpStatusCodes.OK
  );
});
