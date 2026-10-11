import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { readApiJson } from "@/lib/api";

export interface UserProfile {
  age?: number | null;
  bio?: string | null;
  email?: string | null;
  homeCity?: string | null;
  homeCourtName?: string | null;
  homeState?: string | null;
  id?: string | null;
  image?: string | null;
  isCaster?: boolean | null;
  isOrganizer?: boolean | null;
  isPlayer?: boolean | null;
  name?: string | null;
  skillLevel?: string | null;
  username?: string | null;
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile", "me"],
    queryFn: async (): Promise<{ profile: UserProfile } | null> => {
      try {
        const response = await apiClient.api.v1.profile.me.$get();
        if ((response.status as number) === 401) {
          return null;
        }
        if (!response.ok) {
          return null;
        }
        return await response.json();
      } catch {
        return null;
      }
    },
  });
}
