import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { readApiJson } from "@/lib/api";
import { demoVideos, demoVenues, demoPosts, type VideoData, type VenueData, type PostData } from "@/lib/demo-data";

export interface FeedResponse {
  items: Array<{
    entity: unknown;
    entityType: "video" | "venue" | "post" | "event" | "player";
    id: string;
    reason: string;
    title: string;
  }>;
}

export function useHomeFeed(enabled = true) {
  return useQuery({
    enabled,
    queryKey: ["home-feed"],
    queryFn: async (): Promise<FeedResponse> => {
      try {
        const data = await readApiJson<FeedResponse>(
          apiClient.api.v1.feed.home.$get()
        );
        if (data?.items?.length) {
          return data;
        }
      } catch {
        // Fall back to rich demo content
      }

      return {
        items: [
          ...demoVideos.map((video) => ({
            entity: video,
            entityType: "video" as const,
            id: video.id,
            reason: "Trending match in your region",
            title: video.title,
          })),
          ...demoVenues.map((venue) => ({
            entity: venue,
            entityType: "venue" as const,
            id: venue.id,
            reason: "Popular court with active players",
            title: venue.name,
          })),
          ...demoPosts.map((post) => ({
            entity: post,
            entityType: "post" as const,
            id: post.id,
            reason: "Local court chatter",
            title: "Player update",
          })),
        ],
      };
    },
  });
}
