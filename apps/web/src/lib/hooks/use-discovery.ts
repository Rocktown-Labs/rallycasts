import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import {
  demoPlayers,
  demoTrending,
  demoVenues,
  filterDemoSearch,
  withDemoList,
} from "@/lib/demo-data";

import { readApiJson } from "./api";
import type { GeoLocation } from "./types";

export type SearchEntity =
  | "all"
  | "events"
  | "parks"
  | "players"
  | "posts"
  | "videos";

export const useTrending = (location?: GeoLocation) =>
  useQuery({
    queryFn: async () => {
      try {
        return await readApiJson(
          apiClient.api.trending.$get({
            query: location
              ? {
                  lat: String(location.lat),
                  lng: String(location.lng),
                  radius: "50",
                }
              : {},
          })
        );
      } catch {
        return demoTrending;
      }
    },
    queryKey: ["trending", location?.lat, location?.lng],
  });

export const usePlayers = (
  query = "",
  role?: "player" | "organizer" | "caster"
) =>
  useQuery({
    queryFn: async () => {
      try {
        return await readApiJson(
          apiClient.api.players.$get({
            query: {
              ...(query ? { q: query } : {}),
              ...(role ? { role } : {}),
            },
          })
        );
      } catch {
        return { players: demoPlayers };
      }
    },
    queryKey: ["players", query, role],
    select: (data) => withDemoList(data, "players", demoPlayers),
  });

export const useOrganizers = (query = "") =>
  useQuery({
    queryFn: async () => {
      try {
        return await readApiJson(
          apiClient.api.players.$get({
            query: {
              ...(query ? { q: query } : {}),
              role: "organizer",
            },
          })
        );
      } catch {
        // Fallback to demo organizers (we can filter players with organizer profiles or use demo)
        const demoOrganizers = demoPlayers.map((p, idx) => ({
          ...p,
          bio:
            idx % 2 === 0
              ? "Leagues coordinator & tournament host"
              : "Pickleball Club director",
        }));
        return { players: demoOrganizers };
      }
    },
    queryKey: ["organizers", query],
    select: (data) =>
      withDemoList(
        data,
        "players",
        demoPlayers.map((p, idx) => ({
          ...p,
          bio:
            idx % 2 === 0
              ? "Leagues coordinator & tournament host"
              : "Pickleball Club director",
        }))
      ),
  });

export const useVenues = (query = "", location?: GeoLocation) =>
  useQuery({
    queryFn: async () => {
      try {
        return await readApiJson(
          apiClient.api.venues.$get({
            query: {
              ...(query ? { q: query } : {}),
              ...(location
                ? {
                    lat: String(location.lat),
                    lng: String(location.lng),
                    radius: "50",
                  }
                : {}),
            },
          })
        );
      } catch {
        return { venues: demoVenues };
      }
    },
    queryKey: ["venues", query, location?.lat, location?.lng],
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
          documents: [],
          events: [],
          players: [],
          posts: [],
          venues: [],
          videos: [],
        };
      }

      if (!demoResults) {
        return data;
      }

      return {
        casters: [],
        documents:
          data.documents.length > 0 ? data.documents : demoResults.documents,
        events: data.events.length > 0 ? data.events : demoResults.events,
        players: data.players.length > 0 ? data.players : demoResults.players,
        posts: data.posts.length > 0 ? data.posts : demoResults.posts,
        venues: data.venues.length > 0 ? data.venues : demoResults.venues,
        videos: data.videos.length > 0 ? data.videos : demoResults.videos,
      };
    },
    queryKey: ["search", type, query],
  });
