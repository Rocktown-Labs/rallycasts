import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { readApiJson } from "@/lib/api";
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
          return data;
        }
      } catch {
        // Fall back to demo videos
      }
      return { videos: demoVideos };
    },
  });
}

export function useClips() {
  return useQuery({
    queryKey: ["clips"],
    queryFn: async (): Promise<VideosResponse> => {
      return { videos: demoClips };
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
      } catch {
        // Fallback
      }
      const match = [...demoVideos, ...demoClips].find((v) => v.id === id);
      if (match) {
        return match;
      }
      return demoVideos[0]!;
    },
  });
}
