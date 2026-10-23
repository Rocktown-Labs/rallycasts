import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { readApiJson } from "@/lib/api";
import { demoPosts, demoVideos, demoVenues } from "@/lib/demo-data";
import { demoDataEnabled } from "@/lib/demo-mode";

export interface FeedResponse {
  items: Array<{
    entity: unknown;
    entityType: "video" | "venue" | "post" | "event" | "player";
    id: string;
    reason: string;
    signals?: {
      engagement?: number;
      freshness?: number;
      location?: number;
      semantic?: number;
      social?: number;
    };
    title: string;
  }>;
}

function demoFeedItems(): FeedResponse["items"] {
  return [
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
  ];
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
          if (demoDataEnabled) {
            const seen = new Set(data.items.map((item) => item.id));
            const fillers = demoFeedItems().filter(
              (item) => !seen.has(item.id)
            );
            return { items: [...data.items, ...fillers] };
          }
          return data;
        }
      } catch {
        // Fall back to rich demo content
      }

      return { items: demoFeedItems() };
    },
  });
}
