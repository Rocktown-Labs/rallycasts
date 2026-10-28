import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { readApiJson } from "@/lib/api";

export interface NativeLiveStream {
  description: string | null;
  id: string;
  isLive: boolean;
  muxPlaybackId: string | null;
  owner: { name: string } | null;
  recordingVideoId: string | null;
  status: string;
  title: string;
}

export function useLiveStream(id: string) {
  return useQuery({
    enabled: id.length > 0,
    queryFn: async () => {
      const response = await readApiJson<{ liveStream: NativeLiveStream }>(
        apiClient.api.v1["live-streams"][":id"].$get({ param: { id } })
      );
      return response.liveStream;
    },
    queryKey: ["live-streams", id],
    refetchInterval: 15_000,
  });
}
