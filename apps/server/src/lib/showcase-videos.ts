import type { createDb } from "@rallycaststv/db";
import { user } from "@rallycaststv/db/schema/auth";
import { video } from "@rallycaststv/db/schema/domain";
import { eq } from "drizzle-orm";

export const DEFAULT_SHOWCASE_VIDEO = {
  createdAt: "2026-09-20T01:42:52.534Z",
  description: null,
  durationSeconds: 588,
  id: "64383cc5-683a-4412-9abe-682af2a78908",
  latitude: null,
  longitude: null,
  mediaType: "video" as const,
  muxPlaybackId: "01zW01kknVxRrJ5Pb7OaX3b2tuUlHSCVlmfxBBIG02NF5U",
  organizationId: null,
  owner: {
    displayUsername: "cgstewart",
    id: "qZ5UJA7KK3QWQKGSOIW4jLqddWaldMak",
    image:
      "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCI+CiAgICA8ZGVmcz4KICAgICAgPGxpbmVhckdyYWRpZW50IGlkPSJncmFkLfCfj4YiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPgogICAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiM4YjVjZjYiIC8+CiAgICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjZDk0NmVmIiAvPgogICAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPC9kZWZzPgogICAgPHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIHJ4PSI1MCIgZmlsbD0idXJsKCNncmFkLfCfj4YpIiAvPgogICAgPHRleHQgeD0iNTAiIHk9IjU4IiBmb250LXNpemU9IjQ4IiBmb250LWZhbWlseT0ic3lzdGVtLXVpLCAtYXBwbGUtc3lzdGVtLCBzYW5zLXNlcmlmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0iY2VudHJhbCI+8J+PhjwvdGV4dD4KICA8L3N2Zz4=",
    name: "Cameron Stewart",
    username: "cgstewart",
  },
  ownerUserId: "qZ5UJA7KK3QWQKGSOIW4jLqddWaldMak",
  publishedAt: "2026-09-20T01:44:18.889Z",
  status: "ready" as const,
  taggedUserIds: ["qZ5UJA7KK3QWQKGSOIW4jLqddWaldMak"],
  taggedUsers: [
    {
      displayUsername: "cgstewart",
      id: "qZ5UJA7KK3QWQKGSOIW4jLqddWaldMak",
      image:
        "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCI+CiAgICA8ZGVmcz4KICAgICAgPGxpbmVhckdyYWRpZW50IGlkPSJncmFkLfCfj4YiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPgogICAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiM4YjVjZjYiIC8+CiAgICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjZDk0NmVmIiAvPgogICAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPC9kZWZzPgogICAgPHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIHJ4PSI1MCIgZmlsbD0idXJsKCNncmFkLfCfj4YpIiAvPgogICAgPHRleHQgeD0iNTAiIHk9IjU4IiBmb250LXNpemU9IjQ4IiBmb250LWZhbWlseT0ic3lzdGVtLXVpLCAtYXBwbGUtc3lzdGVtLCBzYW5zLXNlcmlmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0iY2VudHJhbCI+8J+PhjwvdGV4dD4KICA8L3N2Zz4=",
      name: "Cameron Stewart",
      username: "cgstewart",
    },
  ],
  thumbnailUrl: null,
  title: "LRAC Tournament",
  updatedAt: "2026-09-20T01:47:38.494Z",
  venue: null,
  venueId: null,
  visibility: "public" as const,
};

export const DEFAULT_SHOWCASE_VIDEOS = [DEFAULT_SHOWCASE_VIDEO];

export async function ensureShowcaseVideoInDb(
  db: ReturnType<typeof createDb>,
  videoId: string
) {
  const showcase = DEFAULT_SHOWCASE_VIDEOS.find((v) => v.id === videoId);
  if (!showcase) {
    return null;
  }

  try {
    const [existingUser] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, showcase.ownerUserId))
      .limit(1);

    if (!existingUser) {
      await db
        .insert(user)
        .values({
          createdAt: new Date(showcase.createdAt),
          displayUsername: showcase.owner.displayUsername,
          email: "cameron@rallycasts.com",
          emailVerified: true,
          id: showcase.owner.id,
          image: showcase.owner.image,
          name: showcase.owner.name,
          updatedAt: new Date(showcase.updatedAt),
          username: showcase.owner.username,
        })
        .onConflictDoNothing();
    }

    const [existingVideo] = await db
      .select({ id: video.id })
      .from(video)
      .where(eq(video.id, showcase.id))
      .limit(1);

    if (!existingVideo) {
      await db
        .insert(video)
        .values({
          createdAt: new Date(showcase.createdAt),
          description: showcase.description,
          durationSeconds: showcase.durationSeconds,
          id: showcase.id,
          mediaType: showcase.mediaType,
          muxPlaybackId: showcase.muxPlaybackId,
          muxPlaybackPolicy: "public",
          muxStatus: "ready",
          ownerUserId: showcase.ownerUserId,
          publishedAt: new Date(showcase.publishedAt),
          status: showcase.status,
          taggedUserIds: JSON.stringify(showcase.taggedUserIds),
          title: showcase.title,
          updatedAt: new Date(showcase.updatedAt),
          visibility: showcase.visibility,
        })
        .onConflictDoNothing();
    }
  } catch (error) {
    console.warn("Could not ensure showcase video in DB:", error);
  }

  return showcase;
}
