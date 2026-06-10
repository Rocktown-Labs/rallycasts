import { createDb } from "@rallycaststv/db";
import { venueVisit } from "@rallycaststv/db/schema/domain";
import { eq } from "drizzle-orm";

import type { RadarWebhookEvent } from "../routes/webhooks";

export interface Env {
  DB: D1Database;
  VENUE_PRESENCE: DurableObjectNamespace;
}

export default {
  async queue(
    batch: MessageBatch<{ body: RadarWebhookEvent }>,
    env: Env
  ): Promise<void> {
    for (const message of batch.messages) {
      try {
        await processGeofenceEvent(message.body, env);
        message.ack();
      } catch (error) {
        console.error("Failed to process geofence event:", error);
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

  // Get the Durable Object for this venue
  const doId = env.VENUE_PRESENCE.idFromName(venueId);
  const presence = env.VENUE_PRESENCE.get(doId);

  const db = createDb(env.DB);

  if (event.type === "user.entered_geofence") {
    // Update real-time presence
    const { count } = await presence.userEntered(userId);
    console.log(`User ${userId} entered venue ${venueId}. Active: ${count}`);

    // Create a visit record
    const visitId = crypto.randomUUID();
    await db.insert(venueVisit).values({
      enteredAt: new Date(),
      id: visitId,
      userId,
      venueId,
    });
  } else if (event.type === "user.exited_geofence") {
    // Update real-time presence
    const { count } = await presence.userExited(userId);
    console.log(`User ${userId} exited venue ${venueId}. Active: ${count}`);

    // Update the visit record with exit time
    const [visit] = await db
      .select()
      .from(venueVisit)
      .where(eq(venueVisit.userId, userId) && eq(venueVisit.venueId, venueId))
      .orderBy(venueVisit.enteredAt)
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
