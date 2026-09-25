import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import {
  demoEnabled,
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
      } catch (error) {
        if (demoEnabled) {
          return { videos: demoVideos };
        }
        throw error;
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
      } catch (error) {
        if (demoEnabled) {
          return {
            mode: "fallback" as const,
            videos: demoVideos.map((video) => ({
              ...video,
              recommendationReason: "Popular on RallyCasts",
              recommendationScore: 0,
            })),
          };
        }
        throw error;
      }
    },
    queryKey: ["videos", "feed"],
  });

export const useInfiniteVideos = (limit = 12) =>
  useInfiniteQuery({
    getNextPageParam: (lastPage: unknown) => {
      if (
        typeof lastPage !== "object" ||
        lastPage === null ||
        !("nextCursor" in lastPage) ||
        typeof lastPage.nextCursor !== "string"
      ) {
        return;
      }
      return lastPage.nextCursor;
    },
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      if (demoEnabled && pageParam?.startsWith("demo:")) {
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

        return demoEnabled && result.videos.length === 0 && !pageParam
          ? getDemoVideoPage(undefined, limit)
          : result;
      } catch (error) {
        if (demoEnabled) {
          return getDemoVideoPage(pageParam, limit);
        }
        throw error;
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
      const demoVideo = demoEnabled ? getDemoVideoDetail(id) : null;
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

export const useVideoSocial = (videoId: string, enabled = true) =>
  useQuery({
    enabled: enabled && videoId.length > 0,
    queryFn: () =>
      readApiJson(
        apiClient.api.v1.videos[":id"].social.$get({
          param: { id: videoId },
        })
      ),
    queryKey: ["videos", videoId, "social"],
  });

export const useRecordVideoView = (videoId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      readApiJson(
        apiClient.api.v1.videos[":id"].views.$post({
          param: { id: videoId },
        })
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["videos", videoId, "social"],
      });
    },
  });
};

export const useLikeVideo = (videoId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      readApiJson(
        apiClient.api.v1.videos[":id"].likes.$post({
          param: { id: videoId },
        })
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["videos", videoId, "social"],
      });
      queryClient.invalidateQueries({
        queryKey: ["videos", "feed"],
      });
    },
  });
};

export const useUnlikeVideo = (videoId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      readApiJson(
        apiClient.api.v1.videos[":id"].likes.$delete({
          param: { id: videoId },
        })
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["videos", videoId, "social"],
      });
      queryClient.invalidateQueries({
        queryKey: ["videos", "feed"],
      });
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
    mutationFn: (json: { content: string; replyToCommentId?: string }) =>
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
      queryClient.invalidateQueries({
        queryKey: ["videos", videoId, "social"],
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
