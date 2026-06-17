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
  .post("/resend", async (c) => {
    const payload = await c.req.text();
    const svixId = c.req.header("svix-id");
    const svixTimestamp = c.req.header("svix-timestamp");
    const svixSignature = c.req.header("svix-signature");

    const webhookSecret = c.env.RESEND_WEBHOOK_SECRET;
    const resendApiKey = c.env.RESEND_API_KEY;

    if (!resendApiKey) {
      return c.json(
        { error: "Resend API key not configured" },
        HttpStatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    if (webhookSecret && svixId && svixTimestamp && svixSignature) {
      const { Resend } = await import("resend");
      const resend = new Resend(resendApiKey);
      try {
        const event = resend.webhooks.verify({
          headers: {
            "svix-id": svixId,
            "svix-signature": svixSignature,
            "svix-timestamp": svixTimestamp,
          },
          payload,
          secret: webhookSecret,
        } as unknown as Parameters<typeof resend.webhooks.verify>[0]);

        console.log("Resend webhook event verified:", event.type);
      } catch (error) {
        console.error("Invalid Resend signature:", error);
        return c.json(
          { error: "Invalid signature" },
          HttpStatusCodes.BAD_REQUEST
        );
      }
    } else {
      console.warn(
        "Resend webhook signature verification skipped: missing secret or svix headers"
      );
    }

    return c.json({ success: true }, HttpStatusCodes.OK);
  })
  .get("/health", (c) => c.json({ status: "ok" }, HttpStatusCodes.OK));
