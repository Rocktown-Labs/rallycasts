import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import {
  demoPlayers,
  demoTrending,
  demoVenues,
  filterDemoSearch,
  withDemoList,
  withDemoTrending,
} from "@/lib/demo-data";

import { readApiJson } from "./api";

export type SearchEntity = "all" | "videos" | "players" | "events" | "parks";

export const useTrending = () =>
  useQuery({
    queryFn: async () => {
      try {
        return await readApiJson(apiClient.api.trending.$get());
      } catch {
        return demoTrending;
      }
    },
    queryKey: ["trending"],
    select: (data) => withDemoTrending(data) ?? demoTrending,
  });

export const usePlayers = (query = "") =>
  useQuery({
    queryFn: async () => {
      try {
        return await readApiJson(
          apiClient.api.players.$get({
            query: query ? { q: query } : {},
          })
        );
      } catch {
        return { players: demoPlayers };
      }
    },
    queryKey: ["players", query],
    select: (data) => withDemoList(data, "players", demoPlayers),
  });

export const useVenues = (query = "") =>
  useQuery({
    queryFn: async () => {
      try {
        return await readApiJson(
          apiClient.api.venues.$get({
            query: query ? { q: query } : {},
          })
        );
      } catch {
        return { venues: demoVenues };
      }
    },
    queryKey: ["venues", query],
    select: (data) => withDemoList(data, "venues", demoVenues),
  });

export const useSearch = (query: string, type: SearchEntity) =>
  useQuery({
    enabled: query.trim().length > 1,
    queryFn: async () => {
      const demoResults = filterDemoSearch(query);
      let data;

      try {
        data = await readApiJson(
          apiClient.api.search.$get({
            query: { q: query, type },
          })
        );
      } catch {
        data = demoResults ?? {
          casters: [],
          events: [],
          players: [],
          venues: [],
          videos: [],
        };
      }

      if (!demoResults) {
        return data;
      }

      return {
        casters: [],
        events: data.events.length > 0 ? data.events : demoResults.events,
        players: data.players.length > 0 ? data.players : demoResults.players,
        venues: data.venues.length > 0 ? data.venues : demoResults.venues,
        videos: data.videos.length > 0 ? data.videos : demoResults.videos,
      };
    },
    queryKey: ["search", type, query],
  });
