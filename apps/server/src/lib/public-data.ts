interface VenueInternalFields {
  createdByUserId?: unknown;
  radarPlaceId?: unknown;
}

export const toPublicVenue = <T extends VenueInternalFields>(record: T) => {
  const {
    createdByUserId: _createdByUserId,
    radarPlaceId: _radarPlaceId,
    ...publicRecord
  } = record;
  return publicRecord;
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
