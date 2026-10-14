import { createDb } from "@rallycaststv/db";
import { user } from "@rallycaststv/db/schema/auth";
import {
  event,
  eventMatch,
  eventRegistration,
} from "@rallycaststv/db/schema/domain";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { runMaintenance } from "./maintenance";

const db = createDb(env.DB);

const insertUser = async (id: string, email: string) => {
  await db.insert(user).values({
    email,
    emailVerified: true,
    id,
    name: id,
  });
};

interface SeedEventInput {
  endsAt?: Date | null;
  id: string;
  matchStatus?: "completed" | "scheduled";
  organizerId: string;
  startsAt: Date;
  status: "cancelled" | "completed" | "draft" | "published";
}

const insertEvent = async (input: SeedEventInput) => {
  await db.insert(event).values({
    endsAt: input.endsAt ?? null,
    id: input.id,
    name: `Event ${input.id}`,
    organizerUserId: input.organizerId,
    startsAt: input.startsAt,
    status: input.status,
  });
  if (input.matchStatus) {
    await db.insert(eventMatch).values({
      eventId: input.id,
      id: `match-${input.id}`,
      round: 1,
      scheduledAt: input.startsAt,
      status: input.matchStatus,
    });
  }
};

const insertRegistration = async (eventId: string, userId: string) => {
  await db.insert(eventRegistration).values({
    eventId,
    id: `reg-${eventId}-${userId}`,
    userId,
  });
};

describe("runMaintenance", () => {
  it("archives stale published events by their match history", async () => {
    const organizerId = "organizer-1";
    await insertUser(organizerId, "organizer-1@example.com");
    const longAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

    await insertEvent({
      endsAt: new Date(longAgo.getTime() + 2 * 60 * 60 * 1000),
      id: "stale-with-matches",
      matchStatus: "completed",
      organizerId,
      startsAt: longAgo,
      status: "published",
    });
    await insertEvent({
      id: "stale-without-matches",
      matchStatus: "scheduled",
      organizerId,
      startsAt: longAgo,
      status: "published",
    });
    await insertEvent({
      id: "fresh-upcoming",
      organizerId,
      startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: "published",
    });

    const result = await runMaintenance(db);

    expect(result.archivedAsCompleted).toBe(1);
    expect(result.archivedAsCancelled).toBe(1);

    const statuses = await db
      .select({ id: event.id, status: event.status })
      .from(event);
    const statusById = new Map(statuses.map((row) => [row.id, row.status]));
    expect(statusById.get("stale-with-matches")).toBe("completed");
    expect(statusById.get("stale-without-matches")).toBe("cancelled");
    expect(statusById.get("fresh-upcoming")).toBe("published");
  });

  it("leaves recently started events alone", async () => {
    const organizerId = "organizer-2";
    await insertUser(organizerId, "organizer-2@example.com");
    await insertEvent({
      id: "just-started",
      organizerId,
      startsAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      status: "published",
    });

    await runMaintenance(db);

    const [record] = await db
      .select({ status: event.status })
      .from(event)
      .where(eq(event.id, "just-started"));
    expect(record?.status).toBe("published");
  });

  it("purges demo data once the host event is no longer published", async () => {
    const organizerId = "organizer-3";
    await insertUser(organizerId, "organizer-3@example.com");
    await insertUser("demo-vance_pickle", "vance_pickle@rallycasts.demo");
    await insertUser("demo-sarah_smash", "sarah_smash@rallycasts.demo");
    await insertUser("demo-elena_drive", "elena_drive@rallycasts.demo");

    // Cancelled event with demo rows: everything demo gets purged.
    await insertEvent({
      id: "cancelled-test",
      organizerId,
      startsAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      status: "cancelled",
    });
    await insertRegistration("cancelled-test", "demo-vance_pickle");
    await db.insert(eventMatch).values({
      eventId: "cancelled-test",
      id: "match-cancelled-demo",
      playerOneUserId: "demo-vance_pickle",
      playerTwoUserId: "demo-sarah_smash",
      round: 1,
      status: "completed",
      winnerUserId: "demo-sarah_smash",
    });

    // Published event with demo rows: untouched until it is archived.
    await insertEvent({
      id: "live-test",
      organizerId,
      startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: "published",
    });
    await insertRegistration("live-test", "demo-elena_drive");

    const result = await runMaintenance(db);

    expect(result.deletedDemoMatches).toBe(1);
    expect(result.deletedDemoRegistrations).toBe(1);
    // vance and smash lost their last references; elena is still registered
    // on a published event, so her account stays.
    expect(result.deletedDemoUsers).toBe(2);

    const allUsers = await db.select({ id: user.id }).from(user);
    const userIds = allUsers.map((row) => row.id);
    expect(userIds).not.toContain("demo-vance_pickle");
    expect(userIds).not.toContain("demo-sarah_smash");
    expect(userIds).toContain("demo-elena_drive");

    const liveRegistrations = await db
      .select({ id: eventRegistration.id })
      .from(eventRegistration)
      .where(eq(eventRegistration.eventId, "live-test"));
    expect(liveRegistrations).toHaveLength(1);
  });

  it("keeps the demo identity that shares the organizer's account shape", async () => {
    // The seed-demo fallback creates a "demo-cgstewart" user with a real
    // email domain; the purge targets @rallycasts.demo accounts only.
    await insertUser("demo-cgstewart", "cgstewart@rallycasts.com");
    await insertUser("organizer-4", "organizer-4@example.com");
    await insertEvent({
      id: "cancelled-legacy",
      organizerId: "organizer-4",
      startsAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
      status: "cancelled",
    });
    await insertRegistration("cancelled-legacy", "demo-cgstewart");

    const result = await runMaintenance(db);

    expect(result.deletedDemoRegistrations).toBe(1);
    expect(result.deletedDemoUsers).toBe(0);
    const allUsers = await db.select({ id: user.id }).from(user);
    const userIds = allUsers.map((row) => row.id);
    expect(userIds).toContain("demo-cgstewart");
  });

  it("purges demo rows across every terminal event in a single run", async () => {
    // Regression guard: the purge must not be a capped window over a
    // non-shrinking candidate set — demo data on ANY terminal event is
    // reached on the first run.
    const organizerId = "organizer-5";
    await insertUser(organizerId, "organizer-5@example.com");
    const batch = [0, 1, 2, 3, 4];
    await db.insert(user).values(
      batch.map((index) => ({
        email: `batch_${index}@rallycasts.demo`,
        emailVerified: true,
        id: `demo-batch_${index}`,
        name: `demo-batch_${index}`,
      }))
    );
    await db.insert(event).values(
      batch.map((index) => ({
        id: `cancelled-batch-${index}`,
        name: `Event cancelled-batch-${index}`,
        organizerUserId: organizerId,
        startsAt: new Date(Date.now() - (index + 1) * 24 * 60 * 60 * 1000),
        status: "cancelled" as const,
      }))
    );
    await db.insert(eventRegistration).values(
      batch.map((index) => ({
        eventId: `cancelled-batch-${index}`,
        id: `reg-batch-${index}`,
        userId: `demo-batch_${index}`,
      }))
    );

    const result = await runMaintenance(db);

    expect(result.deletedDemoRegistrations).toBe(5);
    expect(result.deletedDemoUsers).toBe(5);
    const remaining = await db
      .select({ id: eventRegistration.id })
      .from(eventRegistration);
    expect(remaining).toHaveLength(0);
  });
});
