import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { demoEvents, withDemoList } from "@/lib/demo-data";

import { readApiJson } from "./api";

export const useEvents = () =>
  useQuery({
    queryFn: async () => {
      try {
        return await readApiJson(apiClient.api.events.$get());
      } catch {
        return { events: demoEvents };
      }
    },
    queryKey: ["events"],
    select: (data) => withDemoList(data, "events", demoEvents),
  });

export const useEvent = (id: string) =>
  useQuery({
    enabled: id.length > 0,
    queryFn: () =>
      readApiJson(
        apiClient.api.events[":id"].$get({
          param: { id },
        })
      ),
    queryKey: ["events", id],
  });

export const useCreateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (json: {
      capacity?: number;
      description?: string;
      endsAt?: string;
      eventType?: "clinic" | "league" | "open_play" | "tournament";
      name: string;
      startsAt: string;
      status?: "cancelled" | "completed" | "draft" | "published";
      venueId?: string;
    }) => readApiJson(apiClient.api.events.$post({ json })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
};

export const useEventPlayers = (id: string) =>
  useQuery({
    enabled: id.length > 0,
    queryFn: () =>
      readApiJson(
        apiClient.api.events[":id"].players.$get({
          param: { id },
        })
      ),
    queryKey: ["events", id, "players"],
  });

export const useEventBracket = (id: string) =>
  useQuery({
    enabled: id.length > 0,
    queryFn: () =>
      readApiJson(
        apiClient.api.events[":id"].bracket.$get({
          param: { id },
        })
      ),
    queryKey: ["events", id, "bracket"],
  });

export const useGenerateEventBracket = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (json: { force?: boolean } = {}) =>
      readApiJson(
        apiClient.api.events[":id"].bracket.generate.$post({
          json,
          param: { id },
        })
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["events", id, "bracket"],
      });
      queryClient.invalidateQueries({ queryKey: ["events", id, "live"] });
    },
  });
};

export const useEventLive = (id: string) =>
  useQuery({
    enabled: id.length > 0,
    queryFn: () =>
      readApiJson(
        apiClient.api.events[":id"].live.$get({
          param: { id },
        })
      ),
    queryKey: ["events", id, "live"],
    refetchInterval: 15_000,
  });

export const useJoinEvent = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      readApiJson(
        apiClient.api.events[":id"].join.$post({
          param: { id },
        })
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", id, "players"] });
      queryClient.invalidateQueries({ queryKey: ["events", id, "live"] });
    },
  });
};

export const useLeaveEvent = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      readApiJson(
        apiClient.api.events[":id"].join.$delete({
          param: { id },
        })
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", id, "players"] });
      queryClient.invalidateQueries({ queryKey: ["events", id, "live"] });
    },
  });
};

export const useSubmitMatchScore = (eventId: string, matchId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (json: {
      note?: string;
      playerOneScore: number;
      playerTwoScore: number;
      winnerUserId: string;
    }) =>
      readApiJson(
        apiClient.api.events[":id"].matches[":matchId"].scores.$post({
          json,
          param: { id: eventId, matchId },
        })
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", eventId, "live"] });
      queryClient.invalidateQueries({
        queryKey: ["events", eventId, "bracket"],
      });
    },
  });
};
