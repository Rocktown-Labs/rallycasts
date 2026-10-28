import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { readApiJson } from "@/lib/api";
import { demoDataEnabled, withDemoItems } from "@/lib/demo-mode";
import { demoVideos, demoClips, type VideoData } from "@/lib/demo-data";

export interface VideosResponse {
  videos: VideoData[];
}

export function useVideos() {
  return useQuery({
    queryKey: ["videos"],
    queryFn: async (): Promise<VideosResponse> => {
      try {
        const data = await readApiJson<VideosResponse>(
          apiClient.api.v1.videos.$get()
        );
        if (data?.videos?.length) {
          return { videos: withDemoItems(data.videos, demoVideos) };
        }
        return { videos: [] };
      } catch (error) {
        if (demoDataEnabled) {
          return { videos: demoVideos };
        }
        throw error;
      }
    },
  });
}

export function useClips() {
  return useQuery({
    queryKey: ["clips"],
    queryFn: async (): Promise<VideosResponse> => {
      try {
        const data = await readApiJson<VideosResponse>(
          apiClient.api.v1.videos.$get()
        );
        const clips = (data?.videos ?? []).filter(
          (video) => video.mediaType === "short"
        );
        if (clips.length > 0) {
          return { videos: withDemoItems(clips, demoClips) };
        }
        return { videos: [] };
      } catch (error) {
        if (demoDataEnabled) {
          return { videos: demoClips };
        }
        throw error;
      }
    },
  });
}

export function useVideo(id: string) {
  return useQuery({
    queryKey: ["video", id],
    queryFn: async (): Promise<VideoData> => {
      try {
        const data = await readApiJson<{ video: VideoData }>(
          apiClient.api.v1.videos[":id"].$get({ param: { id } })
        );
        if (data?.video) {
          return data.video;
        }
      } catch (error) {
        if (!demoDataEnabled) {
          throw error;
        }
      }
      const match = [...demoVideos, ...demoClips].find((v) => v.id === id);
      if (match) {
        return match;
      }
      throw new Error("Video not found");
    },
  });
}

export interface NativeVideoSocial {
  comments: number;
  hasLiked: boolean;
  likes: number;
  views: number;
}

export function useVideoSocial(id: string, enabled = true) {
  return useQuery({
    enabled: enabled && id.length > 0,
    queryKey: ["video", id, "social"],
    queryFn: () =>
      readApiJson<NativeVideoSocial>(
        apiClient.api.v1.videos[":id"].social.$get({ param: { id } })
      ),
  });
}

export function useToggleVideoLike(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (liked: boolean) =>
      liked
        ? readApiJson(
            apiClient.api.v1.videos[":id"].likes.$post({ param: { id } })
          )
        : readApiJson(
            apiClient.api.v1.videos[":id"].likes.$delete({ param: { id } })
          ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["video", id, "social"] });
    },
  });
}

export function useRecordVideoView(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      readApiJson(
        apiClient.api.v1.videos[":id"].views.$post({ param: { id } })
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["video", id, "social"] });
    },
  });
}
