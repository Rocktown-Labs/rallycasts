import { createDb } from "@rallycaststv/db";
import { webhookEvent } from "@rallycaststv/db/schema/domain";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { Resend } from "resend";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { z } from "zod";

import { readJsonPayload } from "../lib/json";
import type { AppEnv } from "../lib/types";

const radarEventSchema = z.object({
  _id: z.string().min(1),
  confidence: z.number().finite(),
  createdAt: z.string().datetime(),
  duration: z.number().finite().optional(),
  geofence: z.object({
    description: z.string(),
    externalId: z.string().min(1),
    metadata: z.record(z.string(), z.unknown()).optional(),
    tag: z.string().min(1),
  }),
  location: z.object({
    coordinates: z.tuple([z.number().finite(), z.number().finite()]),
    type: z.literal("Point"),
  }),
  locationAccuracy: z.number().finite(),
  type: z.enum(["user.entered_geofence", "user.exited_geofence"]),
  user: z.object({
    deviceId: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    userId: z.string().min(1).optional(),
  }),
});

const radarPayloadSchema = z
  .object({
    data: z.array(radarEventSchema).max(100).optional(),
    event: radarEventSchema.optional(),
  })
  .refine((payload) => Boolean(payload.data || payload.event), {
    message: "No Radar events",
  });

const resendEventSchema = z.object({
  type: z.string().trim().min(1).max(100),
});

const hexToBytes = (value: string): Uint8Array | null => {
  if (value.length % 2 !== 0 || !/^[a-f\d]+$/iu.test(value)) {
    return null;
  }
  return new Uint8Array(
    Array.from({ length: value.length / 2 }, (_, index) =>
      Number.parseInt(value.slice(index * 2, index * 2 + 2), 16)
    )
  );
};

const verifyRadarSignature = async (
  signingId: string | undefined,
  signature: string | undefined,
  secret: string
): Promise<boolean> => {
  if (!(signingId && signature)) {
    return false;
  }
  const signatureBytes = hexToBytes(signature);
  if (!signatureBytes) {
    return false;
  }
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { hash: "SHA-1", name: "HMAC" },
    false,
    ["verify"]
  );
  return crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes as BufferSource,
    new TextEncoder().encode(signingId)
  );
};

const recordWebhook = async (
  db: ReturnType<typeof createDb>,
  input: {
    eventType: string;
    payloadJson: string;
    provider: "radar" | "resend";
    providerEventId: string;
  }
) => {
  const [inserted] = await db
    .insert(webhookEvent)
    .values({
      eventType: input.eventType,
      id: crypto.randomUUID(),
      payloadJson: input.payloadJson,
      provider: input.provider,
      providerEventId: input.providerEventId,
    })
    .onConflictDoNothing()
    .returning({ id: webhookEvent.id });

  if (inserted) {
    return { id: inserted.id, shouldProcess: true };
  }

  const [existing] = await db
    .select({ id: webhookEvent.id, status: webhookEvent.status })
    .from(webhookEvent)
    .where(
      and(
        eq(webhookEvent.provider, input.provider),
        eq(webhookEvent.providerEventId, input.providerEventId)
      )
    )
    .limit(1);

  return {
    id: existing?.id ?? null,
    shouldProcess: existing?.status !== "processed",
  };
};

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
    const secret = c.env.RADAR_WEBHOOK_SECRET;
    if (!secret) {
      return c.json(
        { message: "Radar webhook is not configured" },
        HttpStatusCodes.SERVICE_UNAVAILABLE
      );
    }

    const payload = await readJsonPayload(c.req.raw);
    if (!payload.ok) {
      return c.json(
        { message: "Invalid webhook payload" },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    const signatureValid = await verifyRadarSignature(
      c.req.header("X-Radar-Signing-Id"),
      c.req.header("X-Radar-Signature"),
      secret
    );
    if (!signatureValid) {
      return c.json(
        { message: "Radar webhook signature is missing or invalid" },
        HttpStatusCodes.UNAUTHORIZED
      );
    }

    const parsed = radarPayloadSchema.safeParse(payload.value);
    if (!parsed.success) {
      return c.json(
        { message: "Invalid Radar webhook payload" },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    const events =
      parsed.data.data ?? (parsed.data.event ? [parsed.data.event] : []);
    const db = createDb(c.env.DB);
    let queued = 0;
    let failed = 0;

    for (const radarEvent of events) {
      // oxlint-disable-next-line eslint/no-await-in-loop -- per-event record/send/mark flow with error tallies; batches are small
      const webhook = await recordWebhook(db, {
        eventType: radarEvent.type,
        payloadJson: JSON.stringify(radarEvent),
        provider: "radar",
        providerEventId: radarEvent._id,
      });
      if (!webhook.shouldProcess) {
        continue;
      }

      try {
        // oxlint-disable-next-line eslint/no-await-in-loop -- per-event record/send/mark flow with error tallies; batches are small
        await c.env.GEOFENCE_EVENTS.send({ body: radarEvent });
        if (webhook.id) {
          // oxlint-disable-next-line eslint/no-await-in-loop -- per-event record/send/mark flow with error tallies; batches are small
          await db
            .update(webhookEvent)
            .set({ processedAt: new Date(), status: "processed" })
            .where(eq(webhookEvent.id, webhook.id));
        }
        queued += 1;
      } catch (error) {
        failed += 1;
        console.error(
          JSON.stringify({
            event: "radar_webhook_queue_failed",
            message: error instanceof Error ? error.message : "unknown error",
            providerEventId: radarEvent._id,
          })
        );
        if (webhook.id) {
          // oxlint-disable-next-line eslint/no-await-in-loop -- per-event record/send/mark flow with error tallies; batches are small
          await db
            .update(webhookEvent)
            .set({ status: "failed" })
            .where(eq(webhookEvent.id, webhook.id));
        }
      }
    }

    if (failed > 0) {
      return c.json({ failed, queued }, HttpStatusCodes.SERVICE_UNAVAILABLE);
    }

    return c.json({ processed: events.length, queued }, HttpStatusCodes.OK);
  })
  .post("/resend", async (c) => {
    const webhookSecret = c.env.RESEND_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return c.json(
        { error: "Resend webhook is not configured" },
        HttpStatusCodes.SERVICE_UNAVAILABLE
      );
    }

    const payload = await readJsonPayload(c.req.raw);
    if (!payload.ok) {
      return c.json(
        { error: "Invalid webhook payload" },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    const svixId = c.req.header("svix-id");
    const svixTimestamp = c.req.header("svix-timestamp");
    const svixSignature = c.req.header("svix-signature");
    if (!(svixId && svixTimestamp && svixSignature)) {
      return c.json(
        { error: "Invalid signature" },
        HttpStatusCodes.UNAUTHORIZED
      );
    }

    const resend = new Resend(c.env.RESEND_API_KEY ?? "");
    try {
      resend.webhooks.verify({
        headers: {
          id: svixId,
          signature: svixSignature,
          timestamp: svixTimestamp,
        },
        payload: payload.raw,
        webhookSecret,
      });
    } catch {
      return c.json(
        { error: "Invalid signature" },
        HttpStatusCodes.UNAUTHORIZED
      );
    }

    const parsedEvent = resendEventSchema.safeParse(payload.value);
    if (!parsedEvent.success) {
      return c.json(
        { error: "Invalid Resend webhook payload" },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    const db = createDb(c.env.DB);
    const webhook = await recordWebhook(db, {
      eventType: parsedEvent.data.type,
      payloadJson: payload.raw,
      provider: "resend",
      providerEventId: svixId,
    });
    if (webhook.id && webhook.shouldProcess) {
      await db
        .update(webhookEvent)
        .set({ processedAt: new Date(), status: "processed" })
        .where(eq(webhookEvent.id, webhook.id));
    }

    return c.json({ received: true }, HttpStatusCodes.OK);
  })
  .get("/health", (c) => c.json({ status: "ok" }, HttpStatusCodes.OK));
