import { Hono } from "hono";
import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppEnv } from "../lib/types";

export interface RadarWebhookEvent {
  _id: string;
  confidence: number;
  createdAt: string;
  duration?: number;
  geofence: {
    description: string;
    externalId: string;
    metadata?: Record<string, unknown>;
    tag: string;
  };
  location: {
    coordinates: [number, number];
    type: "Point";
  };
  locationAccuracy: number;
  type: "user.entered_geofence" | "user.exited_geofence";
  user: {
    deviceId?: string;
    metadata?: Record<string, unknown>;
    userId?: string;
  };
}

export const webhooksRouter = new Hono<AppEnv>()
  .post("/radar", async (c) => {
    const body = (await c.req.json()) as {
      data?: RadarWebhookEvent[];
      event?: RadarWebhookEvent;
    };

    // Radar sends either a single event or an array of events
    const events: RadarWebhookEvent[] =
      body.data ?? (body.event ? [body.event] : []);

    if (events.length === 0) {
      return c.json({ message: "No events" }, HttpStatusCodes.OK);
    }

    // Send each event to the queue for async processing
    for (const event of events) {
      try {
        await c.env.GEOFENCE_EVENTS.send({
          body: event,
        });
      } catch (error) {
        console.error("Failed to queue Radar event:", error);
      }
    }

    return c.json({ processed: events.length }, HttpStatusCodes.OK);
  })
  .get("/health", (c) => c.json({ status: "ok" }, HttpStatusCodes.OK));
