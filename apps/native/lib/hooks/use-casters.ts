import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { readApiJson } from "@/lib/api";
import { demoCasters, type CasterData } from "@/lib/demo-data";

export interface CastersResponse {
  casters: CasterData[];
}

export function useCasters() {
  return useQuery({
    queryKey: ["casters"],
    queryFn: async (): Promise<CastersResponse> => {
      try {
        const data = await readApiJson<CastersResponse>(
          apiClient.api.v1.casters.$get()
        );
        if (data?.casters?.length) {
          return data;
        }
      } catch {
        // Fall back
      }
      return { casters: demoCasters };
    },
  });
}
