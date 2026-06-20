import { createDb } from "@rallycaststv/db";
import { video, webhookEvent } from "@rallycaststv/db/schema/domain";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { createId } from "../lib/ids";
import { readJsonPayload } from "../lib/json";
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
    await db
      .update(video)
      .set({
        muxAssetId: muxAssetId ?? undefined,
        muxStatus: "asset_created",
        status: "processing",
        updatedAt: new Date(),
      })
      .where(eq(video.muxUploadId, muxUploadId));
    return;
  }

  if (
    muxUploadId &&
    ["video.upload.cancelled", "video.upload.errored"].includes(eventType)
  ) {
    await db
      .update(video)
      .set({ muxStatus: eventType, status: "failed", updatedAt: new Date() })
      .where(eq(video.muxUploadId, muxUploadId));
    return;
  }

  if (!muxAssetId) {
    return;
  }

  const status = getAssetVideoStatus(eventType);
  await db
    .update(video)
    .set({
      durationSeconds: duration === null ? undefined : Math.round(duration),
      muxAssetId,
      muxPlaybackId: muxPlaybackId ?? undefined,
      muxStatus: muxStatus ?? eventType,
      publishedAt: status === "ready" ? new Date() : undefined,
      status,
      thumbnailUrl: muxPlaybackId
        ? `https://image.mux.com/${muxPlaybackId}/thumbnail.webp?time=1`
        : undefined,
      updatedAt: new Date(),
    })
    .where(
      muxUploadId
        ? eq(video.muxUploadId, muxUploadId)
        : eq(video.muxAssetId, muxAssetId)
    );
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
  .post("/webhook", async (c) => {
    const db = createDb(c.env.DB);
    const { raw, value } = await readJsonPayload(c.req.raw);
    const webhookSecret = c.env.MUX_WEBHOOK_SECRET;

    if (
      !webhookSecret ||
      !(await verifyMuxSignature(
        raw,
        c.req.header("Mux-Signature"),
        webhookSecret
      ))
    ) {
      return c.json(
        { message: "Mux webhook signature is missing or invalid" },
        HttpStatusCodes.UNAUTHORIZED
      );
    }

    const providerEventId = getStringProperty(value, "id") ?? createId();
    const eventType = getStringProperty(value, "type") ?? "mux.unknown";
    const data = getRecord(value, "data");
    const { muxAssetId, muxUploadId } = getMuxObjectIds(eventType, data);
    const playbackIds = data?.playback_ids;
    const muxPlaybackId = Array.isArray(playbackIds)
      ? getStringProperty(playbackIds[0], "id")
      : null;
    const muxStatus = data ? getStringProperty(data, "status") : null;
    const duration = data ? getNumberProperty(data, "duration") : null;

    const insertedEvents = await db
      .insert(webhookEvent)
      .values({
        eventType,
        id: createId(),
        payloadJson: raw,
        provider: "mux",
        providerEventId,
      })
      .onConflictDoNothing()
      .returning({ id: webhookEvent.id });

    if (insertedEvents.length === 0) {
      return c.json(
        { eventType, providerEventId, received: true },
        HttpStatusCodes.OK
      );
    }

    await applyMuxVideoUpdate(db, {
      duration,
      eventType,
      muxAssetId,
      muxPlaybackId,
      muxStatus,
      muxUploadId,
    });

    return c.json(
      { eventType, providerEventId, received: true },
      HttpStatusCodes.ACCEPTED
    );
  });
