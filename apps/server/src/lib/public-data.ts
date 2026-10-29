import { buildVideoSlug } from "./slugs";
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
  editRecipe: unknown;
  id: string;
  muxAssetId: unknown;
  muxPlaybackId: unknown;
  muxPlaybackPolicy: unknown;
  muxStatus: unknown;
  muxUploadId: unknown;
  r2Key: unknown;
  thumbnailTimeSeconds: unknown;
  thumbnailUrl: unknown;
  title?: null | string;
  viewCount?: unknown;
}

/** The fallback poster frame Mux serves when no custom thumbnail is set. */
export const DEFAULT_THUMBNAIL_TIME_SECONDS = 1;

/**
 * Builds a Mux image URL for a video's poster frame. The creator can pick
 * the frame by storing `thumbnailTimeSeconds` on the video.
 */
export const muxThumbnailUrl = (
  muxPlaybackId: string,
  thumbnailTimeSeconds: unknown
): string => {
  const time =
    typeof thumbnailTimeSeconds === "number" &&
    Number.isFinite(thumbnailTimeSeconds) &&
    thumbnailTimeSeconds >= 0
      ? thumbnailTimeSeconds
      : DEFAULT_THUMBNAIL_TIME_SECONDS;
  return `https://image.mux.com/${encodeURIComponent(
    muxPlaybackId
  )}/thumbnail.webp?time=${time}`;
};

export const toPublicVideo = <T extends VideoInternalFields>(record: T) => {
  const {
    editRecipe: _editRecipe,
    muxAssetId: _muxAssetId,
    muxPlaybackId,
    muxPlaybackPolicy,
    muxStatus: _muxStatus,
    muxUploadId: _muxUploadId,
    r2Key: _r2Key,
    thumbnailTimeSeconds,
    thumbnailUrl,
    viewCount,
    ...publicRecord
  } = record;
  const hasPublicPlayback =
    muxPlaybackPolicy === "public" && typeof muxPlaybackId === "string";

  return {
    ...publicRecord,
    slug: buildVideoSlug(record),
    viewsCount: typeof viewCount === "number" ? viewCount : 0,
    ...(hasPublicPlayback
      ? {
          muxPlaybackId,
          thumbnailUrl:
            (typeof thumbnailUrl === "string" && thumbnailUrl) ||
            muxThumbnailUrl(muxPlaybackId, thumbnailTimeSeconds),
        }
      : {}),
  };
};
