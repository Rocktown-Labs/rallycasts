import { zValidator } from "@hono/zod-validator";
import { createDb } from "@rallycaststv/db";
import { user as userTable } from "@rallycaststv/db/schema/auth";
import {
  event,
  eventMatch,
  eventPayment,
  eventRegistration,
  organizationMember,
  userProfile,
} from "@rallycaststv/db/schema/domain";
import { and, asc, desc, eq, inArray, ne, or } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { Hono } from "hono";
import type { Context } from "hono";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { z } from "zod";

import { isPlatformAdminUser } from "../lib/admin";
import { enqueueEventActivity } from "../lib/event-activity";
import type { EventActivityMessage } from "../lib/event-activity";
import { createId } from "../lib/ids";
import { createNotification } from "../lib/notifications";
import {
  removeSearchDocument,
  scheduleSearchDocumentIndex,
  upsertSearchDocument,
} from "../lib/search-index";
import { sendTournamentNotification } from "../lib/tournament-notifications";
import type { AppEnv } from "../lib/types";
import { findOrCreateVenueFromGooglePlace } from "../lib/venues";
import { requireAuth } from "../middleware/auth";

const eventFields = z.object({
  bracketType: z
    .enum(["single_elimination", "round_robin"])
    .default("single_elimination"),
  capacity: z.number().int().positive().optional(),
  checkInMinutes: z.number().int().min(0).max(240).default(30),
  courtLabels: z.array(z.string().trim().min(1).max(40)).max(50).default([]),
  currency: z.literal("usd").default("usd"),
  description: z.string().max(2000).optional(),
  endsAt: z.coerce.date().optional(),
  entryFeeCents: z.number().int().min(0).max(1_000_000).default(0),
  eventType: z
    .enum(["open_play", "tournament", "clinic", "league"])
    .default("open_play"),
  googlePlaceId: z.string().min(1).optional(),
  name: z.string().min(1).max(160),
  organizationId: z.string().min(1).optional(),
  refundPolicy: z.string().max(1000).optional(),
  registrationDeadline: z.coerce.date().optional(),
  startsAt: z.coerce.date(),
  status: z
    .enum(["draft", "published", "cancelled", "completed"])
    .default("draft"),
  venueId: z.string().min(1).optional(),
});

const eventSchema = eventFields
  .refine((data) => !data.endsAt || data.endsAt > data.startsAt, {
    message: "Event must end after it starts.",
    path: ["endsAt"],
  })
  .refine(
    (data) =>
      data.status !== "published" ||
      Boolean(data.venueId || data.googlePlaceId),
    {
      message: "Published events require a validated location.",
      path: ["googlePlaceId"],
    }
  );

const updateEventSchema = eventFields
  .omit({ googlePlaceId: true, organizationId: true })
  .partial()
  .refine(
    (data) => !data.endsAt || !data.startsAt || data.endsAt > data.startsAt,
    {
      message: "Event must end after it starts.",
      path: ["endsAt"],
    }
  );

const generateBracketSchema = z.object({
  force: z.boolean().default(false),
});

const updateRegistrationSchema = z.object({
  seed: z.number().int().positive().nullable().optional(),
  status: z
    .enum(["registered", "waitlisted", "cancelled", "checked_in"])
    .optional(),
});

const updateMatchSchema = z
  .object({
    courtLabel: z.string().max(80).optional(),
    playerOneScore: z.number().int().min(0).optional(),
    playerTwoScore: z.number().int().min(0).optional(),
    scheduledAt: z.coerce.date().optional(),
    status: z
      .enum(["scheduled", "in_progress", "completed", "cancelled"])
      .optional(),
    winnerUserId: z.string().min(1).optional(),
  })
  .refine((data) => data.status !== "completed" || data.winnerUserId, {
    message: "Completed matches require a winner.",
    path: ["winnerUserId"],
  });

const STRIPE_REQUEST_TIMEOUT_MS = 10_000;
const STRIPE_API_VERSION = "2026-07-29.dahlia";

const submitScoreSchema = z.object({
  note: z.string().max(500).optional(),
  playerOneScore: z.number().int().min(0),
  playerTwoScore: z.number().int().min(0),
  winnerUserId: z.string().min(1),
});

const playerOneTable = alias(userTable, "player_one");
const playerTwoTable = alias(userTable, "player_two");
const winnerTable = alias(userTable, "winner");

type EventCoordinatorStub = DurableObjectStub & {
  getSnapshot: (eventId: string) => Promise<unknown>;
  joinEvent: (input: {
    eventId: string;
    userId: string;
  }) => Promise<
    | { error: "Event not found" }
    | { registration: typeof eventRegistration.$inferSelect }
  >;
  submitScore: (input: {
    eventId: string;
    matchId: string;
    note?: string;
    playerOneScore: number;
    playerTwoScore: number;
    submittedByUserId: string;
    winnerUserId: string;
  }) => Promise<
    | { error: string }
    | {
        status: "confirmed" | "disputed" | "pending";
        submission: Record<string, unknown>;
      }
  >;
};

const getEventCoordinator = (
  namespace: DurableObjectNamespace,
  eventId: string
): EventCoordinatorStub => {
  const id = namespace.idFromName(eventId);
  return namespace.get(id) as unknown as EventCoordinatorStub;
};

const getManageableEvent = async (
  db: ReturnType<typeof createDb>,
  eventId: string,
  userId: string
) => {
  const [record] = await db
    .select()
    .from(event)
    .where(eq(event.id, eventId))
    .limit(1);
  if (!record) {
    return null;
  }
  if (record.organizerUserId === userId) {
    return record;
  }
  if (!record.organizationId) {
    return null;
  }
  const [membership] = await db
    .select({ role: organizationMember.role })
    .from(organizationMember)
    .where(
      and(
        eq(organizationMember.organizationId, record.organizationId),
        eq(organizationMember.userId, userId)
      )
    )
    .limit(1);
  return membership && membership.role !== "editor" ? record : null;
};

const scheduleEventLifecycle = (
  queue: Queue<EventActivityMessage> | undefined,
  record: { id: string; startsAt: Date | string }
) => {
  const startsAt = new Date(record.startsAt);
  if (Number.isNaN(startsAt.getTime())) {
    return Promise.resolve([]);
  }

  const reminderAt = new Date(startsAt.getTime() - 30 * 60 * 1000);

  return Promise.all([
    enqueueEventActivity(queue, {
      deliverAt: reminderAt.toISOString(),
      eventId: record.id,
      type: "event.reminder",
    }),
    enqueueEventActivity(queue, {
      deliverAt: startsAt.toISOString(),
      eventId: record.id,
      type: "event.started",
    }),
  ]);
};

const waitUntil = (c: Context<AppEnv>, promise: Promise<unknown>) => {
  const task = runBackgroundTask(promise);
  try {
    c.executionCtx.waitUntil(task);
  } catch {
    void task;
  }
};

const runBackgroundTask = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error) {
    console.error("Background event task failed:", error);
  }
};

const refundCancelledEventPayments = async (
  db: ReturnType<typeof createDb>,
  eventId: string,
  eventName: string,
  stripeSecretKey: string
) => {
  const payments = await db
    .select({ payment: eventPayment, registration: eventRegistration })
    .from(eventPayment)
    .innerJoin(
      eventRegistration,
      eq(eventPayment.registrationId, eventRegistration.id)
    )
    .where(
      and(
        eq(eventPayment.eventId, eventId),
        eq(eventPayment.status, "succeeded")
      )
    );
  const refundErrors: string[] = [];
  for (const { payment, registration } of payments) {
    if (!payment.stripePaymentIntentId) {
      refundErrors.push(payment.id);
      continue;
    }
    let response: Response;
    try {
      // oxlint-disable-next-line eslint/no-await-in-loop -- Stripe refund flow: per-payment transactional updates, sequential to respect API limits
      response = await fetch("https://api.stripe.com/v1/refunds", {
        body: new URLSearchParams({
          payment_intent: payment.stripePaymentIntentId,
        }),
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "Idempotency-Key": `event-cancel-refund/${payment.id}`,
          "Stripe-Version": STRIPE_API_VERSION,
        },
        method: "POST",
        signal: AbortSignal.timeout(STRIPE_REQUEST_TIMEOUT_MS),
      });
    } catch {
      refundErrors.push(payment.id);
      continue;
    }
    if (!response.ok) {
      refundErrors.push(payment.id);
      continue;
    }
    // oxlint-disable-next-line eslint/no-await-in-loop -- Stripe refund flow: per-payment transactional updates, sequential to respect API limits
    const refund = (await response.json()) as { id?: unknown };
    if (typeof refund.id !== "string") {
      refundErrors.push(payment.id);
      continue;
    }
    // oxlint-disable-next-line eslint/no-await-in-loop -- Stripe refund flow: per-payment transactional updates, sequential to respect API limits
    const [refundedPayment] = await db
      .update(eventPayment)
      .set({
        status: "refunded",
        stripeRefundId: refund.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(eventPayment.id, payment.id),
          eq(eventPayment.status, "succeeded")
        )
      )
      .returning({ id: eventPayment.id });
    if (!refundedPayment) {
      continue;
    }
    // oxlint-disable-next-line eslint/no-await-in-loop -- Stripe refund flow: per-payment transactional updates, sequential to respect API limits
    await db
      .update(eventRegistration)
      .set({
        paymentStatus: "refunded",
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(eq(eventRegistration.id, registration.id));
    // oxlint-disable-next-line eslint/no-await-in-loop -- Stripe refund flow: per-payment transactional updates, sequential to respect API limits
    await createNotification(db, {
      body: `${eventName} was cancelled, so your registration was refunded in full.`,
      entityId: eventId,
      entityType: "event",
      href: `/events/${eventId}`,
      title: "Tournament cancelled and refunded",
      type: "event",
      userId: registration.userId,
    });
  }
  if (refundErrors.length > 0) {
    throw new Error(
      `Stripe refunds failed for ${refundErrors.length} registration(s)`
    );
  }
};

const SEVEN_DEMO_USERS = [
  {
    name: "Marcus Vance",
    skillLevel: "advanced" as const,
    username: "vance_pickle",
  },
  {
    name: "Sarah Jenkins",
    skillLevel: "pro" as const,
    username: "sarah_smash",
  },
  {
    name: "Dave Miller",
    skillLevel: "intermediate" as const,
    username: "dave_kitchen",
  },
  {
    name: "Elena Rostova",
    skillLevel: "advanced" as const,
    username: "elena_drive",
  },
  {
    name: "Carlos Mendez",
    skillLevel: "intermediate" as const,
    username: "carlos_lob",
  },
  {
    name: "Chloe Bennett",
    skillLevel: "advanced" as const,
    username: "chloe_drop",
  },
  { name: "Zach Taylor", skillLevel: "pro" as const, username: "zach_erne" },
] as const;

async function seedDemoUsers(
  db: ReturnType<typeof createDb>,
  requestedCount: number,
  authUser?: {
    displayUsername?: string | null;
    email?: string | null;
    id: string;
    name?: string | null;
    username?: string | null;
  }
): Promise<string[]> {
  const primaryUserId = authUser?.id ?? "demo-cgstewart";
  const primaryUserName =
    authUser?.name ||
    authUser?.displayUsername ||
    authUser?.username ||
    "CG Stewart";
  const primaryUserEmail = authUser?.email || "cgstewart@rallycasts.com";
  const primaryUserUsername = authUser?.username || "cgstewart";

  if (!authUser) {
    await db
      .insert(userTable)
      .values({
        createdAt: new Date(),
        displayUsername: primaryUserName,
        email: primaryUserEmail,
        emailVerified: true,
        id: primaryUserId,
        name: primaryUserName,
        updatedAt: new Date(),
        username: primaryUserUsername,
      })
      .onConflictDoNothing();
  }

  await db
    .insert(userProfile)
    .values({
      accountTier: "premium",
      homeCity: "Searcy",
      homeState: "AR",
      isPlayer: true,
      onboardingStatus: "complete",
      skillLevel: "pro",
      userId: primaryUserId,
    })
    .onConflictDoNothing();

  const rosterCount = Math.max(0, requestedCount - 1);
  const personas =
    rosterCount <= SEVEN_DEMO_USERS.length
      ? SEVEN_DEMO_USERS.slice(0, rosterCount)
      : [
          ...SEVEN_DEMO_USERS,
          ...Array.from(
            { length: rosterCount - SEVEN_DEMO_USERS.length },
            (_, index) => {
              const suffix = index + 8;
              return {
                name: `Demo Player ${suffix}`,
                skillLevel: "intermediate" as const,
                username: `demo_player_${suffix}`,
              };
            }
          ),
        ];
  const playerIds: string[] = [
    primaryUserId,
    ...personas.map((persona) => `demo-${persona.username}`),
  ];

  await db
    .insert(userTable)
    .values(
      personas.map((demoUser) => ({
        createdAt: new Date(),
        displayUsername: demoUser.name,
        email: `${demoUser.username}@rallycasts.demo`,
        emailVerified: true,
        id: `demo-${demoUser.username}`,
        name: demoUser.name,
        updatedAt: new Date(),
        username: demoUser.username,
      }))
    )
    .onConflictDoNothing();

  await db
    .insert(userProfile)
    .values(
      personas.map((demoUser) => ({
        accountTier: "free" as const,
        homeCity: "Searcy",
        homeState: "AR",
        isPlayer: true,
        onboardingStatus: "complete" as const,
        skillLevel: demoUser.skillLevel,
        userId: `demo-${demoUser.username}`,
      }))
    )
    .onConflictDoNothing();

  return playerIds;
}

/**
 * Single-elimination bracket for any player count. Round 1 pairs the
 * players (byes where the count is not a power of two, matching seeds
 * 1v-last style); later rounds are placeholders that fill in as winners
 * are recorded. Returns the first-round-1 match id for notifications.
 */
function buildDemoBracketMatches(
  eventId: string,
  courtLabels: string[],
  playerIds: string[]
) {
  const matches: (typeof eventMatch.$inferInsert)[] = [];
  const qf1Id = createId();
  const playerCount = playerIds.length;
  if (playerCount < 2) {
    return { matches, qf1Id };
  }

  // Pad the seed order to the next power of two so byes come naturally:
  // seed n faces seed (bracketSize + 1 - n), absent seeds are byes.
  const bracketSize = 2 ** Math.ceil(Math.log2(playerCount));
  const seedToPlayer = new Map<number, string>();
  for (const [index, playerId] of playerIds.entries()) {
    seedToPlayer.set(index + 1, playerId);
  }

  let firstRoundMatchCount = bracketSize / 2;
  let round = 1;
  const firstMatchId = qf1Id;
  while (firstRoundMatchCount >= 1) {
    for (let slot = 0; slot < firstRoundMatchCount; slot += 1) {
      const seedOne = slot + 1;
      const seedTwo = bracketSize + 1 - seedOne;
      const isByeRoundOne = round === 1 && seedOne === seedTwo;
      matches.push({
        courtLabel:
          courtLabels[slot % Math.max(courtLabels.length, 1)] ??
          `Court ${slot + 1}`,
        createdAt: new Date(),
        eventId,
        id: round === 1 && slot === 0 ? qf1Id : createId(),
        // Later rounds have no known players yet; they fill in as
        // winners are recorded.
        ...(round === 1
          ? {
              playerOneUserId: seedToPlayer.get(seedOne) ?? null,
              playerTwoUserId: isByeRoundOne
                ? null
                : (seedToPlayer.get(seedTwo) ?? null),
            }
          : {}),
        round,
        scheduledAt: new Date(
          Date.now() + slot * 600_000 + (round - 1) * 1_800_000
        ),
        status: "scheduled" as const,
      });
    }
    firstRoundMatchCount /= 2;
    round += 1;
  }

  return { firstMatchId, matches };
}

async function seedDemoTournamentData(
  db: ReturnType<typeof createDb>,
  eventId: string,
  playerCount: number,
  authUser?: {
    displayUsername?: string | null;
    email?: string | null;
    id: string;
    name?: string | null;
    username?: string | null;
  },
  env?: { DB: D1Database; RESEND_API_KEY?: string }
) {
  const playerIds = await seedDemoUsers(db, playerCount, authUser);

  await db.delete(eventMatch).where(eq(eventMatch.eventId, eventId));
  await db
    .delete(eventRegistration)
    .where(eq(eventRegistration.eventId, eventId));

  await db.insert(eventRegistration).values(
    playerIds.map((userId, index) => ({
      createdAt: new Date(Date.now() - (playerIds.length - index) * 60_000),
      eventId,
      id: createId(),
      seed: index + 1,
      status: "checked_in" as const,
      userId,
    }))
  );

  const [eventRecord] = await db
    .select()
    .from(event)
    .where(eq(event.id, eventId))
    .limit(1);

  const parsedCourts = JSON.parse(
    eventRecord?.courtLabelsJson ?? "[]"
  ) as string[];
  const courtLabels =
    parsedCourts.length >= 4
      ? parsedCourts
      : ["Court 1", "Court 2", "Court 3", "Center Court"];

  const { matches, firstMatchId } = buildDemoBracketMatches(
    eventId,
    courtLabels,
    playerIds
  );

  await db.insert(eventMatch).values(matches);
  await db
    .update(event)
    .set({ status: "published", updatedAt: new Date() })
    .where(eq(event.id, eventId));

  if (env) {
    await sendTournamentNotification({
      db,
      env,
      eventId,
      matchId: firstMatchId,
      targetUserId: playerIds[0],
      type: "match_ready",
    });
  }

  return { matchesCount: matches.length, playersCount: playerIds.length };
}

async function advanceDemoQuarterfinals(
  db: ReturnType<typeof createDb>,
  env: { DB: D1Database; RESEND_API_KEY?: string },
  eventId: string,
  authUser: { id: string },
  currentMatch: typeof eventMatch.$inferSelect
) {
  await db
    .update(eventMatch)
    .set({
      playerOneScore: currentMatch.playerOneUserId === authUser.id ? 11 : 7,
      playerTwoScore: currentMatch.playerOneUserId === authUser.id ? 7 : 11,
      status: "completed",
      updatedAt: new Date(),
      winnerUserId: authUser.id,
    })
    .where(eq(eventMatch.id, currentMatch.id));

  const otherQfs = await db
    .select()
    .from(eventMatch)
    .where(
      and(
        eq(eventMatch.eventId, eventId),
        eq(eventMatch.round, 1),
        ne(eventMatch.id, currentMatch.id)
      )
    )
    .orderBy(asc(eventMatch.createdAt));

  if (otherQfs[0]) {
    await db
      .update(eventMatch)
      .set({
        playerOneScore: 9,
        playerTwoScore: 11,
        status: "completed",
        updatedAt: new Date(),
        winnerUserId: otherQfs[0].playerTwoUserId,
      })
      .where(eq(eventMatch.id, otherQfs[0].id));
  }
  if (otherQfs[1]) {
    await db
      .update(eventMatch)
      .set({
        playerOneScore: 11,
        playerTwoScore: 6,
        status: "completed",
        updatedAt: new Date(),
        winnerUserId: otherQfs[1].playerOneUserId,
      })
      .where(eq(eventMatch.id, otherQfs[1].id));
  }
  if (otherQfs[2]) {
    await db
      .update(eventMatch)
      .set({
        playerOneScore: 11,
        playerTwoScore: 8,
        status: "completed",
        updatedAt: new Date(),
        winnerUserId: otherQfs[2].playerOneUserId,
      })
      .where(eq(eventMatch.id, otherQfs[2].id));
  }

  const sfMatches = await db
    .select()
    .from(eventMatch)
    .where(and(eq(eventMatch.eventId, eventId), eq(eventMatch.round, 2)))
    .orderBy(asc(eventMatch.createdAt));

  const sf1Opponent = otherQfs[0]?.playerTwoUserId ?? "demo-elena_drive";
  if (sfMatches[0]) {
    await db
      .update(eventMatch)
      .set({
        courtLabel: "Court 1",
        playerOneUserId: authUser.id,
        playerTwoUserId: sf1Opponent,
        status: "scheduled",
        updatedAt: new Date(),
      })
      .where(eq(eventMatch.id, sfMatches[0].id));
  }
  if (sfMatches[1]) {
    await db
      .update(eventMatch)
      .set({
        courtLabel: "Court 2",
        playerOneUserId: otherQfs[1]?.playerOneUserId ?? "demo-vance_pickle",
        playerTwoUserId: otherQfs[2]?.playerOneUserId ?? "demo-sarah_smash",
        status: "scheduled",
        updatedAt: new Date(),
      })
      .where(eq(eventMatch.id, sfMatches[1].id));
  }

  await sendTournamentNotification({
    db,
    env,
    eventId,
    matchId: sfMatches[0]?.id,
    targetUserId: authUser.id,
    type: "match_ready",
  });

  return {
    court: "Court 1",
    message:
      "Victory in Quarterfinals! Advanced to Semifinals. Match call notification and email sent.",
    nextRound: 2,
    opponent: "Elena Rostova",
    success: true,
  };
}

async function advanceDemoSemifinals(
  db: ReturnType<typeof createDb>,
  env: { DB: D1Database; RESEND_API_KEY?: string },
  eventId: string,
  authUser: { id: string },
  currentMatch: typeof eventMatch.$inferSelect
) {
  await db
    .update(eventMatch)
    .set({
      playerOneScore: currentMatch.playerOneUserId === authUser.id ? 11 : 8,
      playerTwoScore: currentMatch.playerOneUserId === authUser.id ? 8 : 11,
      status: "completed",
      updatedAt: new Date(),
      winnerUserId: authUser.id,
    })
    .where(eq(eventMatch.id, currentMatch.id));

  const otherSf = await db
    .select()
    .from(eventMatch)
    .where(
      and(
        eq(eventMatch.eventId, eventId),
        eq(eventMatch.round, 2),
        ne(eventMatch.id, currentMatch.id)
      )
    )
    .limit(1);

  if (otherSf[0]) {
    await db
      .update(eventMatch)
      .set({
        playerOneScore: 11,
        playerTwoScore: 9,
        status: "completed",
        updatedAt: new Date(),
        winnerUserId: otherSf[0].playerOneUserId ?? "demo-vance_pickle",
      })
      .where(eq(eventMatch.id, otherSf[0].id));
  }

  const [finalMatch] = await db
    .select()
    .from(eventMatch)
    .where(and(eq(eventMatch.eventId, eventId), eq(eventMatch.round, 3)))
    .limit(1);

  const finalOpponent = otherSf[0]?.playerOneUserId ?? "demo-vance_pickle";
  if (finalMatch) {
    await db
      .update(eventMatch)
      .set({
        courtLabel: "Center Court",
        playerOneUserId: authUser.id,
        playerTwoUserId: finalOpponent,
        status: "scheduled",
        updatedAt: new Date(),
      })
      .where(eq(eventMatch.id, finalMatch.id));
  }

  await sendTournamentNotification({
    db,
    env,
    eventId,
    matchId: finalMatch?.id,
    targetUserId: authUser.id,
    type: "match_ready",
  });

  return {
    court: "Center Court",
    message:
      "Victory in Semifinals! Advanced to the Championship Final! Match call notification and email sent.",
    nextRound: 3,
    opponent: "Marcus Vance",
    success: true,
  };
}

async function advanceDemoFinals(
  db: ReturnType<typeof createDb>,
  env: { DB: D1Database; RESEND_API_KEY?: string },
  eventId: string,
  authUser: {
    displayUsername?: string | null;
    id: string;
    name?: string | null;
    username?: string | null;
  },
  currentMatch: typeof eventMatch.$inferSelect
) {
  await db
    .update(eventMatch)
    .set({
      playerOneScore: currentMatch.playerOneUserId === authUser.id ? 11 : 9,
      playerTwoScore: currentMatch.playerOneUserId === authUser.id ? 9 : 11,
      status: "completed",
      updatedAt: new Date(),
      winnerUserId: authUser.id,
    })
    .where(eq(eventMatch.id, currentMatch.id));

  await db
    .update(event)
    .set({ status: "completed", updatedAt: new Date() })
    .where(eq(event.id, eventId));

  await sendTournamentNotification({
    db,
    env,
    eventId,
    targetUserId: authUser.id,
    type: "tournament_won",
  });

  return {
    champion: authUser.name || authUser.username || "CG Stewart",
    completed: true,
    message:
      "🏆 Championship Victory! You won the tournament! Celebration notification and email sent.",
    success: true,
  };
}

const isOrganizerUser = (db: ReturnType<typeof createDb>, userId: string) =>
  isPlatformAdminUser(db, userId);

export const eventsRouter = new Hono<AppEnv>()
  .get("/", async (c) => {
    const db = createDb(c.env.DB);
    const events = await db
      .select()
      .from(event)
      .where(eq(event.status, "published"))
      .orderBy(desc(event.startsAt))
      .limit(50);

    return c.json({ events }, HttpStatusCodes.OK);
  })
  .get("/mine", requireAuth, async (c) => {
    const db = createDb(c.env.DB);
    const { user } = c.var.authSession;
    const memberships = await db
      .select({ organizationId: organizationMember.organizationId })
      .from(organizationMember)
      .where(eq(organizationMember.userId, user.id));
    const organizationIds = memberships.map(
      (membership) => membership.organizationId
    );
    const manageableEventsWhere =
      organizationIds.length > 0
        ? or(
            eq(event.organizerUserId, user.id),
            inArray(event.organizationId, organizationIds)
          )
        : eq(event.organizerUserId, user.id);
    const events = await db
      .select()
      .from(event)
      .where(manageableEventsWhere)
      .orderBy(desc(event.startsAt))
      .limit(100);

    return c.json({ events }, HttpStatusCodes.OK);
  })
  .post("/", requireAuth, zValidator("json", eventSchema), async (c) => {
    const db = createDb(c.env.DB);
    const { user } = c.var.authSession;
    const data = c.req.valid("json");
    const { googlePlaceId, ...eventData } = data;
    if (data.organizationId) {
      const [membership] = await db
        .select({ role: organizationMember.role })
        .from(organizationMember)
        .where(
          and(
            eq(organizationMember.organizationId, data.organizationId),
            eq(organizationMember.userId, user.id)
          )
        )
        .limit(1);
      if (!membership || membership.role === "editor") {
        return c.json({ message: "Forbidden" }, HttpStatusCodes.FORBIDDEN);
      }
    }
    const isPlatformAdmin = await isPlatformAdminUser(db, user.id);

    if (!data.organizationId && !(await isOrganizerUser(db, user.id))) {
      return c.json(
        { message: "Organizer profile required" },
        HttpStatusCodes.FORBIDDEN
      );
    }
    let { venueId } = eventData;
    if (googlePlaceId) {
      try {
        const validatedVenue = await findOrCreateVenueFromGooglePlace({
          db,
          env: c.env,
          getExecutionContext: () => {
            try {
              return c.executionCtx;
            } catch {
              // Hono app.request tests may not provide an ExecutionContext.
            }
          },
          placeId: googlePlaceId,
          userId: user.id,
        });
        venueId = validatedVenue.id;
      } catch (error) {
        console.error("Event location validation failed:", error);
        return c.json(
          { message: "Unable to validate event location" },
          HttpStatusCodes.BAD_REQUEST
        );
      }
    }

    const record = {
      ...eventData,
      courtLabels: undefined,
      courtLabelsJson: JSON.stringify(data.courtLabels),
      hostLabel: isPlatformAdmin ? "RallyCasts" : undefined,
      hostType: isPlatformAdmin
        ? ("rallycasts" as const)
        : ("organizer" as const),
      id: createId(),
      organizerUserId: user.id,
      venueId,
    };

    const [created] = await db.insert(event).values(record).returning();
    if (record.status === "published") {
      waitUntil(c, scheduleEventLifecycle(c.env.EVENT_ACTIVITY_QUEUE, record));
    }
    if (created) {
      await syncEventSearch(c, db, created);
    }

    return c.json({ event: record }, HttpStatusCodes.CREATED);
  })
  .get("/:id", async (c) => {
    const db = createDb(c.env.DB);
    const [record] = await db
      .select()
      .from(event)
      .where(
        and(eq(event.id, c.req.param("id")), eq(event.status, "published"))
      )
      .limit(1);

    if (!record) {
      return c.json({ message: "Event not found" }, HttpStatusCodes.NOT_FOUND);
    }

    return c.json({ event: record }, HttpStatusCodes.OK);
  })
  .post("/:id/join", requireAuth, async (c) => {
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    const id = c.req.param("id");
    const [record] = await db
      .select()
      .from(event)
      .where(eq(event.id, id))
      .limit(1);
    if (!record || record.status !== "published") {
      return c.json({ message: "Event not found" }, HttpStatusCodes.NOT_FOUND);
    }
    if (
      record.registrationDeadline &&
      record.registrationDeadline.getTime() < Date.now()
    ) {
      return c.json(
        { message: "Registration is closed" },
        HttpStatusCodes.CONFLICT
      );
    }
    if (record.entryFeeCents > 0) {
      return c.json(
        {
          checkoutRequired: true,
          message: "Paid events require Stripe Checkout",
        },
        HttpStatusCodes.PAYMENT_REQUIRED
      );
    }
    const result = await getEventCoordinator(
      c.env.EVENT_COORDINATOR,
      id
    ).joinEvent({
      eventId: id,
      userId: authUser.id,
    });

    if ("error" in result) {
      return c.json({ message: "Event not found" }, HttpStatusCodes.NOT_FOUND);
    }

    return c.json({ registration: result.registration }, HttpStatusCodes.OK);
  })
  .delete("/:id/join", requireAuth, async (c) => {
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    const id = c.req.param("id");

    await db
      .update(eventRegistration)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(
        and(
          eq(eventRegistration.eventId, id),
          eq(eventRegistration.userId, authUser.id)
        )
      );

    return c.json({ joined: false }, HttpStatusCodes.OK);
  })
  .get("/:id/players", async (c) => {
    const db = createDb(c.env.DB);
    const id = c.req.param("id");
    const players = await db
      .select({
        player: {
          displayUsername: userTable.displayUsername,
          id: userTable.id,
          image: userTable.image,
          name: userTable.name,
          username: userTable.username,
        },
        registration: {
          createdAt: eventRegistration.createdAt,
          id: eventRegistration.id,
          seed: eventRegistration.seed,
          status: eventRegistration.status,
        },
      })
      .from(eventRegistration)
      .innerJoin(event, eq(eventRegistration.eventId, event.id))
      .innerJoin(userTable, eq(eventRegistration.userId, userTable.id))
      .where(
        and(
          eq(event.id, id),
          eq(event.status, "published"),
          inArray(eventRegistration.status, [
            "registered",
            "waitlisted",
            "checked_in",
          ])
        )
      )
      .orderBy(asc(eventRegistration.createdAt));

    return c.json({ players }, HttpStatusCodes.OK);
  })
  .get("/:id/live", async (c) => {
    const db = createDb(c.env.DB);
    const id = c.req.param("id");
    const [publishedEvent] = await db
      .select({ id: event.id })
      .from(event)
      .where(and(eq(event.id, id), eq(event.status, "published")))
      .limit(1);
    if (!publishedEvent) {
      return c.json({ message: "Event not found" }, HttpStatusCodes.NOT_FOUND);
    }
    const snapshot = await getEventCoordinator(
      c.env.EVENT_COORDINATOR,
      id
    ).getSnapshot(id);

    return c.json({ snapshot }, HttpStatusCodes.OK);
  })
  .get("/:id/bracket", async (c) => {
    const db = createDb(c.env.DB);
    const id = c.req.param("id");
    const [publishedEvent] = await db
      .select({ id: event.id })
      .from(event)
      .where(and(eq(event.id, id), eq(event.status, "published")))
      .limit(1);
    if (!publishedEvent) {
      return c.json({ message: "Event not found" }, HttpStatusCodes.NOT_FOUND);
    }
    const matches = await db
      .select({
        match: eventMatch,
        playerOne: {
          displayUsername: playerOneTable.displayUsername,
          id: playerOneTable.id,
          image: playerOneTable.image,
          name: playerOneTable.name,
          username: playerOneTable.username,
        },
        playerTwo: {
          displayUsername: playerTwoTable.displayUsername,
          id: playerTwoTable.id,
          image: playerTwoTable.image,
          name: playerTwoTable.name,
          username: playerTwoTable.username,
        },
        winner: {
          displayUsername: winnerTable.displayUsername,
          id: winnerTable.id,
          image: winnerTable.image,
          name: winnerTable.name,
          username: winnerTable.username,
        },
      })
      .from(eventMatch)
      .leftJoin(
        playerOneTable,
        eq(eventMatch.playerOneUserId, playerOneTable.id)
      )
      .leftJoin(
        playerTwoTable,
        eq(eventMatch.playerTwoUserId, playerTwoTable.id)
      )
      .leftJoin(winnerTable, eq(eventMatch.winnerUserId, winnerTable.id))
      .where(eq(eventMatch.eventId, id))
      .orderBy(asc(eventMatch.round), asc(eventMatch.createdAt));

    return c.json({ matches }, HttpStatusCodes.OK);
  })
  .post(
    "/:id/bracket/generate",
    requireAuth,
    zValidator("json", generateBracketSchema),
    async (c) => {
      const db = createDb(c.env.DB);
      const { user: authUser } = c.var.authSession;
      const id = c.req.param("id");
      const { force } = c.req.valid("json");
      const record = await getManageableEvent(db, id, authUser.id);

      if (!record) {
        return c.json(
          { message: "Event not found" },
          HttpStatusCodes.NOT_FOUND
        );
      }

      const existingMatches = await db
        .select({ id: eventMatch.id })
        .from(eventMatch)
        .where(eq(eventMatch.eventId, id))
        .limit(1);

      if (existingMatches.length > 0 && !force) {
        return c.json(
          { message: "Bracket already exists" },
          HttpStatusCodes.CONFLICT
        );
      }

      if (force) {
        await db.delete(eventMatch).where(eq(eventMatch.eventId, id));
      }

      const registrations = await db
        .select()
        .from(eventRegistration)
        .where(
          and(
            eq(eventRegistration.eventId, id),
            ne(eventRegistration.status, "cancelled"),
            ne(eventRegistration.status, "waitlisted")
          )
        )
        .orderBy(asc(eventRegistration.seed), asc(eventRegistration.createdAt));

      if (registrations.length < 2) {
        return c.json(
          { message: "At least two players are required for a bracket" },
          HttpStatusCodes.BAD_REQUEST
        );
      }

      const matches: (typeof eventMatch.$inferInsert)[] = [];
      const courtLabels = JSON.parse(
        record.courtLabelsJson ?? "[]"
      ) as string[];
      if (record.bracketType === "round_robin") {
        for (let left = 0; left < registrations.length; left += 1) {
          for (let right = left + 1; right < registrations.length; right += 1) {
            const playerOne = registrations[left];
            const playerTwo = registrations[right];
            if (!(playerOne && playerTwo)) {
              continue;
            }
            matches.push({
              courtLabel:
                courtLabels[matches.length % courtLabels.length] ?? undefined,
              eventId: id,
              id: createId(),
              playerOneUserId: playerOne.userId,
              playerTwoUserId: playerTwo.userId,
              round: left + 1,
              status: "scheduled",
            });
          }
        }
      } else {
        for (let index = 0; index < registrations.length; index += 2) {
          const playerOne = registrations[index];
          const playerTwo = registrations[index + 1];
          if (!playerOne) {
            continue;
          }
          matches.push({
            courtLabel:
              courtLabels[Math.floor(index / 2) % courtLabels.length] ??
              undefined,
            eventId: id,
            id: createId(),
            playerOneUserId: playerOne.userId,
            playerTwoUserId: playerTwo?.userId,
            round: 1,
            status: playerTwo ? "scheduled" : "completed",
            winnerUserId: playerTwo ? undefined : playerOne.userId,
          });
        }
      }

      await db.insert(eventMatch).values(matches);
      for (const match of matches) {
        waitUntil(
          c,
          enqueueEventActivity(c.env.EVENT_ACTIVITY_QUEUE, {
            eventId: id,
            matchId: match.id,
            type: "event.match.assigned",
          })
        );
      }

      return c.json({ matches }, HttpStatusCodes.CREATED);
    }
  )
  .post(
    "/:id/seed-demo",
    requireAuth,
    zValidator(
      "json",
      z.object({ playerCount: z.number().int().min(2).max(64).default(8) })
    ),
    async (c) => {
      const db = createDb(c.env.DB);
      const { user: authUser } = c.var.authSession;
      // Demo seeding generates fake competitor rosters; platform admins
      // only, on every environment (prod included), so organizers can test
      // brackets against real data without the endpoint being public.
      if (!(await isPlatformAdminUser(db, authUser.id))) {
        return c.json(
          { message: "Only platform admins can seed demo brackets" },
          HttpStatusCodes.FORBIDDEN
        );
      }
      const id = c.req.param("id");
      const { playerCount } = c.req.valid("json");
      const record = await getManageableEvent(db, id, authUser.id);
      if (!record) {
        return c.json(
          { message: "Event not found or unauthorized" },
          HttpStatusCodes.NOT_FOUND
        );
      }

      const result = await seedDemoTournamentData(
        db,
        id,
        playerCount,
        authUser,
        c.env
      );
      return c.json(
        {
          matchesCount: result.matchesCount,
          message: `Tournament seeded with ${result.playersCount} competitors including ${authUser.name || authUser.username || "you"} as Seed #1! Match assignment notification sent.`,
          playersCount: result.playersCount,
          success: true,
        },
        HttpStatusCodes.CREATED
      );
    }
  )
  .post("/:id/test-notification", requireAuth, async (c) => {
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    const id = c.req.param("id");
    const record = await getManageableEvent(db, id, authUser.id);
    if (!record) {
      return c.json(
        { message: "Event not found or unauthorized" },
        HttpStatusCodes.NOT_FOUND
      );
    }

    const result = await sendTournamentNotification({
      db,
      env: c.env,
      eventId: id,
      targetUserId: authUser.id,
      type: "match_ready",
    });

    if ("error" in result && result.error) {
      return c.json(
        { message: result.error, success: false },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    const courtLabel =
      "courtLabel" in result && result.courtLabel
        ? result.courtLabel
        : "Court 1";
    const roundName =
      "roundName" in result && result.roundName ? result.roundName : "Round";

    return c.json(
      {
        court: courtLabel,
        message: `Match call notification sent for ${courtLabel} (${roundName})!`,
        round: roundName,
        success: true,
      },
      HttpStatusCodes.OK
    );
  })
  .post("/:id/advance-demo-round", requireAuth, async (c) => {
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    if (!(await isPlatformAdminUser(db, authUser.id))) {
      return c.json(
        { message: "Only platform admins can advance demo brackets" },
        HttpStatusCodes.FORBIDDEN
      );
    }
    const id = c.req.param("id");
    const [record] = await db
      .select()
      .from(event)
      .where(eq(event.id, id))
      .limit(1);

    if (!record) {
      return c.json({ message: "Event not found" }, HttpStatusCodes.NOT_FOUND);
    }

    const userMatches = await db
      .select()
      .from(eventMatch)
      .where(
        and(
          eq(eventMatch.eventId, id),
          or(
            eq(eventMatch.playerOneUserId, authUser.id),
            eq(eventMatch.playerTwoUserId, authUser.id)
          )
        )
      )
      .orderBy(desc(eventMatch.round));

    const currentMatch =
      userMatches.find(
        (m) => m.status === "scheduled" || m.status === "in_progress"
      ) ?? userMatches[0];

    if (!currentMatch) {
      return c.json(
        { message: "No match found for your player in this tournament" },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    if (currentMatch.round === 1) {
      const result = await advanceDemoQuarterfinals(
        db,
        c.env,
        id,
        authUser,
        currentMatch
      );
      return c.json(result, HttpStatusCodes.OK);
    }

    if (currentMatch.round === 2) {
      const result = await advanceDemoSemifinals(
        db,
        c.env,
        id,
        authUser,
        currentMatch
      );
      return c.json(result, HttpStatusCodes.OK);
    }

    if (currentMatch.round === 3) {
      const result = await advanceDemoFinals(
        db,
        c.env,
        id,
        authUser,
        currentMatch
      );
      return c.json(result, HttpStatusCodes.OK);
    }

    return c.json(
      { message: "Tournament already completed!", success: true },
      HttpStatusCodes.OK
    );
  })
  .patch(
    "/:id/registrations/:registrationId",
    requireAuth,
    zValidator("json", updateRegistrationSchema),
    async (c) => {
      const db = createDb(c.env.DB);
      const { user: authUser } = c.var.authSession;
      const id = c.req.param("id");
      const record = await getManageableEvent(db, id, authUser.id);
      if (!record) {
        return c.json(
          { message: "Event not found" },
          HttpStatusCodes.NOT_FOUND
        );
      }
      const [registration] = await db
        .update(eventRegistration)
        .set({ ...c.req.valid("json"), updatedAt: new Date() })
        .where(
          and(
            eq(eventRegistration.id, c.req.param("registrationId")),
            eq(eventRegistration.eventId, id)
          )
        )
        .returning();
      if (!registration) {
        return c.json(
          { message: "Registration not found" },
          HttpStatusCodes.NOT_FOUND
        );
      }
      return c.json({ registration }, HttpStatusCodes.OK);
    }
  )
  .post(
    "/:id/matches/:matchId/scores",
    requireAuth,
    zValidator("json", submitScoreSchema),
    async (c) => {
      const { user: authUser } = c.var.authSession;
      const id = c.req.param("id");
      const matchId = c.req.param("matchId");
      const data = c.req.valid("json");
      const result = await getEventCoordinator(
        c.env.EVENT_COORDINATOR,
        id
      ).submitScore({
        ...data,
        eventId: id,
        matchId,
        submittedByUserId: authUser.id,
      });

      if ("error" in result) {
        return c.json(
          { message: result.error },
          result.error === "Match not found"
            ? HttpStatusCodes.NOT_FOUND
            : HttpStatusCodes.BAD_REQUEST
        );
      }

      return c.json(result, HttpStatusCodes.OK);
    }
  )
  .patch(
    "/:id/matches/:matchId",
    requireAuth,
    zValidator("json", updateMatchSchema),
    async (c) => {
      const db = createDb(c.env.DB);
      const { user: authUser } = c.var.authSession;
      const id = c.req.param("id");
      const matchId = c.req.param("matchId");
      const data = c.req.valid("json");
      const record = await getManageableEvent(db, id, authUser.id);

      if (!record) {
        return c.json(
          { message: "Event not found" },
          HttpStatusCodes.NOT_FOUND
        );
      }

      const [match] = await db
        .select()
        .from(eventMatch)
        .where(and(eq(eventMatch.id, matchId), eq(eventMatch.eventId, id)))
        .limit(1);

      if (!match) {
        return c.json(
          { message: "Match not found" },
          HttpStatusCodes.NOT_FOUND
        );
      }

      if (
        data.winnerUserId &&
        data.winnerUserId !== match.playerOneUserId &&
        data.winnerUserId !== match.playerTwoUserId
      ) {
        return c.json(
          { message: "Winner must be one of the match players" },
          HttpStatusCodes.BAD_REQUEST
        );
      }

      await db
        .update(eventMatch)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(eventMatch.id, matchId), eq(eventMatch.eventId, id)));

      return c.json({ id: matchId, ...data }, HttpStatusCodes.OK);
    }
  )
  .patch(
    "/:id",
    requireAuth,
    zValidator("json", updateEventSchema),
    async (c) => {
      const db = createDb(c.env.DB);
      const { user } = c.var.authSession;
      const id = c.req.param("id");
      const data = c.req.valid("json");

      const manageableEvent = await getManageableEvent(db, id, user.id);
      if (!manageableEvent) {
        return c.json(
          { message: "Event not found" },
          HttpStatusCodes.NOT_FOUND
        );
      }
      if (
        data.status === "published" &&
        !(data.venueId ?? manageableEvent.venueId)
      ) {
        return c.json(
          { message: "Published events require a validated location" },
          HttpStatusCodes.BAD_REQUEST
        );
      }
      if (data.status === "cancelled") {
        const [succeededPayment] = await db
          .select({ id: eventPayment.id })
          .from(eventPayment)
          .where(
            and(
              eq(eventPayment.eventId, id),
              eq(eventPayment.status, "succeeded")
            )
          )
          .limit(1);
        if (succeededPayment && !c.env.STRIPE_SECRET_KEY) {
          return c.json(
            { message: "Stripe is required to cancel paid events" },
            HttpStatusCodes.SERVICE_UNAVAILABLE
          );
        }
        if (succeededPayment && c.env.STRIPE_SECRET_KEY) {
          try {
            await refundCancelledEventPayments(
              db,
              id,
              manageableEvent.name,
              c.env.STRIPE_SECRET_KEY
            );
          } catch (error) {
            console.error(
              JSON.stringify({
                event: "event_cancellation_refund_failed",
                eventId: id,
                message:
                  error instanceof Error ? error.message : "unknown error",
              })
            );
            return c.json(
              { message: "Event refunds could not be completed" },
              HttpStatusCodes.BAD_GATEWAY
            );
          }
        }
      }
      await db
        .update(event)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(event.id, id));
      const [updated] = await db
        .select()
        .from(event)
        .where(eq(event.id, id))
        .limit(1);

      if (!updated) {
        return c.json(
          { message: "Event not found" },
          HttpStatusCodes.NOT_FOUND
        );
      }

      if (data.status === "published") {
        waitUntil(
          c,
          scheduleEventLifecycle(c.env.EVENT_ACTIVITY_QUEUE, updated)
        );
      }
      await syncEventSearch(c, db, updated);

      return c.json({ event: updated }, HttpStatusCodes.OK);
    }
  );

const syncEventSearch = async (
  c: Context<AppEnv>,
  db: ReturnType<typeof createDb>,
  record: typeof event.$inferSelect
) => {
  if (record.status !== "published") {
    await removeSearchDocument(db, c.env, "event", record.id);
    return;
  }
  const searchRecord = await upsertSearchDocument(db, {
    content: [record.description, record.eventType, record.hostLabel]
      .filter(Boolean)
      .join(". "),
    entityId: record.id,
    entityType: "event",
    metadata: {
      organizationId: record.organizationId,
      venueId: record.venueId,
    },
    title: record.name,
  });
  scheduleSearchDocumentIndex(() => c.executionCtx, db, c.env, searchRecord);
};
