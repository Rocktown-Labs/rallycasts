/**
 * Human-readable video URL slugs.
 *
 * Format: `<slugified-title>-<uuid>`. The embedded UUID keeps slugs unique
 * and lets the server resolve them with a direct index lookup instead of a
 * slug column, while the title prefix makes shared links readable.
 */

const UUID_EXTRACT_REGEX =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/iu;

export const slugifyVideoTitle = (title: string): string =>
  title
    .toLowerCase()
    .trim()
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/^-+|-+$/gu, "");

/** Build the canonical slug for a video. Falls back to the raw id. */
export const buildVideoSlug = (video: {
  id: string;
  title?: null | string;
}): string => {
  if (!video.title) {
    return video.id;
  }
  const slug = slugifyVideoTitle(video.title);
  return slug ? `${slug}-${video.id}` : video.id;
};

/** Extract the embedded UUID from a slug, if any. */
export const extractVideoUuid = (idOrSlug: string): null | string => {
  const match = idOrSlug.match(UUID_EXTRACT_REGEX);
  return match ? match[0] : null;
};
