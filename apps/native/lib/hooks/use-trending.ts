import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { readApiJson } from "@/lib/api";
import { demoVenues, demoVideos, demoPlayers, demoEvents, type VenueData, type VideoData, type PlayerData, type EventData } from "@/lib/demo-data";

export interface TrendingResponse {
  venues: VenueData[];
  videos: VideoData[];
  players: PlayerData[];
  events: EventData[];
}

export function useTrending(radiusMiles?: number) {
  return useQuery({
    queryKey: ["trending", radiusMiles],
    queryFn: async (): Promise<TrendingResponse> => {
      try {
        const query = radiusMiles ? { radius: String(radiusMiles) } : {};
        const data = await readApiJson<TrendingResponse>(
          apiClient.api.v1.trending.$get({ query })
        );
        if (data?.venues?.length || data?.videos?.length) {
          return data;
        }
      } catch {
        // Fall back to demo data
      }
      return {
        venues: demoVenues,
        videos: demoVideos,
        players: demoPlayers,
        events: demoEvents,
      };
    },
  });
}
