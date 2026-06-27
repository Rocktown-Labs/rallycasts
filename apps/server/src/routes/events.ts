import { zValidator } from "@hono/zod-validator";
import { createDb } from "@rallycaststv/db";
import { user as userTable } from "@rallycaststv/db/schema/auth";
import {
  event,
  eventMatch,
  eventPayment,
  eventRegistration,
  organizationMember,
} from "@rallycaststv/db/schema/domain";
import { and, asc, desc, eq, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { Hono } from "hono";
import type { Context } from "hono";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { z } from "zod";

import { isPlatformAdminEmail } from "../lib/admin";
import { enqueueEventActivity } from "../lib/event-activity";
import type { EventActivityMessage } from "../lib/event-activity";
import { createId } from "../lib/ids";
import { createNotification } from "../lib/notifications";
import {
  removeSearchDocument,
  scheduleSearchDocumentIndex,
  upsertSearchDocument,
} from "../lib/search-index";
import type { AppEnv } from "../lib/types";
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

const eventSchema = eventFields.refine(
  (data) => !data.endsAt || data.endsAt > data.startsAt,
  {
    message: "Event must end after it starts.",
    path: ["endsAt"],
  }
);

const updateEventSchema = eventFields
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
  return membership ? record : null;
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
      continue;
    }
    let response: Response;
    try {
      response = await fetch("https://api.stripe.com/v1/refunds", {
        body: new URLSearchParams({
          payment_intent: payment.stripePaymentIntentId,
        }),
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "Stripe-Version": "2026-02-25.clover",
        },
        method: "POST",
      });
    } catch {
      refundErrors.push(payment.id);
      continue;
    }
    if (!response.ok) {
      refundErrors.push(payment.id);
      continue;
    }
    const refund = (await response.json()) as { id: string };
    await db
      .update(eventPayment)
      .set({
        status: "refunded",
        stripeRefundId: refund.id,
        updatedAt: new Date(),
      })
      .where(eq(eventPayment.id, payment.id));
    await db
      .update(eventRegistration)
      .set({
        paymentStatus: "refunded",
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(eq(eventRegistration.id, registration.id));
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
  .post("/", requireAuth, zValidator("json", eventSchema), async (c) => {
    const db = createDb(c.env.DB);
    const { user } = c.var.authSession;
    const data = c.req.valid("json");
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
      if (!membership) {
        return c.json({ message: "Forbidden" }, HttpStatusCodes.FORBIDDEN);
      }
    }
    const isPlatformAdmin = isPlatformAdminEmail(user.email, c.env);
    const record = {
      ...data,
      courtLabels: undefined,
      courtLabelsJson: JSON.stringify(data.courtLabels),
      hostLabel: isPlatformAdmin ? "RallyCasts" : undefined,
      hostType: isPlatformAdmin
        ? ("rallycasts" as const)
        : ("organizer" as const),
      id: createId(),
      organizerUserId: user.id,
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
      .where(eq(event.id, c.req.param("id")))
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
    if (!record) {
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
        registration: eventRegistration,
      })
      .from(eventRegistration)
      .innerJoin(userTable, eq(eventRegistration.userId, userTable.id))
      .where(
        and(
          eq(eventRegistration.eventId, id),
          ne(eventRegistration.status, "cancelled")
        )
      )
      .orderBy(asc(eventRegistration.createdAt));

    return c.json({ players }, HttpStatusCodes.OK);
  })
  .get("/:id/live", async (c) => {
    const id = c.req.param("id");
    const snapshot = await getEventCoordinator(
      c.env.EVENT_COORDINATOR,
      id
    ).getSnapshot(id);

    return c.json({ snapshot }, HttpStatusCodes.OK);
  })
  .get("/:id/bracket", async (c) => {
    const db = createDb(c.env.DB);
    const id = c.req.param("id");
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
      if (data.status === "cancelled" && c.env.STRIPE_SECRET_KEY) {
        waitUntil(
          c,
          refundCancelledEventPayments(
            db,
            updated.id,
            updated.name,
            c.env.STRIPE_SECRET_KEY
          )
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
