import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";

import { readApiJson } from "./api";

export const useCastingJobs = () =>
  useQuery({
    queryFn: () => readApiJson(apiClient.api["casting-jobs"].$get()),
    queryKey: ["casting-jobs"],
  });

export const useCreateCastingJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (json: {
      challengeId?: string;
      currency?: string;
      endsAt?: Date | string;
      notes?: string;
      priceCents?: number;
      requestedHours: number;
      startsAt: Date | string;
      venueId?: string;
    }) => readApiJson(apiClient.api["casting-jobs"].$post({ json })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["casting-jobs"] });
    },
  });
};
