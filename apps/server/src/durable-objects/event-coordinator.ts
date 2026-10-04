import { createDb } from "@rallycaststv/db";
import {
  event,
  eventMatch,
  eventRegistration,
  eventScoreSubmission,
  organizationMember,
} from "@rallycaststv/db/schema/domain";
import { DurableObject } from "cloudflare:workers";
import { and, asc, eq, ne, sql } from "drizzle-orm";

import { enqueueEventActivity } from "../lib/event-activity";
import type { EventActivityMessage } from "../lib/event-activity";
import { createId } from "../lib/ids";

interface EventCoordinatorEnv {
  DB: D1Database;
  EVENT_ACTIVITY_QUEUE?: Queue<EventActivityMessage>;
}

interface JoinEventInput {
  eventId: string;
  userId: string;
}

interface SubmitScoreInput {
  eventId: string;
  matchId: string;
  note?: string;
  playerOneScore: number;
  playerTwoScore: number;
  submittedByUserId: string;
  winnerUserId: string;
}

const isMatchingSubmission = (
  left: typeof eventScoreSubmission.$inferSelect,
  right: SubmitScoreInput
) =>
  left.playerOneScore === right.playerOneScore &&
  left.playerTwoScore === right.playerTwoScore &&
  left.winnerUserId === right.winnerUserId;

const runBackground = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error) {
    console.error("Event coordinator background task failed:", error);
  }
};

const updateExistingBracketMatches = async (
  db: ReturnType<typeof createDb>,
  env: EventCoordinatorEnv,
  eventId: string,
  existingNextMatches: (typeof eventMatch.$inferSelect)[],
  winners: string[]
) => {
  for (let index = 0; index < winners.length; index += 2) {
    const targetMatch = existingNextMatches[Math.floor(index / 2)];
    if (!targetMatch) {
      continue;
    }
    const playerOneUserId = winners[index];
    const playerTwoUserId = winners[index + 1];
    // oxlint-disable-next-line eslint/no-await-in-loop -- bracket advancement updates matches in order
    await db
      .update(eventMatch)
      .set({
        playerOneUserId: playerOneUserId ?? targetMatch.playerOneUserId,
        playerTwoUserId: playerTwoUserId ?? targetMatch.playerTwoUserId,
        status: playerTwoUserId ? "scheduled" : targetMatch.status,
        updatedAt: new Date(),
        winnerUserId: playerTwoUserId ? undefined : playerOneUserId,
      })
      .where(eq(eventMatch.id, targetMatch.id));

    if (playerOneUserId && playerTwoUserId) {
      runBackground(
        enqueueEventActivity(env.EVENT_ACTIVITY_QUEUE, {
          eventId,
          matchId: targetMatch.id,
          type: "event.match.assigned",
        })
      );
    }
  }
};

const createNewBracketMatches = async (
  db: ReturnType<typeof createDb>,
  env: EventCoordinatorEnv,
  record: typeof event.$inferSelect,
  nextRound: number,
  winners: string[]
) => {
  const courtLabels = JSON.parse(record.courtLabelsJson ?? "[]") as string[];
  const nextMatches: (typeof eventMatch.$inferInsert)[] = [];
  for (let index = 0; index < winners.length; index += 2) {
    const playerOneUserId = winners[index];
    if (!playerOneUserId) {
      continue;
    }
    const playerTwoUserId = winners[index + 1];
    nextMatches.push({
      courtLabel:
        courtLabels[Math.floor(index / 2) % courtLabels.length] ?? undefined,
      eventId: record.id,
      id: createId(),
      playerOneUserId,
      playerTwoUserId,
      round: nextRound,
      status: playerTwoUserId ? "scheduled" : "completed",
      winnerUserId: playerTwoUserId ? undefined : playerOneUserId,
    });
  }
  if (nextMatches.length === 0) {
    return;
  }
  await db.insert(eventMatch).values(nextMatches);
  for (const match of nextMatches) {
    runBackground(
      enqueueEventActivity(env.EVENT_ACTIVITY_QUEUE, {
        eventId: record.id,
        matchId: match.id,
        type: "event.match.assigned",
      })
    );
  }
};

const advanceSingleEliminationBracket = async (
  db: ReturnType<typeof createDb>,
  env: EventCoordinatorEnv,
  record: typeof event.$inferSelect,
  completedMatch: typeof eventMatch.$inferSelect
) => {
  if (record.bracketType !== "single_elimination") {
    return;
  }
  const roundMatches = await db
    .select()
    .from(eventMatch)
    .where(
      and(
        eq(eventMatch.eventId, record.id),
        eq(eventMatch.round, completedMatch.round)
      )
    )
    .orderBy(asc(eventMatch.createdAt));
  if (
    roundMatches.some(
      (match) => match.status !== "completed" || !match.winnerUserId
    )
  ) {
    return;
  }
  const winners = roundMatches.flatMap((match) =>
    match.winnerUserId ? [match.winnerUserId] : []
  );
  if (winners.length <= 1) {
    await db
      .update(event)
      .set({ status: "completed", updatedAt: new Date() })
      .where(eq(event.id, record.id));
    return;
  }
  const nextRound = completedMatch.round + 1;
  const existingNextMatches = await db
    .select()
    .from(eventMatch)
    .where(
      and(eq(eventMatch.eventId, record.id), eq(eventMatch.round, nextRound))
    )
    .orderBy(asc(eventMatch.createdAt));

  if (existingNextMatches.length > 0) {
    await updateExistingBracketMatches(
      db,
      env,
      record.id,
      existingNextMatches,
      winners
    );
    return;
  }

  await createNewBracketMatches(db, env, record, nextRound, winners);
};

export class EventCoordinator extends DurableObject<EventCoordinatorEnv> {
  async getSnapshot(eventId: string) {
    const db = createDb(this.env.DB);
    const [registrationCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(eventRegistration)
      .where(
        and(
          eq(eventRegistration.eventId, eventId),
          ne(eventRegistration.status, "cancelled")
        )
      )
      .limit(1);
    const matches = await db
      .select()
      .from(eventMatch)
      .where(eq(eventMatch.eventId, eventId))
      .orderBy(asc(eventMatch.round), asc(eventMatch.createdAt));
    const scoreSubmissions = await db
      .select()
      .from(eventScoreSubmission)
      .where(eq(eventScoreSubmission.eventId, eventId))
      .orderBy(asc(eventScoreSubmission.createdAt));

    return {
      matches,
      registrationCount: registrationCount?.count ?? 0,
      scoreSubmissions,
    };
  }

  async joinEvent({ eventId, userId }: JoinEventInput) {
    const db = createDb(this.env.DB);
    const [record] = await db
      .select()
      .from(event)
      .where(eq(event.id, eventId))
      .limit(1);

    if (!record || record.status === "cancelled") {
      return { error: "Event not found" as const };
    }

    const [countRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(eventRegistration)
      .where(
        and(
          eq(eventRegistration.eventId, eventId),
          ne(eventRegistration.status, "cancelled")
        )
      )
      .limit(1);
    const activeRegistrationCount = countRow?.count ?? 0;
    const status: "registered" | "waitlisted" =
      record.capacity && activeRegistrationCount >= record.capacity
        ? "waitlisted"
        : "registered";
    const registration = {
      eventId,
      id: createId(),
      status,
      userId,
    };

    await db
      .insert(eventRegistration)
      .values(registration)
      .onConflictDoUpdate({
        set: {
          status,
          updatedAt: new Date(),
        },
        target: [eventRegistration.eventId, eventRegistration.userId],
      });

    const [updatedRegistration] = await db
      .select()
      .from(eventRegistration)
      .where(
        and(
          eq(eventRegistration.eventId, eventId),
          eq(eventRegistration.userId, userId)
        )
      )
      .limit(1);

    await this.ctx.storage.put(
      "registrationCount",
      activeRegistrationCount + 1
    );
    runBackground(
      enqueueEventActivity(this.env.EVENT_ACTIVITY_QUEUE, {
        eventId,
        type: "event.registration.updated",
        userId,
      })
    );

    return { registration: updatedRegistration ?? registration };
  }

  async submitScore(input: SubmitScoreInput) {
    const db = createDb(this.env.DB);
    const [match] = await db
      .select()
      .from(eventMatch)
      .where(
        and(
          eq(eventMatch.id, input.matchId),
          eq(eventMatch.eventId, input.eventId)
        )
      )
      .limit(1);

    if (!match) {
      return { error: "Match not found" as const };
    }

    const [record] = await db
      .select()
      .from(event)
      .where(eq(event.id, input.eventId))
      .limit(1);
    if (!record) {
      return { error: "Event not found" as const };
    }
    const [organizationMembership] = record?.organizationId
      ? await db
          .select({ role: organizationMember.role })
          .from(organizationMember)
          .where(
            and(
              eq(organizationMember.organizationId, record.organizationId),
              eq(organizationMember.userId, input.submittedByUserId)
            )
          )
          .limit(1)
      : [];
    const isOrganizer =
      record?.organizerUserId === input.submittedByUserId ||
      Boolean(
        organizationMembership && organizationMembership.role !== "editor"
      );
    const isMatchPlayer =
      match.playerOneUserId === input.submittedByUserId ||
      match.playerTwoUserId === input.submittedByUserId;

    if (!isOrganizer && !isMatchPlayer) {
      return { error: "Not allowed to submit this score" as const };
    }

    if (
      input.winnerUserId !== match.playerOneUserId &&
      input.winnerUserId !== match.playerTwoUserId
    ) {
      return { error: "Winner must be one of the match players" as const };
    }

    const submission = {
      eventId: input.eventId,
      id: createId(),
      matchId: input.matchId,
      note: input.note,
      playerOneScore: input.playerOneScore,
      playerTwoScore: input.playerTwoScore,
      submittedByUserId: input.submittedByUserId,
      winnerUserId: input.winnerUserId,
    };

    await db.insert(eventScoreSubmission).values(submission);

    if (isOrganizer) {
      await db
        .update(eventMatch)
        .set({
          playerOneScore: input.playerOneScore,
          playerTwoScore: input.playerTwoScore,
          status: "completed",
          updatedAt: new Date(),
          winnerUserId: input.winnerUserId,
        })
        .where(eq(eventMatch.id, input.matchId));
      await db
        .update(eventScoreSubmission)
        .set({ status: "confirmed" })
        .where(eq(eventScoreSubmission.id, submission.id));
      await advanceSingleEliminationBracket(db, this.env, record, {
        ...match,
        status: "completed",
        winnerUserId: input.winnerUserId,
      });
      runBackground(
        enqueueEventActivity(this.env.EVENT_ACTIVITY_QUEUE, {
          eventId: input.eventId,
          matchId: input.matchId,
          type: "event.score.confirmed",
        })
      );

      return { status: "confirmed" as const, submission };
    }

    const existingSubmissions = await db
      .select()
      .from(eventScoreSubmission)
      .where(
        and(
          eq(eventScoreSubmission.matchId, input.matchId),
          eq(eventScoreSubmission.status, "pending")
        )
      )
      .orderBy(asc(eventScoreSubmission.createdAt));
    const matchingSubmission = existingSubmissions.find(
      (candidate) =>
        candidate.submittedByUserId !== input.submittedByUserId &&
        isMatchingSubmission(candidate, input)
    );

    if (matchingSubmission) {
      await db
        .update(eventScoreSubmission)
        .set({ status: "confirmed" })
        .where(eq(eventScoreSubmission.matchId, input.matchId));
      await db
        .update(eventMatch)
        .set({
          playerOneScore: input.playerOneScore,
          playerTwoScore: input.playerTwoScore,
          status: "completed",
          updatedAt: new Date(),
          winnerUserId: input.winnerUserId,
        })
        .where(eq(eventMatch.id, input.matchId));
      if (record) {
        await advanceSingleEliminationBracket(db, this.env, record, {
          ...match,
          status: "completed",
          winnerUserId: input.winnerUserId,
        });
      }
      runBackground(
        enqueueEventActivity(this.env.EVENT_ACTIVITY_QUEUE, {
          eventId: input.eventId,
          matchId: input.matchId,
          type: "event.score.confirmed",
        })
      );

      return { status: "confirmed" as const, submission };
    }

    const hasOpponentSubmission = existingSubmissions.some(
      (candidate) => candidate.submittedByUserId !== input.submittedByUserId
    );
    if (hasOpponentSubmission) {
      await db
        .update(eventScoreSubmission)
        .set({ status: "disputed" })
        .where(eq(eventScoreSubmission.matchId, input.matchId));
      runBackground(
        enqueueEventActivity(this.env.EVENT_ACTIVITY_QUEUE, {
          eventId: input.eventId,
          matchId: input.matchId,
          type: "event.score.disputed",
        })
      );

      return { status: "disputed" as const, submission };
    }

    return { status: "pending" as const, submission };
  }
}
