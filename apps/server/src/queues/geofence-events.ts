import { createDb } from "@rallycaststv/db";
import { venueVisit } from "@rallycaststv/db/schema/domain";
import { and, desc, eq } from "drizzle-orm";

import type { RadarWebhookEvent } from "../routes/webhooks";

export { VenuePresence } from "../durable-objects/venue-presence";

export interface Env {
  DB: D1Database;
  VENUE_PRESENCE: DurableObjectNamespace;
}

type VenuePresenceStub = DurableObjectStub & {
  getActiveUsers: () => Promise<{ enteredAt: string; userId: string }[]>;
  userEntered: (userId: string) => Promise<{ count: number }>;
  userExited: (userId: string) => Promise<{ count: number }>;
};

export default {
  async queue(batch: MessageBatch<RadarWebhookEvent>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      try {
        await processGeofenceEvent(message.body, env);
        message.ack();
      } catch (error) {
        console.error({
          attempts: message.attempts,
          error: error instanceof Error ? error.message : "unknown error",
          event: "queue_message_failed",
          messageId: message.id,
          queue: batch.queue,
          worker: "geofence-events",
        });
        message.retry();
      }
    }
  },
};

async function processGeofenceEvent(
  event: RadarWebhookEvent,
  env: Env
): Promise<void> {
  const venueId = event.geofence.externalId;
  const { userId } = event.user;

  if (!userId || !venueId) {
    return;
  }

  const venueRecord = await env.DB.prepare(
    "select id from venue where id = ? limit 1"
  )
    .bind(venueId)
    .first<{ id: string }>();
  if (!venueRecord) {
    return;
  }

  // Get the Durable Object for this venue
  const doId = env.VENUE_PRESENCE.idFromName(venueId);
  const presence = env.VENUE_PRESENCE.get(doId) as VenuePresenceStub;

  const db = createDb(env.DB);

  if (event.type === "user.entered_geofence") {
    // Update real-time presence
    await presence.userEntered(userId);
    // Create a visit record
    const visitId = crypto.randomUUID();
    await db
      .insert(venueVisit)
      .values({
        enteredAt: new Date(),
        id: visitId,
        radarEventId: event._id,
        userId,
        venueId,
      })
      .onConflictDoNothing({ target: venueVisit.radarEventId });
  } else if (event.type === "user.exited_geofence") {
    // Update real-time presence
    await presence.userExited(userId);
    // Update the visit record with exit time
    const [visit] = await db
      .select()
      .from(venueVisit)
      .where(
        and(eq(venueVisit.userId, userId), eq(venueVisit.venueId, venueId))
      )
      .orderBy(desc(venueVisit.enteredAt))
      .limit(1);

    if (visit) {
      const exitedAt = new Date();
      const durationMinutes = visit.enteredAt
        ? Math.round((exitedAt.getTime() - visit.enteredAt.getTime()) / 60_000)
        : 0;

      await db
        .update(venueVisit)
        .set({
          durationMinutes,
          exitedAt,
        })
        .where(eq(venueVisit.id, visit.id));
    }
  }
}
