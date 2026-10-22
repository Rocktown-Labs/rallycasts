import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { readApiJson } from "@/lib/api";
import {
  demoEvents,
  demoPlayers,
  demoPosts,
  demoVenues,
  demoVideos,
  type EventData,
  type PostData,
  type VenueData,
  type VideoData,
} from "@/lib/demo-data";

export type SearchEntity =
  | "all"
  | "events"
  | "parks"
  | "players"
  | "posts"
  | "videos";

export interface SearchPlayer {
  displayUsername?: string | null;
  homeCity?: string | null;
  homeState?: string | null;
  id: string;
  image?: string | null;
  name: string;
  username?: string | null;
}

export interface SearchPost {
  author: PostData["author"];
  post: PostData;
}

export interface SearchResponse {
  casters: unknown[];
  documents: unknown[];
  events: EventData[];
  players: SearchPlayer[];
  posts: SearchPost[];
  venues: VenueData[];
  videos: VideoData[];
}

const includesQuery = (value: string | null | undefined, query: string) =>
  (value ?? "").toLowerCase().includes(query);

function demoSearch(query: string, type: SearchEntity): SearchResponse {
  const needle = query.trim().toLowerCase();
  const all = type === "all";

  return {
    casters: [],
    documents: [],
    events:
      all || type === "events"
        ? demoEvents.filter(
            (event) =>
              includesQuery(event.name, needle) ||
              includesQuery(event.location, needle)
          )
        : [],
    players:
      all || type === "players"
        ? demoPlayers.filter(
            (player) =>
              includesQuery(player.name, needle) ||
              includesQuery(player.username, needle) ||
              includesQuery(player.homeCity, needle)
          )
        : [],
    posts:
      all || type === "posts"
        ? demoPosts
            .filter((post) => includesQuery(post.content, needle))
            .map((post) => ({ author: post.author, post }))
        : [],
    venues:
      all || type === "parks"
        ? demoVenues.filter(
            (venue) =>
              includesQuery(venue.name, needle) ||
              includesQuery(venue.city, needle) ||
              includesQuery(venue.state, needle)
          )
        : [],
    videos:
      all || type === "videos"
        ? demoVideos.filter(
            (video) =>
              includesQuery(video.title, needle) ||
              includesQuery(video.description, needle)
          )
        : [],
  };
}

export function useSearch(query: string, type: SearchEntity) {
  return useQuery({
    enabled: query.trim().length > 1,
    queryFn: async (): Promise<SearchResponse> => {
      try {
        return await readApiJson<SearchResponse>(
          apiClient.api.v1.search.$get({ query: { q: query, type } })
        );
      } catch {
        return demoSearch(query, type);
      }
    },
    queryKey: ["search", type, query],
  });
}
