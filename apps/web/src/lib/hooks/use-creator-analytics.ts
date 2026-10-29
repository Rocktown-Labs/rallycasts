import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";

import { readApiJson } from "./api";

export interface CreatorVideoStat {
  createdAt: string | null;
  id: string;
  mediaType: "photo" | "short" | "video";
  muxPlaybackId: string | null;
  status: string;
  thumbnailUrl: string | null;
  title: string;
  viewCount: number;
}

export interface CreatorAnalytics {
  followers: number;
  following: number;
  friends: number;
  liveStreams: number;
  topVideos: CreatorVideoStat[];
  totals: {
    completedViews: number;
    totalVideos: number;
    totalViews: number;
    watchTimeSeconds: number;
  };
  viewsByDay: { date: string; views: number }[];
}

export const useCreatorAnalytics = () =>
  useQuery({
    queryFn: () =>
      readApiJson<CreatorAnalytics>(apiClient.api.v1.creator.analytics.$get()),
    queryKey: ["creator-analytics"],
  });

export const formatWatchTime = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};
