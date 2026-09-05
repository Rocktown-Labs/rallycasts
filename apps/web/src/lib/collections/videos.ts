import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";
import type { QueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { readApiJson } from "@/lib/hooks/api";
import { queryClient as defaultQueryClient } from "@/lib/query-client";

export interface VideoRecord {
  createdAt: string;
  description?: string | null;
  durationSeconds?: number | null;
  id: string;
  mediaType: "photo" | "short" | "video";
  status: "draft" | "failed" | "processing" | "ready" | "uploading";
  thumbnailUrl?: string | null;
  title: string;
  visibility: "friends" | "private" | "public";
  $synced?: boolean;
}

export interface VideoCommentUser {
  displayUsername?: string | null;
  id: string;
  image?: string | null;
  name: string | null;
  username: string | null;
}

export interface VideoCommentRecord {
  content: string;
  createdAt: string;
  id: string;
  isPinned?: boolean | null;
  pinnedAt?: string | null;
  updatedAt?: string;
  user: VideoCommentUser | null;
  $synced?: boolean;
}

export const myVideosCollection = createCollection(
  queryCollectionOptions({
    getKey: (item: VideoRecord) => item.id,
    id: "my-videos",
    queryClient: defaultQueryClient,
    queryFn: () =>
      readApiJson<{ videos: VideoRecord[] }>(apiClient.api.v1.videos.me.$get()),
    queryKey: ["videos", "me"],
    select: (res: { videos: VideoRecord[] }) => res.videos ?? [],
  })
);

const commentsCollectionsByClient = new WeakMap<
  QueryClient,
  Map<string, ReturnType<typeof createCommentsCollection>>
>();

function createCommentsCollection(qc: QueryClient, videoId: string) {
  return createCollection(
    queryCollectionOptions({
      getKey: (item: VideoCommentRecord) => item.id,
      id: `comments-${videoId}`,
      onInsert: async ({ transaction }) => {
        const item = transaction.mutations[0].modified as VideoCommentRecord;
        await readApiJson(
          apiClient.api.v1.videos[":id"].comments.$post({
            json: { content: item.content },
            param: { id: videoId },
          })
        );
      },
      onUpdate: async ({ transaction }) => {
        const item = transaction.mutations[0].modified as VideoCommentRecord;
        await readApiJson(
          apiClient.api.v1.videos[":id"].comments[":commentId"].pin.$patch({
            json: { pinned: Boolean(item.isPinned) },
            param: { commentId: item.id, id: videoId },
          })
        );
      },
      queryClient: qc,
      queryFn: () =>
        readApiJson<{ comments: VideoCommentRecord[] }>(
          apiClient.api.v1.videos[":id"].comments.$get({
            param: { id: videoId },
          })
        ),
      queryKey: ["videos", videoId, "comments"],
      select: (res: { comments: VideoCommentRecord[] }) => res.comments ?? [],
    })
  );
}

export function getVideoCommentsCollection(qc: QueryClient, videoId: string) {
  let map = commentsCollectionsByClient.get(qc);
  if (!map) {
    map = new Map();
    commentsCollectionsByClient.set(qc, map);
  }
  let col = map.get(videoId);
  if (!col) {
    col = createCommentsCollection(qc, videoId);
    map.set(videoId, col);
  }
  return col;
}
