import { createDb } from "@rallycaststv/db";
import { user } from "@rallycaststv/db/schema/auth";
import {
  event,
  eventMatch,
  eventRegistration,
} from "@rallycaststv/db/schema/domain";
import { and, eq, inArray, like, or, sql } from "drizzle-orm";

import { checkPushReceipts } from "../lib/push";

export interface MaintenanceEnv {
  DB: D1Database;
  EXPO_ACCESS_TOKEN?: string;
}

/** Archive published events this long after they end. */
const EVENT_ARCHIVE_GRACE_MS = 48 * 60 * 60 * 1000;
/** Events without an explicit end are assumed to run for one day. */
const DEFAULT_EVENT_DURATION_MS = 24 * 60 * 60 * 1000;
/** Demo accounts are recreated on demand by the seed-demo endpoint. */
const DEMO_USER_ID_PATTERN = "demo-%";
const DEMO_EMAIL_PATTERN = "%@rallycasts.demo";

export interface MaintenanceResult {
  archivedAsCompleted: number;
  archivedAsCancelled: number;
  deletedDemoMatches: number;
  deletedDemoRegistrations: number;
  deletedDemoUsers: number;
  pushReceiptsChecked: number;
  pushTokensDisabled: number;
}

const eventEndMillis = sql<number>`COALESCE(${event.endsAt}, ${event.startsAt} + ${DEFAULT_EVENT_DURATION_MS})`;

export async function runMaintenance(
  db: ReturnType<typeof createDb>,
  env?: MaintenanceEnv
): Promise<MaintenanceResult> {
  const result: MaintenanceResult = {
    archivedAsCancelled: 0,
    archivedAsCompleted: 0,
    deletedDemoMatches: 0,
    deletedDemoRegistrations: 0,
    deletedDemoUsers: 0,
    pushReceiptsChecked: 0,
    pushTokensDisabled: 0,
  };

  if (env) {
    const pushResult = await checkPushReceipts(db, env);
    result.pushReceiptsChecked = pushResult.checked;
    result.pushTokensDisabled = pushResult.disabled;
  }

  // 1. Archive pass: published events stay public only for a grace window
  // after they end, then move to a terminal status so discovery queries
  // (which filter terminal statuses) drop them. Two set-based statements
  // keep the pass cheap and avoid per-row round trips.
  const archiveCutoff = Date.now() - EVENT_ARCHIVE_GRACE_MS;
  const staleCondition = and(
    eq(event.status, "published"),
    sql`${eventEndMillis} < ${archiveCutoff}`
  );

  // Events that actually played out graduate to completed...
  const completedEvents = await db
    .update(event)
    .set({ status: "completed" })
    .where(
      and(
        staleCondition,
        sql`EXISTS (SELECT 1 FROM ${eventMatch} WHERE ${eventMatch.eventId} = ${event.id} AND ${eventMatch.status} = 'completed')`
      )
    )
    .returning({ id: event.id });
  result.archivedAsCompleted = completedEvents.length;

  // ...everything else stale is cancelled. The first update already moved
  // its rows out of "published", so this only catches the remainder.
  const cancelledEvents = await db
    .update(event)
    .set({ status: "cancelled" })
    .where(staleCondition)
    .returning({ id: event.id });
  result.archivedAsCancelled = cancelledEvents.length;

  // 2. Demo purge pass: demo accounts only exist to fill test brackets, so
  // once their host event is no longer published their rows and accounts go
  // away. Event owners' own rows are never touched. The terminal-event set
  // is a subquery rather than a capped list: the pass deletes the rows it
  // finds, so the candidate set shrinks monotonically and every run makes
  // progress no matter how many terminal events accumulate.
  const terminalEventIds = db
    .select({ id: event.id })
    .from(event)
    .where(inArray(event.status, ["cancelled", "completed"]));

  const deletedMatches = await db
    .delete(eventMatch)
    .where(
      and(
        inArray(eventMatch.eventId, terminalEventIds),
        or(
          like(eventMatch.playerOneUserId, DEMO_USER_ID_PATTERN),
          like(eventMatch.playerTwoUserId, DEMO_USER_ID_PATTERN),
          like(eventMatch.winnerUserId, DEMO_USER_ID_PATTERN)
        )
      )
    )
    .returning({ id: eventMatch.id });
  result.deletedDemoMatches = deletedMatches.length;

  const deletedRegistrations = await db
    .delete(eventRegistration)
    .where(
      and(
        inArray(eventRegistration.eventId, terminalEventIds),
        like(eventRegistration.userId, DEMO_USER_ID_PATTERN)
      )
    )
    .returning({ id: eventRegistration.id });
  result.deletedDemoRegistrations = deletedRegistrations.length;

  // Demo users with no remaining registration or match participation are
  // deleted; user_profile, posts, and notifications cascade with them.
  const deletedUsers = await db
    .delete(user)
    .where(
      and(
        like(user.id, DEMO_USER_ID_PATTERN),
        like(user.email, DEMO_EMAIL_PATTERN),
        sql`NOT EXISTS (SELECT 1 FROM ${eventRegistration} WHERE ${eventRegistration.userId} = ${user.id})`,
        sql`NOT EXISTS (SELECT 1 FROM ${eventMatch} WHERE ${eventMatch.playerOneUserId} = ${user.id} OR ${eventMatch.playerTwoUserId} = ${user.id} OR ${eventMatch.winnerUserId} = ${user.id})`
      )
    )
    .returning({ id: user.id });
  result.deletedDemoUsers = deletedUsers.length;

  return result;
}

export default {
  scheduled(
    _controller: ScheduledController,
    env: MaintenanceEnv,
    ctx: ExecutionContext
  ): void {
    const run = async () => {
      try {
        const result = await runMaintenance(createDb(env.DB), env);
        console.log(
          JSON.stringify({ event: "maintenance_completed", ...result })
        );
      } catch (error) {
        console.error(
          JSON.stringify({
            event: "maintenance_failed",
            message: error instanceof Error ? error.message : "unknown error",
          })
        );
      }
    };

    ctx.waitUntil(run());
  },
};
