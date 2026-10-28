import { createDb } from "@rallycaststv/db";
import { user } from "@rallycaststv/db/schema/auth";
import { event, eventRegistration } from "@rallycaststv/db/schema/domain";
import { and, eq, ne } from "drizzle-orm";

import type { EventActivityMessage } from "../lib/event-activity";
import { createNotification } from "../lib/notifications";
import { sendTournamentNotification } from "../lib/tournament-notifications";

export { EventCoordinator } from "../durable-objects/event-coordinator";

export interface Env {
  DB: D1Database;
  EVENT_ACTIVITY_QUEUE?: Queue<EventActivityMessage>;
  EXPO_ACCESS_TOKEN?: string;
  RESEND_API_KEY?: string;
  USER_NOTIFICATIONS?: DurableObjectNamespace;
}

const getEventParticipants = (
  db: ReturnType<typeof createDb>,
  eventId: string
) =>
  db
    .select({ userId: eventRegistration.userId })
    .from(eventRegistration)
    .where(
      and(
        eq(eventRegistration.eventId, eventId),
        ne(eventRegistration.status, "cancelled"),
        ne(eventRegistration.status, "waitlisted")
      )
    );

const notifyParticipants = async (
  db: ReturnType<typeof createDb>,
  env: Env,
  eventId: string,
  input: {
    actorUserId?: string;
    body?: string;
    entityId?: string;
    entityType: "event";
    href: string;
    title: string;
    type: "event";
  }
) => {
  const participants = await getEventParticipants(db, eventId);

  for (const participant of participants) {
    // oxlint-disable-next-line eslint/no-await-in-loop -- notification fan-out / queue acking; sequential by design
    await createNotification(
      db,
      {
        ...input,
        userId: participant.userId,
      },
      env
    );
  }
};

const processEventActivity = async (
  message: EventActivityMessage,
  env: Env
) => {
  const db = createDb(env.DB);
  const [record] = await db
    .select()
    .from(event)
    .where(eq(event.id, message.eventId))
    .limit(1);

  if (!record) {
    return;
  }

  if (message.type === "event.registration.updated") {
    const [player] = await db
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, message.userId))
      .limit(1);

    await createNotification(
      db,
      {
        actorUserId: message.userId,
        body: `${player?.name ?? "A player"} joined or updated registration.`,
        entityId: message.eventId,
        entityType: "event",
        href: `/events/${message.eventId}`,
        title: "Registration updated",
        type: "event",
        userId: record.organizerUserId,
      },
      env
    );
    return;
  }

  if (message.type === "event.reminder") {
    await notifyParticipants(db, env, message.eventId, {
      body: `${record.name} starts soon. Check in and watch your match assignments.`,
      entityId: message.eventId,
      entityType: "event",
      href: `/events/${message.eventId}`,
      title: "Event starts soon",
      type: "event",
    });
    return;
  }

  if (message.type === "event.started") {
    await notifyParticipants(db, env, message.eventId, {
      body: `${record.name} is starting now.`,
      entityId: message.eventId,
      entityType: "event",
      href: `/events/${message.eventId}`,
      title: "Event starting",
      type: "event",
    });
    return;
  }

  if (message.type === "event.match.assigned") {
    await sendTournamentNotification({
      db,
      env,
      eventId: message.eventId,
      matchId: message.matchId,
      type: "match_ready",
    });
    return;
  }

  if (
    message.type === "event.score.confirmed" ||
    message.type === "event.score.disputed"
  ) {
    await createNotification(
      db,
      {
        body:
          message.type === "event.score.confirmed"
            ? "A match score was confirmed."
            : "A score dispute needs review.",
        entityId: message.matchId,
        entityType: "event",
        href: `/events/${message.eventId}/matches`,
        title:
          message.type === "event.score.confirmed"
            ? "Score confirmed"
            : "Score dispute",
        type: "event",
        userId: record.organizerUserId,
      },
      env
    );
  }
};

export default {
  async queue(
    batch: MessageBatch<EventActivityMessage>,
    env: Env
  ): Promise<void> {
    for (const message of batch.messages) {
      try {
        // oxlint-disable-next-line eslint/no-await-in-loop -- notification fan-out / queue acking; sequential by design
        await processEventActivity(message.body, env);
        message.ack();
      } catch (error) {
        console.error({
          attempts: message.attempts,
          error: error instanceof Error ? error.message : "unknown error",
          event: "queue_message_failed",
          messageId: message.id,
          queue: batch.queue,
          worker: "event-activity",
        });
        message.retry();
      }
    }
  },
};
