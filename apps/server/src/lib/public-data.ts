import { createVenueSlug } from "./venues";

interface VenueInternalFields {
  createdByUserId?: unknown;
  radarPlaceId?: unknown;
  name?: string | null;
  city?: string | null;
  state?: string | null;
}

export const toPublicVenue = <T extends VenueInternalFields>(record: T) => {
  const {
    createdByUserId: _createdByUserId,
    radarPlaceId: _radarPlaceId,
    ...publicRecord
  } = record;
  const slug = record.name
    ? createVenueSlug(record.name, record.city, record.state)
    : undefined;
  return {
    ...publicRecord,
    ...(slug ? { slug } : {}),
  };
};

interface VideoInternalFields {
  muxAssetId: unknown;
  muxPlaybackId: unknown;
  muxPlaybackPolicy: unknown;
  muxStatus: unknown;
  muxUploadId: unknown;
  r2Key: unknown;
  thumbnailUrl: unknown;
}

export const toPublicVideo = <T extends VideoInternalFields>(record: T) => {
  const {
    muxAssetId: _muxAssetId,
    muxPlaybackId,
    muxPlaybackPolicy,
    muxStatus: _muxStatus,
    muxUploadId: _muxUploadId,
    r2Key: _r2Key,
    thumbnailUrl,
    ...publicRecord
  } = record;
  const hasPublicPlayback =
    muxPlaybackPolicy === "public" && typeof muxPlaybackId === "string";

  return {
    ...publicRecord,
    ...(hasPublicPlayback
      ? { muxPlaybackId, thumbnailUrl: thumbnailUrl ?? null }
      : {}),
  };
};
