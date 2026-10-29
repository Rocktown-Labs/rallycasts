import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import {
  demoEnabled,
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

export const useTrending = (
  location?: GeoLocation,
  options?: { venueLimit?: number; venuePage?: number; venueRadius?: number }
) =>
  useQuery({
    queryFn: async () => {
      try {
        const query = {
          ...(location
            ? {
                lat: String(location.lat),
                lng: String(location.lng),
              }
            : {}),
          ...(options?.venueRadius
            ? { radius: String(options.venueRadius) }
            : {}),
          ...(options?.venueLimit
            ? { venueLimit: String(options.venueLimit) }
            : {}),
          ...(options?.venuePage
            ? {
                venuePage: String(options.venuePage),
                venuePageSize: String(options.venueLimit ?? 24),
              }
            : {}),
        };
        const data = await readApiJson(
          apiClient.api.v1.trending.$get({
            query,
          })
        );
        return { ...data, isApiFallback: false };
      } catch (error) {
        if (demoEnabled) {
          return { ...demoTrending, isApiFallback: true };
        }
        throw error;
      }
    },
    queryKey: [
      "trending",
      location?.lat,
      location?.lng,
      options?.venueRadius,
      options?.venueLimit,
      options?.venuePage,
    ],
  });

export const usePlayers = (
  query = "",
  role?: "player" | "organizer" | "caster"
) =>
  useQuery({
    queryFn: async () => {
      try {
        return await readApiJson(
          apiClient.api.v1.players.$get({
            query: {
              ...(query ? { q: query } : {}),
              ...(role ? { role } : {}),
            },
          })
        );
      } catch (error) {
        if (demoEnabled) {
          return { players: demoPlayers };
        }
        throw error;
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
          apiClient.api.v1.players.$get({
            query: {
              ...(query ? { q: query } : {}),
              role: "organizer",
            },
          })
        );
      } catch (error) {
        if (demoEnabled) {
          const demoOrganizers = demoPlayers.map((player, index) => ({
            ...player,
            bio:
              index % 2 === 0
                ? "Leagues coordinator & tournament host"
                : "Pickleball Club director",
          }));
          return { players: demoOrganizers };
        }
        throw error;
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
          apiClient.api.v1.venues.$get({
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
      } catch (error) {
        if (demoEnabled) {
          return { venues: demoVenues };
        }
        throw error;
      }
    },
    queryKey: ["venues", query, location?.lat, location?.lng],
  });

export const useSearch = (query: string, type: SearchEntity) =>
  useQuery({
    enabled: query.trim().length > 1,
    queryFn: async () => {
      const demoResults = demoEnabled ? filterDemoSearch(query) : null;
      let data;

      try {
        data = await readApiJson(
          apiClient.api.v1.search.$get({
            query: { q: query, type },
          })
        );
      } catch (error) {
        if (!demoResults) {
          throw error;
        }
        data = demoResults;
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

export const useToggleProfileLike = (username: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (liked: boolean) =>
      liked
        ? readApiJson<{ liked: boolean; likesCount: number }>(
            apiClient.api.v1.players[":username"].like.$post({
              param: { username },
            })
          )
        : readApiJson<{ liked: boolean; likesCount: number }>(
            apiClient.api.v1.players[":username"].like.$delete({
              param: { username },
            })
          ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player", username] });
    },
  });
};
