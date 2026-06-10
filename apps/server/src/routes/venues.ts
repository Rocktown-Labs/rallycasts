import { createDb } from "@rallycaststv/db";
import { event, venue } from "@rallycaststv/db/schema/domain";
import { desc, eq, like, or } from "drizzle-orm";
import { Hono } from "hono";
import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppEnv } from "../lib/types";

const searchPattern = (query: string | undefined) => `%${query ?? ""}%`;

export const venuesRouter = new Hono<AppEnv>()
  .get("/", async (c) => {
    const db = createDb(c.env.DB);
    const query = c.req.query("q");
    const venues = await db
      .select()
      .from(venue)
      .where(
        query
          ? or(
              like(venue.name, searchPattern(query)),
              like(venue.city, searchPattern(query)),
              like(venue.state, searchPattern(query))
            )
          : undefined
      )
      .orderBy(desc(venue.updatedAt))
      .limit(50);

    return c.json({ venues }, HttpStatusCodes.OK);
  })
  .get("/:id", async (c) => {
    const db = createDb(c.env.DB);
    const [record] = await db
      .select()
      .from(venue)
      .where(eq(venue.id, c.req.param("id")))
      .limit(1);

    if (!record) {
      return c.json({ message: "Venue not found" }, HttpStatusCodes.NOT_FOUND);
    }

    const venueEvents = await db
      .select()
      .from(event)
      .where(eq(event.venueId, record.id))
      .orderBy(desc(event.startsAt))
      .limit(20);

    return c.json({ events: venueEvents, venue: record }, HttpStatusCodes.OK);
  });
