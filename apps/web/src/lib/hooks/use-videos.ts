import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import {
  demoVideos,
  getDemoVideoDetail,
  getDemoVideoPage,
  withDemoList,
} from "@/lib/demo-data";

import { readApiJson } from "./api";

export const useVideos = () =>
  useQuery({
    queryFn: async () => {
      try {
        return await readApiJson(apiClient.api.v1.videos.$get());
      } catch {
        return { videos: demoVideos };
      }
    },
    queryKey: ["videos"],
    select: (data) => withDemoList(data, "videos", demoVideos),
  });

export const useRecommendedVideos = (enabled = true) =>
  useQuery({
    enabled,
    queryFn: async () => {
      try {
        return await readApiJson(apiClient.api.v1.videos.feed.$get());
      } catch {
        return {
          mode: "fallback" as const,
          videos: demoVideos.map((video) => ({
            ...video,
            recommendationReason: "Popular on RallyCasts",
            recommendationScore: 0,
          })),
        };
      }
    },
    queryKey: ["videos", "feed"],
  });

export const useInfiniteVideos = (limit = 12) =>
  useInfiniteQuery({
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      if (pageParam?.startsWith("demo:")) {
        return getDemoVideoPage(pageParam, limit);
      }

      try {
        const result = await readApiJson(
          apiClient.api.v1.videos.$get({
            query: {
              ...(pageParam ? { cursor: pageParam } : {}),
              limit: String(limit),
            },
          })
        );

        return result.videos.length > 0 || pageParam
          ? result
          : getDemoVideoPage(undefined, limit);
      } catch {
        return getDemoVideoPage(pageParam, limit);
      }
    },
    queryKey: ["videos", "infinite", limit],
  });

export const useMyVideos = () =>
  useQuery({
    queryFn: () => readApiJson(apiClient.api.v1.videos.me.$get()),
    queryKey: ["videos", "me"],
  });

export const useVideo = (id: string) =>
  useQuery({
    enabled: id.length > 0,
    queryFn: async () => {
      const demoVideo = getDemoVideoDetail(id);
      if (demoVideo) {
        return demoVideo;
      }

      return await readApiJson(
        apiClient.api.v1.videos[":id"].$get({ param: { id } })
      );
    },
    queryKey: ["videos", id],
  });

export const useCreateVideo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (json: {
      description?: string;
      latitude?: number;
      longitude?: number;
      mediaType?: "video" | "short" | "photo";
      muxUploadId?: string;
      status?: "draft" | "uploading" | "processing" | "ready" | "failed";
      title: string;
      venueId?: string | null;
      visibility?: "public" | "friends" | "private";
      taggedUserIds?: string[];
    }) => readApiJson(apiClient.api.v1.videos.$post({ json })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["videos"] });
    },
  });
};

export const useVideoComments = (videoId: string, enabled = true) =>
  useQuery({
    enabled: enabled && videoId.length > 0,
    queryFn: () =>
      readApiJson(
        apiClient.api.v1.videos[":id"].comments.$get({
          param: { id: videoId },
        })
      ),
    queryKey: ["videos", videoId, "comments"],
  });

export const useAddVideoComment = (videoId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (json: { content: string }) =>
      readApiJson(
        apiClient.api.v1.videos[":id"].comments.$post({
          json,
          param: { id: videoId },
        })
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["videos", videoId, "comments"],
      });
    },
  });
};

export const usePinVideoComment = (videoId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (json: { commentId: string; pinned: boolean }) =>
      readApiJson(
        apiClient.api.v1.videos[":id"].comments[":commentId"].pin.$patch({
          json: { pinned: json.pinned },
          param: { commentId: json.commentId, id: videoId },
        })
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["videos", videoId, "comments"],
      });
    },
  });
};
