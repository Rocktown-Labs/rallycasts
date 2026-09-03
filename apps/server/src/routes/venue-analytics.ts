import { createDb } from "@rallycaststv/db";
import { event, venue, venueVisit } from "@rallycaststv/db/schema/domain";
import { and, count, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { isPlatformAdminUser } from "../lib/admin";
import type { AppEnv } from "../lib/types";
import { requireAuth } from "../middleware/auth";

type VenuePresenceStub = DurableObjectStub & {
  getActiveUsers: () => Promise<{ enteredAt: string; userId: string }[]>;
};

export const venueAnalyticsRouter = new Hono<AppEnv>().get(
  "/:id/analytics",
  requireAuth,
  async (c) => {
    const venueId = c.req.param("id");
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    const [venueRecord] = await db
      .select({ createdByUserId: venue.createdByUserId })
      .from(venue)
      .where(eq(venue.id, venueId))
      .limit(1);

    if (!venueRecord) {
      return c.json({ message: "Venue not found" }, HttpStatusCodes.NOT_FOUND);
    }

    const isAdmin = await isPlatformAdminUser(db, authUser.id);
    let canView = isAdmin || venueRecord.createdByUserId === authUser.id;
    if (!canView) {
      const [eventRecord] = await db
        .select({ id: event.id })
        .from(event)
        .where(
          and(
            eq(event.venueId, venueId),
            eq(event.organizerUserId, authUser.id)
          )
        )
        .limit(1);
      canView = Boolean(eventRecord);
    }
    if (!canView) {
      return c.json({ message: "Forbidden" }, HttpStatusCodes.FORBIDDEN);
    }

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

    const venuePresence: DurableObjectNamespace = c.env.VENUE_PRESENCE;
    const doId = venuePresence.idFromName(venueId);
    const presence = venuePresence.get(doId) as VenuePresenceStub;
    const activeUsers = await presence.getActiveUsers();
    const activeCount = activeUsers.length;

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
      .orderBy(sql`visits DESC`)
      .limit(5);

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
      .orderBy(sql`visits DESC`);

    const heatScore = Math.min(
      100,
      Math.round(
        activeCount * 5 +
          (todayVisits[0]?.count ?? 0) * 2 +
          (weekVisits[0]?.count ?? 0) * 0.5
      )
    );

    return c.json(
      {
        activeCount,
        avgDurationMinutes: Math.round(durations[0]?.avgDuration ?? 0),
        heatScore,
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
