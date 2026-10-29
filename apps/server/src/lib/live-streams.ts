import type { createDb } from "@rallycaststv/db";
import { user } from "@rallycaststv/db/schema/auth";
import { event, liveStream, video } from "@rallycaststv/db/schema/domain";
import { eq } from "drizzle-orm";

import { createId } from "./ids";
import { MUX_RTMP_INGEST_URL } from "./mux-client";
import {
  indexSearchDocumentVector,
  removeSearchDocument,
  upsertSearchDocument,
} from "./search-index";
import type { AppEnv } from "./types";

type Db = ReturnType<typeof createDb>;
type LiveStreamRecord = typeof liveStream.$inferSelect;
type LiveStreamStatus = LiveStreamRecord["status"];

interface LiveStreamOwner {
  displayUsername?: string | null;
  id: string;
  image?: string | null;
  name: string;
  username?: string | null;
}

interface LiveStreamEvent {
  id: string;
  name: string;
  startsAt: Date | null;
}

const LIVE_STATUS_BY_EVENT: Record<string, LiveStreamStatus> = {
  "video.live_stream.active": "active",
  "video.live_stream.connected": "connected",
  "video.live_stream.created": "idle",
  "video.live_stream.deleted": "completed",
  "video.live_stream.disconnected": "disconnected",
  "video.live_stream.errored": "failed",
  "video.live_stream.idle": "completed",
  "video.live_stream.recording": "recording",
};

export const isLiveStatus = (status: LiveStreamStatus) =>
  status === "active" || status === "connected" || status === "recording";

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

const getStringArrayProperty = (value: unknown, key: string) => {
  if (!value || typeof value !== "object" || !(key in value)) {
    return [];
  }
  const property = (value as Record<string, unknown>)[key];
  return Array.isArray(property)
    ? property.filter((item): item is string => typeof item === "string")
    : [];
};

const getPlaybackId = (value: unknown) => {
  if (!value || typeof value !== "object" || !("playback_ids" in value)) {
    return null;
  }
  const playbackIds = (value as Record<string, unknown>).playback_ids;
  if (!Array.isArray(playbackIds) || playbackIds.length === 0) {
    return null;
  }
  return getStringProperty(playbackIds[0], "id");
};

export const toPublicLiveStream = (
  record: LiveStreamRecord,
  owner: LiveStreamOwner | null,
  eventRecord: LiveStreamEvent | null
) => ({
  createdAt: record.createdAt,
  description: record.description,
  endedAt: record.endedAt,
  event: eventRecord,
  id: record.id,
  isLive: isLiveStatus(record.status),
  latencyMode: record.latencyMode,
  muxPlaybackId: record.muxPlaybackId,
  owner,
  recordingVideoId: record.recordingVideoId,
  startedAt: record.startedAt,
  status: record.status,
  title: record.title,
  visibility: record.visibility,
});

export const toOwnerLiveStream = (
  record: LiveStreamRecord,
  owner: LiveStreamOwner | null,
  eventRecord: LiveStreamEvent | null
) => ({
  ...toPublicLiveStream(record, owner, eventRecord),
  ingestUrl: MUX_RTMP_INGEST_URL,
  muxLiveStreamId: record.muxLiveStreamId,
  streamKey: record.muxStreamKey,
});

export const getLiveStreamWithRelations = async (
  db: Db,
  id: string
): Promise<{
  eventRecord: LiveStreamEvent | null;
  owner: LiveStreamOwner | null;
  record: LiveStreamRecord;
} | null> => {
  const [row] = await db
    .select({
      eventId: event.id,
      eventName: event.name,
      eventStartsAt: event.startsAt,
      live: liveStream,
      ownerDisplayUsername: user.displayUsername,
      ownerId: user.id,
      ownerImage: user.image,
      ownerName: user.name,
      ownerUsername: user.username,
    })
    .from(liveStream)
    .innerJoin(user, eq(liveStream.ownerUserId, user.id))
    .leftJoin(event, eq(liveStream.eventId, event.id))
    .where(eq(liveStream.id, id))
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    eventRecord: row.eventId
      ? {
          id: row.eventId,
          name: row.eventName ?? "",
          startsAt: row.eventStartsAt ?? null,
        }
      : null,
    owner: {
      displayUsername: row.ownerDisplayUsername,
      id: row.ownerId,
      image: row.ownerImage,
      name: row.ownerName,
      username: row.ownerUsername,
    },
    record: row.live,
  };
};

const createReplayVideo = async (
  db: Db,
  env: AppEnv["Bindings"],
  record: LiveStreamRecord,
  data: Record<string, unknown>
) => {
  const muxAssetId = getStringProperty(data, "id");
  if (!muxAssetId) {
    return null;
  }

  const muxPlaybackId = getPlaybackId(data);
  const duration = getNumberProperty(data, "duration");
  const now = new Date();
  const isPublic = record.visibility === "public";

  const values = {
    description: record.description,
    durationSeconds: duration === null ? undefined : Math.round(duration),
    mediaType: "video" as const,
    muxAssetId,
    muxPlaybackId: muxPlaybackId ?? undefined,
    muxPlaybackPolicy: isPublic ? ("public" as const) : ("signed" as const),
    muxStatus: "video.asset.live_stream_completed",
    ownerUserId: record.ownerUserId,
    publishedAt: now,
    status: "ready" as const,
    title: `${record.title} replay`,
    updatedAt: now,
    visibility: isPublic ? ("public" as const) : ("private" as const),
  };

  // A reusable Mux stream produces a new asset for each broadcast. Deduplicate
  // webhook retries by asset, not by the stream's most recent replay pointer.
  const [existingReplay] = await db
    .select({ id: video.id })
    .from(video)
    .where(eq(video.muxAssetId, muxAssetId))
    .limit(1);
  let replayVideoId = existingReplay?.id;
  if (replayVideoId) {
    await db.update(video).set(values).where(eq(video.id, replayVideoId));
  } else {
    replayVideoId = createId();
    await db.insert(video).values({ id: replayVideoId, ...values });
  }

  await db
    .update(liveStream)
    .set({
      endedAt: now,
      recordingAssetId: muxAssetId,
      recordingVideoId: replayVideoId,
      status: "completed",
      updatedAt: now,
    })
    .where(eq(liveStream.id, record.id));

  const [replayVideo] = await db
    .select()
    .from(video)
    .where(eq(video.id, replayVideoId))
    .limit(1);

  if (replayVideo && isPublic) {
    const searchRecord = await upsertSearchDocument(db, {
      content: [replayVideo.title, replayVideo.description]
        .filter(Boolean)
        .join("\n"),
      entityId: replayVideo.id,
      entityType: "video",
      metadata: {
        mediaType: replayVideo.mediaType,
        ownerUserId: replayVideo.ownerUserId,
        venueId: replayVideo.venueId,
      },
      title: replayVideo.title,
    });
    await indexSearchDocumentVector(db, env, searchRecord);
  } else if (replayVideo) {
    await removeSearchDocument(db, env, "video", replayVideo.id);
  }

  return replayVideo ?? null;
};

export const applyMuxLiveStreamUpdate = async (
  db: Db,
  env: AppEnv["Bindings"],
  eventType: string,
  data: Record<string, unknown> | null
) => {
  if (!data) {
    return null;
  }

  if (eventType === "video.asset.live_stream_completed") {
    const muxLiveStreamId = getStringProperty(data, "live_stream_id");
    const passthrough = getStringProperty(data, "passthrough");
    let record: LiveStreamRecord | undefined;
    if (muxLiveStreamId) {
      [record] = await db
        .select()
        .from(liveStream)
        .where(eq(liveStream.muxLiveStreamId, muxLiveStreamId))
        .limit(1);
    } else if (passthrough) {
      [record] = await db
        .select()
        .from(liveStream)
        .where(eq(liveStream.id, passthrough))
        .limit(1);
    }
    if (!record) {
      return null;
    }
    return await createReplayVideo(db, env, record, data);
  }

  const muxLiveStreamId = getStringProperty(data, "id");
  const nextStatus = LIVE_STATUS_BY_EVENT[eventType];
  if (!(muxLiveStreamId && nextStatus)) {
    return null;
  }

  const [record] = await db
    .select()
    .from(liveStream)
    .where(eq(liveStream.muxLiveStreamId, muxLiveStreamId))
    .limit(1);
  if (!record) {
    return null;
  }

  const now = new Date();
  const activeAssetId =
    getStringProperty(data, "active_asset_id") ??
    getStringArrayProperty(data, "recent_asset_ids")[0] ??
    null;
  const playbackId = getPlaybackId(data) ?? record.muxPlaybackId;

  const [updated] = await db
    .update(liveStream)
    .set({
      endedAt: nextStatus === "completed" ? now : record.endedAt,
      muxPlaybackId: playbackId,
      recordingAssetId:
        nextStatus === "completed"
          ? (activeAssetId ?? record.recordingAssetId)
          : record.recordingAssetId,
      startedAt:
        nextStatus === "active" && !record.startedAt ? now : record.startedAt,
      status: nextStatus,
      updatedAt: now,
    })
    .where(eq(liveStream.id, record.id))
    .returning();

  return updated ?? null;
};

export const syncMuxLiveStream = async (
  db: Db,
  record: LiveStreamRecord,
  muxLiveStream: {
    activeAssetId: string | null;
    playbackId: string | null;
    status: string;
  }
) => {
  let status: LiveStreamStatus = "idle";
  if (muxLiveStream.status === "active") {
    status = "active";
  } else if (muxLiveStream.status === "connected") {
    status = "connected";
  } else if (muxLiveStream.status === "recording") {
    status = "recording";
  } else if (muxLiveStream.status === "idle") {
    status = record.startedAt ? "completed" : "idle";
  } else if (muxLiveStream.status === "error") {
    status = "failed";
  }

  const now = new Date();
  const [updated] = await db
    .update(liveStream)
    .set({
      endedAt:
        status === "completed" ? (record.endedAt ?? now) : record.endedAt,
      muxPlaybackId: muxLiveStream.playbackId ?? record.muxPlaybackId,
      recordingAssetId: muxLiveStream.activeAssetId ?? record.recordingAssetId,
      startedAt:
        status === "active" && !record.startedAt ? now : record.startedAt,
      status,
      updatedAt: now,
    })
    .where(eq(liveStream.id, record.id))
    .returning();

  return updated ?? record;
};
