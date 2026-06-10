import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";

import { readApiJson } from "./api";

export interface ProfilePayload {
  accountTier?: "free" | "premium";
  bio?: string;
  homeCity?: string;
  homeCountry?: string;
  homeLatitude?: number;
  homeLongitude?: number;
  homeState?: string;
  isCaster?: boolean;
  isOrganizer?: boolean;
  isPlayer?: boolean;
  onboardingStatus?: "pending" | "complete";
  radarAddressId?: string;
  radarPlaceId?: string;
  homeCourtName?: string;
  age?: number;
  skillLevel?: "beginner" | "intermediate" | "advanced" | "pro";
}

export const useProfile = () =>
  useQuery({
    queryFn: () => readApiJson(apiClient.api.profile.me.$get()),
    queryKey: ["profile", "me"],
  });

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (json: ProfilePayload) =>
      readApiJson(apiClient.api.profile.me.$patch({ json })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
};

export const useOnboarding = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (json: ProfilePayload) =>
      readApiJson(apiClient.api.profile.onboarding.$post({ json })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
};
