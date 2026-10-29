import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";

import { readApiJson } from "./api";

export interface LiveStreamOwner {
  displayUsername?: string | null;
  id: string;
  image?: string | null;
  name: string;
  username?: string | null;
}

export interface LiveStreamEvent {
  id: string;
  name: string;
  startsAt: string | null;
}

export interface LiveStreamRecord {
  createdAt: string | null;
  description: string | null;
  endedAt: string | null;
  event: LiveStreamEvent | null;
  id: string;
  ingestUrl?: string;
  isLive: boolean;
  latencyMode: "low" | "reduced" | "standard";
  muxLiveStreamId?: string;
  muxPlaybackId: string | null;
  owner: LiveStreamOwner | null;
  recordingVideoId: string | null;
  startedAt: string | null;
  status:
    | "idle"
    | "connected"
    | "recording"
    | "active"
    | "disconnected"
    | "completed"
    | "failed";
  streamKey?: string;
  title: string;
  visibility: "public" | "private";
}

export interface CreateLiveStreamInput {
  description?: string;
  eventId?: string;
  latencyMode?: "low" | "reduced" | "standard";
  title: string;
  visibility?: "public" | "private";
}

export const useMyLiveStreams = (enabled = true) =>
  useQuery({
    enabled,
    queryFn: async () => {
      const response = await readApiJson<{ liveStreams: LiveStreamRecord[] }>(
        apiClient.api.v1["live-streams"].mine.$get()
      );
      return response.liveStreams;
    },
    queryKey: ["live-streams", "mine"],
  });

export const useLiveStreams = () =>
  useQuery({
    queryFn: async () => {
      const response = await readApiJson<{ liveStreams: LiveStreamRecord[] }>(
        apiClient.api.v1["live-streams"].$get()
      );
      return response.liveStreams;
    },
    queryKey: ["live-streams", "public"],
    refetchInterval: 30_000,
  });

export const useLiveStream = (id: string) =>
  useQuery({
    enabled: id.length > 0,
    queryFn: async () => {
      const response = await readApiJson<{ liveStream: LiveStreamRecord }>(
        apiClient.api.v1["live-streams"][":id"].$get({ param: { id } })
      );
      return response.liveStream;
    },
    queryKey: ["live-streams", id],
    refetchInterval: 15_000,
  });

const invalidateLiveStreams = async (
  queryClient: ReturnType<typeof useQueryClient>,
  id?: string
) => {
  await queryClient.invalidateQueries({ queryKey: ["live-streams"] });
  if (id) {
    await queryClient.invalidateQueries({ queryKey: ["live-streams", id] });
  }
};

export const useCreateLiveStream = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (json: CreateLiveStreamInput) =>
      readApiJson<{ liveStream: LiveStreamRecord }>(
        apiClient.api.v1["live-streams"].$post({ json })
      ),
    onSuccess: async () => {
      await invalidateLiveStreams(queryClient);
    },
  });
};

export const useUpdateLiveStream = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (json: Partial<CreateLiveStreamInput>) =>
      readApiJson<{ liveStream: LiveStreamRecord }>(
        apiClient.api.v1["live-streams"][":id"].$patch({
          json,
          param: { id },
        })
      ),
    onSuccess: async () => {
      await invalidateLiveStreams(queryClient, id);
    },
  });
};

export const useResetLiveStreamKey = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      readApiJson<{ streamKey: string }>(
        apiClient.api.v1["live-streams"][":id"]["reset-key"].$post({
          param: { id },
        })
      ),
    onSuccess: async () => {
      await invalidateLiveStreams(queryClient, id);
    },
  });
};

export const useCompleteLiveStream = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      readApiJson(
        apiClient.api.v1["live-streams"][":id"].complete.$post({
          param: { id },
        })
      ),
    onSuccess: async () => {
      await invalidateLiveStreams(queryClient, id);
    },
  });
};

export const useSyncLiveStream = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      readApiJson(
        apiClient.api.v1["live-streams"][":id"].sync.$post({ param: { id } })
      ),
    onSuccess: async () => {
      await invalidateLiveStreams(queryClient, id);
    },
  });
};

export const useDeleteLiveStream = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      readApiJson(
        apiClient.api.v1["live-streams"][":id"].$delete({ param: { id } })
      ),
    onSuccess: async () => {
      await invalidateLiveStreams(queryClient);
    },
  });
};
