import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { demoVideos, withDemoList } from "@/lib/demo-data";

import { readApiJson } from "./api";

export const useVideos = () =>
  useQuery({
    queryFn: async () => {
      try {
        return await readApiJson(apiClient.api.videos.$get());
      } catch {
        return { videos: demoVideos };
      }
    },
    queryKey: ["videos"],
    select: (data) => withDemoList(data, "videos", demoVideos),
  });

export const useMyVideos = () =>
  useQuery({
    queryFn: () => readApiJson(apiClient.api.videos.me.$get()),
    queryKey: ["videos", "me"],
  });

export const useVideo = (id: string) =>
  useQuery({
    enabled: id.length > 0,
    queryFn: () =>
      readApiJson(
        apiClient.api.videos[":id"].$get({
          param: { id },
        })
      ),
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
      title: string;
      venueId?: string;
      visibility?: "public" | "friends" | "private";
    }) => readApiJson(apiClient.api.videos.$post({ json })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["videos"] });
    },
  });
};

export const useVideoComments = (videoId: string) =>
  useQuery({
    enabled: videoId.length > 0,
    queryFn: () =>
      readApiJson(
        apiClient.api.videos[":id"].comments.$get({
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
        apiClient.api.videos[":id"].comments.$post({
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
