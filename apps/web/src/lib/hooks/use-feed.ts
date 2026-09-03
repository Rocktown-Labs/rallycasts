import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { demoEnabled, demoVideos } from "@/lib/demo-data";

import { readApiJson } from "./api";

export const useHomeFeed = (enabled = true) =>
  useQuery({
    enabled,
    queryFn: async () => {
      try {
        return await readApiJson(apiClient.api.v1.feed.home.$get());
      } catch (error) {
        if (demoEnabled) {
          return {
            algorithm: {
              mode: "fallback-demo" as const,
              version: "home-feed-demo",
            },
            items: demoVideos.map((video) => ({
              entity: video,
              entityType: "video" as const,
              id: video.id,
              reason: "Popular on RallyCasts",
              score: 0,
              signals: {
                engagement: 0,
                freshness: 0,
                location: 0,
                semantic: 0,
                social: 0,
              },
              title: video.title,
            })),
          };
        }
        throw error;
      }
    },
    queryKey: ["home-feed"],
  });
