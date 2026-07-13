import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";

import { readApiJson } from "./api";

export const usePlaceSearch = (query: string) =>
  useQuery({
    enabled: query.trim().length >= 3,
    queryFn: () =>
      readApiJson(
        apiClient.api.places.search.$get({
          query: { q: query.trim() },
        })
      ),
    queryKey: ["places", "search", query.trim()],
    staleTime: 60_000,
  });
