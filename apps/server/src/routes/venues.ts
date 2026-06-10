import { createDb } from "@rallycaststv/db";
import { event, venue } from "@rallycaststv/db/schema/domain";
import { desc, eq, like, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { EARTH_RADIUS_MILES } from "../lib/geo";
import { syncVenueGeofence } from "../lib/geofence-sync";
import type { AppEnv } from "../lib/types";

const searchPattern = (query: string | undefined) => `%${query ?? ""}%`;

export const venuesRouter = new Hono<AppEnv>()
  .post("/", async (c) => {
    const db = createDb(c.env.DB);
    const body = await c.req.json();
    const newVenue = await db.insert(venue).values(body).returning();

    // Sync to Radar geofences
    if (c.env.RADAR_SECRET_KEY && newVenue[0]) {
      try {
        await syncVenueGeofence(c.env.RADAR_SECRET_KEY, {
          courtCount: newVenue[0].courtCount ?? 0,
          id: newVenue[0].id,
          latitude: newVenue[0].latitude,
          longitude: newVenue[0].longitude,
          name: newVenue[0].name,
        });
      } catch (error) {
        console.error("Failed to sync venue to Radar:", error);
      }
    }

    return c.json({ venue: newVenue[0] }, HttpStatusCodes.CREATED);
  })
  .get("/", async (c) => {
    const db = createDb(c.env.DB);
    const query = c.req.query("q");
    const latParam = c.req.query("lat");
    const lngParam = c.req.query("lng");
    const radiusParam = c.req.query("radius");

    const lat = latParam ? Number.parseFloat(latParam) : undefined;
    const lng = lngParam ? Number.parseFloat(lngParam) : undefined;
    const radius = radiusParam ? Number.parseFloat(radiusParam) : 50;

    const hasLocation =
      lat !== undefined &&
      !Number.isNaN(lat) &&
      lng !== undefined &&
      !Number.isNaN(lng);

    let venues: (typeof venue.$inferSelect)[];

    if (hasLocation) {
      const distanceExpr = sql<number>`
        ${EARTH_RADIUS_MILES} * 2 * ASIN(
          SQRT(
            POWER(SIN((${lat} * ${Math.PI} / 180 - ${venue.latitude} * ${Math.PI} / 180) / 2), 2) +
            COS(${lat} * ${Math.PI} / 180) * COS(${venue.latitude} * ${Math.PI} / 180) *
            POWER(SIN((${lng} * ${Math.PI} / 180 - ${venue.longitude} * ${Math.PI} / 180) / 2), 2)
          )
        )
      `;

      const conditions = [
        query
          ? or(
              like(venue.name, searchPattern(query)),
              like(venue.city, searchPattern(query)),
              like(venue.state, searchPattern(query))
            )
          : undefined,
        sql`${distanceExpr} <= ${radius}`,
      ].filter(Boolean);

      venues = await db
        .select()
        .from(venue)
        .where(
          conditions.length > 0 ? sql.join(conditions, sql` AND `) : undefined
        )
        .orderBy(sql`${distanceExpr} ASC`)
        .limit(50);
    } else {
      venues = await db
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
    }

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
