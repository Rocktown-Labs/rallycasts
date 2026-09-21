import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";

import { readApiJson } from "./api";

export const useVenue = (id: string) =>
  useQuery({
    enabled: id.length > 0,
    queryFn: () =>
      readApiJson(
        apiClient.api.v1.venues[":id"].$get({
          param: { id },
        })
      ),
    queryKey: ["venue", id],
  });

export const useVenueAnalytics = (id: string) =>
  useQuery({
    enabled: id.length > 0,
    queryFn: () =>
      readApiJson(
        apiClient.api.v1.venues[":id"].analytics.$get({
          param: { id },
        })
      ),
    queryKey: ["venue", id, "analytics"],
    refetchInterval: 30_000,
  });

export const useVenueCheckIn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (venueId: string) =>
      readApiJson(
        apiClient.api.v1.venues[":id"]["check-in"].$post({
          param: { id: venueId },
        })
      ),
    onSuccess: (_data, venueId) => {
      queryClient.invalidateQueries({ queryKey: ["venue", venueId] });
      queryClient.invalidateQueries({
        queryKey: ["venue", venueId, "analytics"],
      });
      queryClient.invalidateQueries({ queryKey: ["trending"] });
    },
  });
};

export const useVenueCheckOut = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (venueId: string) =>
      readApiJson(
        apiClient.api.v1.venues[":id"]["check-out"].$post({
          param: { id: venueId },
        })
      ),
    onSuccess: (_data, venueId) => {
      queryClient.invalidateQueries({ queryKey: ["venue", venueId] });
      queryClient.invalidateQueries({
        queryKey: ["venue", venueId, "analytics"],
      });
      queryClient.invalidateQueries({ queryKey: ["trending"] });
    },
  });
};
