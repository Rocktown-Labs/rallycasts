import { zValidator } from "@hono/zod-validator";
import { createDb } from "@rallycaststv/db";
import { user as userTable } from "@rallycaststv/db/schema/auth";
import {
  event,
  eventMatch,
  eventRegistration,
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
import type { AppEnv } from "../lib/types";
import { requireAuth } from "../middleware/auth";

const eventFields = z.object({
  capacity: z.number().int().positive().optional(),
  description: z.string().max(2000).optional(),
  endsAt: z.coerce.date().optional(),
  eventType: z
    .enum(["open_play", "tournament", "clinic", "league"])
    .default("open_play"),
  name: z.string().min(1).max(160),
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
    const isPlatformAdmin = isPlatformAdminEmail(user.email, c.env);
    const record = {
      hostLabel: isPlatformAdmin ? "RallyCasts" : undefined,
      hostType: isPlatformAdmin
        ? ("rallycasts" as const)
        : ("organizer" as const),
      id: createId(),
      organizerUserId: user.id,
      ...data,
    };

    await db.insert(event).values(record);
    if (record.status === "published") {
      waitUntil(c, scheduleEventLifecycle(c.env.EVENT_ACTIVITY_QUEUE, record));
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
    const { user: authUser } = c.var.authSession;
    const id = c.req.param("id");
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
      const [record] = await db
        .select()
        .from(event)
        .where(and(eq(event.id, id), eq(event.organizerUserId, authUser.id)))
        .limit(1);

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
        .orderBy(asc(eventRegistration.createdAt));

      if (registrations.length < 2) {
        return c.json(
          { message: "At least two players are required for a bracket" },
          HttpStatusCodes.BAD_REQUEST
        );
      }

      const matches: (typeof eventMatch.$inferInsert)[] = [];
      for (let index = 0; index < registrations.length; index += 2) {
        const playerOne = registrations[index];
        const playerTwo = registrations[index + 1];

        if (!playerOne) {
          continue;
        }

        matches.push({
          eventId: id,
          id: createId(),
          playerOneUserId: playerOne.userId,
          playerTwoUserId: playerTwo?.userId,
          round: 1,
          status: playerTwo ? "scheduled" : "completed",
          winnerUserId: playerTwo ? undefined : playerOne.userId,
        });
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
      const [record] = await db
        .select()
        .from(event)
        .where(and(eq(event.id, id), eq(event.organizerUserId, authUser.id)))
        .limit(1);

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

      await db
        .update(event)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(and(eq(event.id, id), eq(event.organizerUserId, user.id)));
      const [updated] = await db
        .select()
        .from(event)
        .where(and(eq(event.id, id), eq(event.organizerUserId, user.id)))
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

      return c.json({ event: updated }, HttpStatusCodes.OK);
    }
  );
