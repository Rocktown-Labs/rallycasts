import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { readApiJson } from "@/lib/api";
import { withDemoItems } from "@/lib/demo-mode";
import {
  demoEvents,
  demoPlayers,
  demoVenues,
  demoVideos,
  type EventData,
  type PlayerData,
  type VenueData,
  type VideoData,
} from "@/lib/demo-data";

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
          return {
            events: withDemoItems(data.events ?? [], demoEvents),
            players: withDemoItems(data.players ?? [], demoPlayers),
            venues: withDemoItems(data.venues ?? [], demoVenues),
            videos: withDemoItems(data.videos ?? [], demoVideos),
          };
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
