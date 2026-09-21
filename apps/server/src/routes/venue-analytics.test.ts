import { createDb } from "@rallycaststv/db";
import { user } from "@rallycaststv/db/schema/auth";
import { venue, venueVisit } from "@rallycaststv/db/schema/domain";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

import app from "../index";

describe("venue analytics route", () => {
  it("returns authentic analytics, peak hours, and peak days for a venue", async () => {
    const db = createDb(env.DB);
    const testVenueId = `venue-analytics-${crypto.randomUUID()}`;
    const testUserId1 = `user-${crypto.randomUUID()}`;
    const testUserId2 = `user-${crypto.randomUUID()}`;

    await db.insert(user).values([
      {
        email: `${testUserId1}@example.com`,
        emailVerified: true,
        id: testUserId1,
        name: "Analytics Player 1",
      },
      {
        email: `${testUserId2}@example.com`,
        emailVerified: true,
        id: testUserId2,
        name: "Analytics Player 2",
      },
    ]);

    await db.insert(venue).values({
      id: testVenueId,
      latitude: 35.25,
      longitude: -91.73,
      name: "Berryhill Park Pickleball Courts",
      source: "rallycasts",
      venueType: "park",
    });

    const now = Date.now();
    await db.insert(venueVisit).values([
      {
        durationMinutes: 45,
        enteredAt: new Date(now - 1000 * 60 * 30),
        id: crypto.randomUUID(),
        source: "checkin",
        userId: testUserId1,
        venueId: testVenueId,
      },
      {
        durationMinutes: 60,
        enteredAt: new Date(now - 1000 * 60 * 60 * 2),
        id: crypto.randomUUID(),
        source: "geofence",
        userId: testUserId2,
        venueId: testVenueId,
      },
    ]);

    const response = await app.request(
      `/api/v1/venues/${testVenueId}/analytics`,
      {},
      env
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      activeCount: number;
      avgDurationMinutes: number;
      heatScore: number;
      isCheckedIn: boolean;
      peakDays: { day: string; visits: number }[];
      peakHours: { hour: string; visits: number }[];
      todayVisits: number;
      weekVisits: number;
    };

    expect(body).toBeDefined();
    expect(body.todayVisits).toBeGreaterThanOrEqual(2);
    expect(body.weekVisits).toBeGreaterThanOrEqual(2);
    expect(Array.isArray(body.peakHours)).toBe(true);
    expect(Array.isArray(body.peakDays)).toBe(true);
    expect(typeof body.heatScore).toBe("number");
  });

  it("returns 404 if venue does not exist", async () => {
    const response = await app.request(
      "/api/v1/venues/non-existent-venue-id/analytics",
      {},
      { ...env, GOOGLE_PLACES_API_KEY: "" }
    );
    expect(response.status).toBe(404);
  });
});
