import { zValidator } from "@hono/zod-validator";
import { createDb } from "@rallycaststv/db";
import { event, venue, venueVisit } from "@rallycaststv/db/schema/domain";
import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { z } from "zod";

import { EARTH_RADIUS_MILES } from "../lib/geo";
import { syncVenueGeofence } from "../lib/geofence-sync";
import { toPublicVenue } from "../lib/public-data";
import { syncVenueSearchDocument } from "../lib/search-index";
import type { AppEnv } from "../lib/types";
import { findOrCreateVenueFromGooglePlace } from "../lib/venues";
import { requireAuth } from "../middleware/auth";

const searchPattern = (query: string | undefined) => `%${query ?? ""}%`;

const venueSchema = z.object({
  addressLine1: z.string().max(200).optional(),
  addressLine2: z.string().max(200).optional(),
  city: z.string().max(120).optional(),
  country: z.string().length(2).default("US"),
  courtCount: z.number().int().min(0).max(500).optional(),
  description: z.string().max(2000).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  name: z.string().trim().min(1).max(160),
  postalCode: z.string().max(20).optional(),
  state: z.string().max(80).optional(),
  venueType: z.enum(["park", "club", "facility", "other"]).default("park"),
});

export const venuesRouter = new Hono<AppEnv>()
  .post("/", requireAuth, zValidator("json", venueSchema), async (c) => {
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    const newVenue = await db
      .insert(venue)
      .values({
        ...c.req.valid("json"),
        createdByUserId: authUser.id,
        id: crypto.randomUUID(),
      })
      .returning();

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
    if (newVenue[0]) {
      await syncVenueSearchDocument(
        () => c.executionCtx,
        db,
        c.env,
        newVenue[0]
      );
    }

    return c.json(
      { venue: newVenue[0] ? toPublicVenue(newVenue[0]) : null },
      HttpStatusCodes.CREATED
    );
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

    return c.json({ venues: venues.map(toPublicVenue) }, HttpStatusCodes.OK);
  })
  .get("/:id", async (c) => {
    const db = createDb(c.env.DB);
    const rawId = c.req.param("id");
    const cleanGoogleId = rawId.startsWith("google:") ? rawId.slice(7) : rawId;

    let [record] = await db
      .select()
      .from(venue)
      .where(or(eq(venue.id, rawId), eq(venue.googlePlaceId, cleanGoogleId)))
      .limit(1);

    if (!record && c.env.GOOGLE_PLACES_API_KEY && cleanGoogleId.length > 5) {
      try {
        record = await findOrCreateVenueFromGooglePlace({
          db,
          env: c.env,
          getExecutionContext: () => {
            try {
              return c.executionCtx;
            } catch {
              // Ignore
            }
          },
          placeId: cleanGoogleId,
        });
      } catch (error) {
        console.warn(
          "Failed to find or create venue from Google Place:",
          error
        );
      }
    }

    if (!record) {
      return c.json({ message: "Venue not found" }, HttpStatusCodes.NOT_FOUND);
    }

    const venueEvents = await db
      .select()
      .from(event)
      .where(and(eq(event.venueId, record.id), eq(event.status, "published")))
      .orderBy(desc(event.startsAt))
      .limit(20);

    return c.json(
      { events: venueEvents, venue: toPublicVenue(record) },
      HttpStatusCodes.OK
    );
  })
  .post("/:id/check-in", requireAuth, async (c) => {
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    const rawId = c.req.param("id");
    const cleanGoogleId = rawId.startsWith("google:") ? rawId.slice(7) : rawId;

    let [record] = await db
      .select()
      .from(venue)
      .where(or(eq(venue.id, rawId), eq(venue.googlePlaceId, cleanGoogleId)))
      .limit(1);

    if (!record && c.env.GOOGLE_PLACES_API_KEY && cleanGoogleId.length > 5) {
      try {
        record = await findOrCreateVenueFromGooglePlace({
          db,
          env: c.env,
          getExecutionContext: () => {
            try {
              return c.executionCtx;
            } catch {
              // Ignore
            }
          },
          placeId: cleanGoogleId,
          userId: authUser.id,
        });
      } catch (error) {
        console.warn("Failed to find or create venue during check-in:", error);
      }
    }

    if (!record) {
      return c.json({ message: "Venue not found" }, HttpStatusCodes.NOT_FOUND);
    }

    let activeCount = 1;
    if (c.env.VENUE_PRESENCE) {
      try {
        const venuePresence: DurableObjectNamespace = c.env.VENUE_PRESENCE;
        const doId = venuePresence.idFromName(record.id);
        const presence = venuePresence.get(doId) as DurableObjectStub & {
          userEntered: (userId: string) => Promise<{ count: number }>;
        };
        const result = await presence.userEntered(authUser.id);
        activeCount = result.count;
      } catch (error) {
        console.warn("Failed to update VenuePresence DO:", error);
      }
    }

    const visitId = crypto.randomUUID();
    await db.insert(venueVisit).values({
      enteredAt: new Date(),
      id: visitId,
      userId: authUser.id,
      venueId: record.id,
    });

    return c.json(
      {
        activeCount,
        isCheckedIn: true,
        message: `Checked in to ${record.name}`,
        venueId: record.id,
      },
      HttpStatusCodes.OK
    );
  })
  .post("/:id/check-out", requireAuth, async (c) => {
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    const rawId = c.req.param("id");
    const cleanGoogleId = rawId.startsWith("google:") ? rawId.slice(7) : rawId;

    const [record] = await db
      .select()
      .from(venue)
      .where(or(eq(venue.id, rawId), eq(venue.googlePlaceId, cleanGoogleId)))
      .limit(1);

    if (!record) {
      return c.json({ message: "Venue not found" }, HttpStatusCodes.NOT_FOUND);
    }

    let activeCount = 0;
    if (c.env.VENUE_PRESENCE) {
      try {
        const venuePresence: DurableObjectNamespace = c.env.VENUE_PRESENCE;
        const doId = venuePresence.idFromName(record.id);
        const presence = venuePresence.get(doId) as DurableObjectStub & {
          userExited: (userId: string) => Promise<{ count: number }>;
        };
        const result = await presence.userExited(authUser.id);
        activeCount = result.count;
      } catch (error) {
        console.warn("Failed to update VenuePresence DO on checkout:", error);
      }
    }

    const [latestVisit] = await db
      .select()
      .from(venueVisit)
      .where(
        and(
          eq(venueVisit.userId, authUser.id),
          eq(venueVisit.venueId, record.id)
        )
      )
      .orderBy(desc(venueVisit.enteredAt))
      .limit(1);

    if (latestVisit) {
      const exitedAt = new Date();
      const durationMinutes = latestVisit.enteredAt
        ? Math.round(
            (exitedAt.getTime() - new Date(latestVisit.enteredAt).getTime()) /
              60_000
          )
        : 0;

      await db
        .update(venueVisit)
        .set({ durationMinutes, exitedAt })
        .where(eq(venueVisit.id, latestVisit.id));
    }

    return c.json(
      {
        activeCount,
        isCheckedIn: false,
        message: `Checked out from ${record.name}`,
        venueId: record.id,
      },
      HttpStatusCodes.OK
    );
  });
