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
  name?: string;
  username?: string;
  age?: number;
  skillLevel?: "beginner" | "intermediate" | "advanced" | "pro";
}

export const useProfile = () =>
  useQuery({
    queryFn: async () => {
      try {
        const response = await apiClient.api.v1.profile.me.$get();
        if (response.status === 401) {
          return null;
        }
        if (!response.ok) {
          throw new Error(
            response.statusText || `Request failed with ${response.status}`
          );
        }
        return await response.json();
      } catch {
        return null;
      }
    },
    queryKey: ["profile", "me"],
  });

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (json: ProfilePayload) =>
      readApiJson(apiClient.api.v1.profile.me.$patch({ json })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
};

export const useOnboarding = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (json: ProfilePayload) =>
      readApiJson(apiClient.api.v1.profile.onboarding.$post({ json })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
};
