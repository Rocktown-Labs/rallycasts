import { createDb } from "@rallycaststv/db";
import { video, webhookEvent } from "@rallycaststv/db/schema/domain";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { createId } from "../lib/ids";
import { readJsonPayload } from "../lib/json";
import { replaceMuxAssetPlaybackPolicy } from "../lib/mux-client";
import {
  indexSearchDocumentVector,
  removeSearchDocument,
  upsertSearchDocument,
} from "../lib/search-index";
import type { AppEnv } from "../lib/types";

const getRecord = (value: unknown, key: string) => {
  if (!value || typeof value !== "object" || !(key in value)) {
    return null;
  }

  const property = (value as Record<string, unknown>)[key];
  return property && typeof property === "object"
    ? (property as Record<string, unknown>)
    : null;
};

const getStringProperty = (value: unknown, key: string) => {
  if (!value || typeof value !== "object" || !(key in value)) {
    return null;
  }

  const property = (value as Record<string, unknown>)[key];
  return typeof property === "string" ? property : null;
};

const getNumberProperty = (value: unknown, key: string) => {
  if (!value || typeof value !== "object" || !(key in value)) {
    return null;
  }

  const property = (value as Record<string, unknown>)[key];
  return typeof property === "number" ? property : null;
};

const hexToBytes = (value: string) => {
  if (value.length % 2 !== 0 || !/^[a-f\d]+$/iu.test(value)) {
    return null;
  }
  return new Uint8Array(
    Array.from({ length: value.length / 2 }, (_, index) =>
      Number.parseInt(value.slice(index * 2, index * 2 + 2), 16)
    )
  );
};

const getMuxObjectIds = (
  eventType: string,
  data: Record<string, unknown> | null
) => {
  if (!data) {
    return { muxAssetId: null, muxUploadId: null };
  }
  if (eventType.startsWith("video.upload.")) {
    return {
      muxAssetId: getStringProperty(data, "asset_id"),
      muxUploadId: getStringProperty(data, "id"),
    };
  }
  return {
    muxAssetId: getStringProperty(data, "id"),
    muxUploadId: getStringProperty(data, "upload_id"),
  };
};

const getAssetVideoStatus = (eventType: string) => {
  if (eventType === "video.asset.ready") {
    return "ready" as const;
  }
  if (eventType === "video.asset.errored") {
    return "failed" as const;
  }
  return "processing" as const;
};

interface MuxVideoUpdate {
  duration: number | null;
  eventType: string;
  muxAssetId: string | null;
  muxPlaybackId: string | null;
  muxStatus: string | null;
  muxUploadId: string | null;
}

// oxlint-disable-next-line complexity -- Mux lifecycle events intentionally converge here.
const applyMuxVideoUpdate = async (
  db: ReturnType<typeof createDb>,
  env: AppEnv["Bindings"],
  update: MuxVideoUpdate
) => {
  const {
    duration,
    eventType,
    muxAssetId,
    muxPlaybackId,
    muxStatus,
    muxUploadId,
  } = update;

  if (muxUploadId && eventType === "video.upload.asset_created") {
    const [updated] = await db
      .update(video)
      .set({
        muxAssetId: muxAssetId ?? undefined,
        muxStatus: "asset_created",
        status: "processing",
        updatedAt: new Date(),
      })
      .where(eq(video.muxUploadId, muxUploadId))
      .returning();
    return updated;
  }

  if (
    muxUploadId &&
    ["video.upload.cancelled", "video.upload.errored"].includes(eventType)
  ) {
    const [updated] = await db
      .update(video)
      .set({ muxStatus: eventType, status: "failed", updatedAt: new Date() })
      .where(eq(video.muxUploadId, muxUploadId))
      .returning();
    return updated;
  }

  if (!muxAssetId) {
    return;
  }

  const videoFilter = muxUploadId
    ? eq(video.muxUploadId, muxUploadId)
    : eq(video.muxAssetId, muxAssetId);
  const [existingVideo] = await db
    .select({
      muxPlaybackId: video.muxPlaybackId,
      muxPlaybackPolicy: video.muxPlaybackPolicy,
      visibility: video.visibility,
    })
    .from(video)
    .where(videoFilter)
    .limit(1);
  let persistedPlaybackId = muxPlaybackId;
  if (existingVideo && eventType === "video.asset.ready") {
    const desiredPlaybackPolicy =
      existingVideo.visibility === "public" ? "public" : "signed";
    if (existingVideo.muxPlaybackPolicy !== desiredPlaybackPolicy) {
      if (!(env.MUX_TOKEN_ID && env.MUX_TOKEN_SECRET)) {
        throw new Error(
          "Mux credentials are required to update playback policy"
        );
      }
      persistedPlaybackId = await replaceMuxAssetPlaybackPolicy(
        muxAssetId,
        desiredPlaybackPolicy,
        env.MUX_TOKEN_ID,
        env.MUX_TOKEN_SECRET,
        muxPlaybackId ?? existingVideo.muxPlaybackId
      );
    }
  }
  const status = getAssetVideoStatus(eventType);
  let muxPlaybackPolicy: "public" | "signed" | undefined;
  if (status === "ready" && existingVideo) {
    muxPlaybackPolicy =
      existingVideo.visibility === "public" ? "public" : "signed";
  }
  const [updated] = await db
    .update(video)
    .set({
      durationSeconds: duration === null ? undefined : Math.round(duration),
      muxAssetId,
      muxPlaybackId: persistedPlaybackId ?? undefined,
      muxPlaybackPolicy,
      muxStatus: muxStatus ?? eventType,
      publishedAt: status === "ready" ? new Date() : undefined,
      status,
      updatedAt: new Date(),
    })
    .where(videoFilter)
    .returning();

  return updated;
};

const verifyMuxSignature = async (
  rawBody: string,
  signatureHeader: string | undefined,
  secret: string
) => {
  if (!signatureHeader) {
    return false;
  }

  const signatureParts = new Map(
    signatureHeader.split(",").map((part) => {
      const [key, value] = part.split("=", 2);
      return [key, value] as const;
    })
  );
  const timestamp = signatureParts.get("t");
  const signature = signatureParts.get("v1");
  const timestampSeconds = Number(timestamp);

  if (
    !timestamp ||
    !signature ||
    !Number.isFinite(timestampSeconds) ||
    Math.abs(Date.now() / 1000 - timestampSeconds) > 300
  ) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["verify"]
  );
  const signatureBytes = hexToBytes(signature);
  if (!signatureBytes) {
    return false;
  }

  return crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    new TextEncoder().encode(`${timestamp}.${rawBody}`)
  );
};

export const muxRouter = new Hono<AppEnv>()
  .get("/status", (c) =>
    c.json(
      {
        message: "Mux direct uploads and signed webhooks are ready.",
        videoUploads: "ready",
      },
      HttpStatusCodes.OK
    )
  )
  // oxlint-disable-next-line complexity -- Webhook parsing validates several Mux event variants.
  .post("/webhook", async (c) => {
    const payload = await readJsonPayload(c.req.raw);
    const webhookSecret = c.env.MUX_WEBHOOK_SECRET;

    if (
      !webhookSecret ||
      !(await verifyMuxSignature(
        payload.ok ? payload.raw : "",
        c.req.header("Mux-Signature"),
        webhookSecret
      ))
    ) {
      return c.json(
        { message: "Mux webhook signature is missing or invalid" },
        HttpStatusCodes.UNAUTHORIZED
      );
    }
    if (!payload.ok) {
      return c.json(
        { message: "Invalid webhook payload" },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    const { value } = payload;
    const providerEventId = getStringProperty(value, "id");
    const eventType = getStringProperty(value, "type");
    if (!(providerEventId && eventType)) {
      return c.json(
        { message: "Invalid Mux webhook payload" },
        HttpStatusCodes.BAD_REQUEST
      );
    }
    const db = createDb(c.env.DB);
    const data = getRecord(value, "data");
    const { muxAssetId, muxUploadId } = getMuxObjectIds(eventType, data);
    const playbackIds = data?.playback_ids;
    const muxPlaybackId = Array.isArray(playbackIds)
      ? getStringProperty(playbackIds[0], "id")
      : null;
    const muxStatus = data ? getStringProperty(data, "status") : null;
    const duration = data ? getNumberProperty(data, "duration") : null;

    const [insertedEvent] = await db
      .insert(webhookEvent)
      .values({
        eventType,
        id: createId(),
        payloadJson: payload.raw,
        provider: "mux",
        providerEventId,
      })
      .onConflictDoNothing()
      .returning({ id: webhookEvent.id });
    let webhookEventId = insertedEvent?.id;

    if (!insertedEvent) {
      const [existingEvent] = await db
        .select({ id: webhookEvent.id, status: webhookEvent.status })
        .from(webhookEvent)
        .where(
          and(
            eq(webhookEvent.provider, "mux"),
            eq(webhookEvent.providerEventId, providerEventId)
          )
        )
        .limit(1);
      if (existingEvent?.status === "processed") {
        return c.json(
          { eventType, providerEventId, received: true },
          HttpStatusCodes.OK
        );
      }
      if (!existingEvent) {
        return c.json(
          { message: "Webhook could not be recorded" },
          HttpStatusCodes.SERVICE_UNAVAILABLE
        );
      }
      webhookEventId = existingEvent.id;
    }

    let updatedVideo: Awaited<ReturnType<typeof applyMuxVideoUpdate>>;
    try {
      updatedVideo = await applyMuxVideoUpdate(db, c.env, {
        duration,
        eventType,
        muxAssetId,
        muxPlaybackId,
        muxStatus,
        muxUploadId,
      });
    } catch (error) {
      await db
        .update(webhookEvent)
        .set({ status: "failed" })
        .where(eq(webhookEvent.id, webhookEventId ?? ""));
      console.error(
        JSON.stringify({
          event: "mux_webhook_processing_failed",
          message: error instanceof Error ? error.message : "unknown error",
          providerEventId,
        })
      );
      return c.json(
        { message: "Mux webhook processing failed" },
        HttpStatusCodes.SERVICE_UNAVAILABLE
      );
    }

    await db
      .update(webhookEvent)
      .set({ processedAt: new Date(), status: "processed" })
      .where(eq(webhookEvent.id, webhookEventId ?? ""));

    if (
      updatedVideo?.status === "ready" &&
      updatedVideo.visibility === "public"
    ) {
      const searchRecord = await upsertSearchDocument(db, {
        content: [updatedVideo.title, updatedVideo.description]
          .filter(Boolean)
          .join("\n"),
        entityId: updatedVideo.id,
        entityType: "video",
        metadata: {
          mediaType: updatedVideo.mediaType,
          ownerUserId: updatedVideo.ownerUserId,
          venueId: updatedVideo.venueId,
        },
        title: updatedVideo.title,
      });
      await indexSearchDocumentVector(db, c.env, searchRecord);
    } else if (updatedVideo) {
      await removeSearchDocument(db, c.env, "video", updatedVideo.id);
    }

    return c.json(
      { eventType, providerEventId, received: true },
      HttpStatusCodes.ACCEPTED
    );
  });
