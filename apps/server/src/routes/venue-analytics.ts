import { createDb } from "@rallycaststv/db";
import { venue, venueVisit } from "@rallycaststv/db/schema/domain";
import { and, count, desc, eq, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppEnv } from "../lib/types";
import { findOrCreateVenueFromGooglePlace } from "../lib/venues";
import { optionalAuth } from "../middleware/auth";

type VenuePresenceStub = DurableObjectStub & {
  getActiveUsers: () => Promise<{ enteredAt: string; userId: string }[]>;
};

export const venueAnalyticsRouter = new Hono<AppEnv>().get(
  "/:id/analytics",
  optionalAuth,
  // oxlint-disable-next-line complexity -- Handler aggregates real presence, visits, peak hours and peak days.
  async (c) => {
    const rawId = c.req.param("id");
    const cleanGoogleId = rawId.startsWith("google:") ? rawId.slice(7) : rawId;
    const db = createDb(c.env.DB);
    const authUser = c.var.authSession?.user;

    let [venueRecord] = await db
      .select({ id: venue.id })
      .from(venue)
      .where(or(eq(venue.id, rawId), eq(venue.googlePlaceId, cleanGoogleId)))
      .limit(1);

    if (
      !venueRecord &&
      c.env.GOOGLE_PLACES_API_KEY &&
      cleanGoogleId.length > 5
    ) {
      try {
        const created = await findOrCreateVenueFromGooglePlace({
          db,
          env: c.env,
          getExecutionContext: () => {
            try {
              return c.executionCtx;
            } catch {
              // Unit-test requests may not provide an execution context.
            }
          },
          placeId: cleanGoogleId,
          userId: authUser?.id,
        });
        venueRecord = { id: created.id };
      } catch (error) {
        console.warn("Could not find or create venue for analytics:", error);
      }
    }

    if (!venueRecord) {
      return c.json({ message: "Venue not found" }, HttpStatusCodes.NOT_FOUND);
    }

    const venueId = venueRecord.id;

    const retentionCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const retentionTask = (async () => {
      try {
        await db
          .delete(venueVisit)
          .where(sql`${venueVisit.createdAt} < ${retentionCutoff.getTime()}`);
      } catch (error) {
        console.error(
          JSON.stringify({
            event: "venue_visit_retention_failed",
            message: error instanceof Error ? error.message : "unknown error",
          })
        );
      }
    })();
    try {
      c.executionCtx.waitUntil(retentionTask);
    } catch {
      // Unit-test requests may not provide an execution context.
    }

    let activeUsers: { enteredAt: string; userId: string }[] = [];
    if (c.env.VENUE_PRESENCE) {
      try {
        const venuePresence: DurableObjectNamespace = c.env.VENUE_PRESENCE;
        const doId = venuePresence.idFromName(venueId);
        const presence = venuePresence.get(doId) as VenuePresenceStub;
        activeUsers = await presence.getActiveUsers();
      } catch (error) {
        console.warn("Failed to get venue active presence:", error);
      }
    }

    const activeCount = activeUsers.length;
    const isCheckedIn = Boolean(
      authUser && activeUsers.some((u) => u.userId === authUser.id)
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayVisits = await db
      .select({ count: count() })
      .from(venueVisit)
      .where(
        and(
          eq(venueVisit.venueId, venueId),
          sql`${venueVisit.enteredAt} >= ${today.getTime()}`
        )
      );

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);
    const weekVisits = await db
      .select({ count: count() })
      .from(venueVisit)
      .where(
        and(
          eq(venueVisit.venueId, venueId),
          sql`${venueVisit.enteredAt} >= ${weekStart.getTime()}`
        )
      );

    const durations = await db
      .select({ avgDuration: sql<number>`AVG(${venueVisit.durationMinutes})` })
      .from(venueVisit)
      .where(
        and(
          eq(venueVisit.venueId, venueId),
          sql`${venueVisit.durationMinutes} IS NOT NULL`
        )
      );

    const peakHours = await db
      .select({
        hour: sql<number>`strftime('%H', ${venueVisit.enteredAt} / 1000, 'unixepoch')`,
        visits: count(),
      })
      .from(venueVisit)
      .where(
        and(
          eq(venueVisit.venueId, venueId),
          sql`${venueVisit.enteredAt} >= ${weekStart.getTime()}`
        )
      )
      .groupBy(sql`strftime('%H', ${venueVisit.enteredAt} / 1000, 'unixepoch')`)
      .orderBy(desc(count()))
      .limit(8);

    const monthStart = new Date();
    monthStart.setDate(monthStart.getDate() - 30);
    monthStart.setHours(0, 0, 0, 0);
    const peakDays = await db
      .select({
        day: sql<string>`strftime('%w', ${venueVisit.enteredAt} / 1000, 'unixepoch')`,
        visits: count(),
      })
      .from(venueVisit)
      .where(
        and(
          eq(venueVisit.venueId, venueId),
          sql`${venueVisit.enteredAt} >= ${monthStart.getTime()}`
        )
      )
      .groupBy(sql`strftime('%w', ${venueVisit.enteredAt} / 1000, 'unixepoch')`)
      .orderBy(desc(count()));

    const rawHeatScore = Math.min(
      100,
      Math.round(
        activeCount * 25 +
          (todayVisits[0]?.count ?? 0) * 10 +
          (weekVisits[0]?.count ?? 0) * 2
      )
    );

    return c.json(
      {
        activeCount,
        avgDurationMinutes: Math.round(durations[0]?.avgDuration ?? 0),
        heatScore: rawHeatScore,
        isCheckedIn,
        peakDays: peakDays.map((record) => ({
          day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
            Number.parseInt(record.day, 10)
          ],
          visits: record.visits,
        })),
        peakHours: peakHours.map((record) => ({
          hour: `${record.hour}:00`,
          visits: record.visits,
        })),
        todayVisits: todayVisits[0]?.count ?? 0,
        weekVisits: weekVisits[0]?.count ?? 0,
      },
      HttpStatusCodes.OK
    );
  }
);
