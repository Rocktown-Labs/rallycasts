import { createDb } from "@rallycaststv/db";
import { venueVisit } from "@rallycaststv/db/schema/domain";
import { and, count, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppEnv } from "../lib/types";

type VenuePresenceStub = DurableObjectStub & {
  getActiveUsers: () => Promise<{ enteredAt: string; userId: string }[]>;
};

export const venueAnalyticsRouter = new Hono<AppEnv>().get(
  "/:id/analytics",
  async (c) => {
    const venueId = c.req.param("id");
    const db = createDb(c.env.DB);

    // Get active users from Durable Object
    const venuePresence: DurableObjectNamespace = c.env.VENUE_PRESENCE;
    const doId = venuePresence.idFromName(venueId);
    const presence = venuePresence.get(doId) as VenuePresenceStub;
    const activeUsers = await presence.getActiveUsers();
    const activeCount = activeUsers.length;

    // Get today's visits
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

    // Get this week's visits
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

    // Get average duration
    const durations = await db
      .select({
        avgDuration: sql<number>`AVG(${venueVisit.durationMinutes})`,
      })
      .from(venueVisit)
      .where(
        and(
          eq(venueVisit.venueId, venueId),
          sql`${venueVisit.durationMinutes} IS NOT NULL`
        )
      );

    // Get peak hours (last 7 days)
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

    // Get peak days (last 30 days)
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
        activeUsers: activeUsers.map((activeUser) => ({
          enteredAt: activeUser.enteredAt,
          userId: activeUser.userId,
        })),
        avgDurationMinutes: Math.round(durations[0]?.avgDuration ?? 0),
        heatScore,
        peakDays: peakDays.map((d) => ({
          day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
            Number.parseInt(d.day, 10)
          ],
          visits: d.visits,
        })),
        peakHours: peakHours.map((h) => ({
          hour: `${h.hour}:00`,
          visits: h.visits,
        })),
        todayVisits: todayVisits[0]?.count ?? 0,
        weekVisits: weekVisits[0]?.count ?? 0,
      },
      HttpStatusCodes.OK
    );
  }
);
