import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";

import { readApiJson } from "./api";

export const useCasters = () =>
  useQuery({
    queryFn: () => readApiJson(apiClient.api.v1.casters.$get()),
    queryKey: ["casters"],
  });

export const useCasterMe = () =>
  useQuery({
    queryFn: () => readApiJson(apiClient.api.v1.casters.me.$get()),
    queryKey: ["casters", "me"],
  });

export const useUpdateCaster = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (json: {
      baseLatitude?: number;
      baseLongitude?: number;
      bio?: string;
      displayName?: string;
      hourlyRateCents?: number;
      serviceRadiusMiles?: number;
    }) => readApiJson(apiClient.api.v1.casters.me.$patch({ json })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["casters"] });
    },
  });
};
