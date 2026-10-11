import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { demoEnabled, demoEvents, withDemoList } from "@/lib/demo-data";

import { readApiJson } from "./api";

export const useEvents = () =>
  useQuery({
    queryFn: async () => {
      try {
        return await readApiJson(apiClient.api.v1.events.$get());
      } catch (error) {
        if (demoEnabled) {
          return { events: demoEvents };
        }
        throw error;
      }
    },
    queryKey: ["events"],
    select: (data) => withDemoList(data, "events", demoEvents),
  });

export const useMyEvents = () =>
  useQuery({
    queryFn: () => readApiJson(apiClient.api.v1.events.mine.$get()),
    queryKey: ["events", "mine"],
  });

export const useEvent = (id: string) =>
  useQuery({
    enabled: id.length > 0,
    queryFn: () =>
      readApiJson(
        apiClient.api.v1.events[":id"].$get({
          param: { id },
        })
      ),
    queryKey: ["events", id],
  });

export const useCreateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (json: {
      bracketType?: "round_robin" | "single_elimination";
      capacity?: number;
      checkInMinutes?: number;
      courtLabels?: string[];
      currency?: "usd";
      description?: string;
      endsAt?: string;
      eventType?: "clinic" | "league" | "open_play" | "tournament";
      entryFeeCents?: number;
      googlePlaceId?: string;
      name: string;
      organizationId?: string;
      refundPolicy?: string;
      registrationDeadline?: string;
      startsAt: string;
      status?: "cancelled" | "completed" | "draft" | "published";
      venueId?: string;
    }) => readApiJson(apiClient.api.v1.events.$post({ json })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["events", "mine"] });
    },
  });
};

export const useUpdateEvent = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (json: {
      bracketType?: "round_robin" | "single_elimination";
      capacity?: number;
      checkInMinutes?: number;
      courtLabels?: string[];
      currency?: "usd";
      description?: string;
      endsAt?: string;
      eventType?: "clinic" | "league" | "open_play" | "tournament";
      entryFeeCents?: number;
      name?: string;
      refundPolicy?: string;
      registrationDeadline?: string;
      startsAt?: string;
      status?: "cancelled" | "completed" | "draft" | "published";
      venueId?: string;
    }) =>
      readApiJson(
        apiClient.api.v1.events[":id"].$patch({
          json,
          param: { id },
        })
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["events", "mine"] });
      queryClient.invalidateQueries({ queryKey: ["events", id] });
    },
  });
};

export const useEventPlayers = (id: string) =>
  useQuery({
    enabled: id.length > 0,
    queryFn: () =>
      readApiJson(
        apiClient.api.v1.events[":id"].players.$get({
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
        apiClient.api.v1.events[":id"].bracket.$get({
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
        apiClient.api.v1.events[":id"].bracket.generate.$post({
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
        apiClient.api.v1.events[":id"].live.$get({
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
        apiClient.api.v1.events[":id"].join.$post({
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
        apiClient.api.v1.events[":id"].join.$delete({
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
        apiClient.api.v1.events[":id"].matches[":matchId"].scores.$post({
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

export const useSeedDemoEvent = (id: string, playerCount = 8) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      readApiJson(
        apiClient.api.v1.events[":id"]["seed-demo"].$post({
          json: { playerCount },
          param: { id },
        })
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["events", id] });
      queryClient.invalidateQueries({ queryKey: ["events", id, "bracket"] });
      queryClient.invalidateQueries({ queryKey: ["events", id, "players"] });
      queryClient.invalidateQueries({ queryKey: ["events", id, "matches"] });
      queryClient.invalidateQueries({ queryKey: ["events", id, "live"] });
      queryClient.invalidateQueries({ queryKey: ["events", "mine"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};

export const useTestNotification = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      readApiJson<{
        court: string;
        message: string;
        round: string;
        success: boolean;
      }>(
        apiClient.api.v1.events[":id"]["test-notification"].$post({
          param: { id },
        })
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};

export const useAdvanceDemoRound = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      readApiJson<{
        champion?: string;
        completed?: boolean;
        court?: string;
        message: string;
        nextRound?: number;
        opponent?: string;
        success: boolean;
      }>(
        apiClient.api.v1.events[":id"]["advance-demo-round"].$post({
          param: { id },
        })
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["events", id] });
      queryClient.invalidateQueries({ queryKey: ["events", id, "bracket"] });
      queryClient.invalidateQueries({ queryKey: ["events", id, "matches"] });
      queryClient.invalidateQueries({ queryKey: ["events", id, "live"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};

export const useUpdateMatch = (eventId: string, matchId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (json: {
      courtLabel?: string;
      playerOneScore?: number;
      playerTwoScore?: number;
      scheduledAt?: string;
      status?: "cancelled" | "completed" | "in_progress" | "scheduled";
      winnerUserId?: string;
    }) =>
      readApiJson(
        apiClient.api.v1.events[":id"].matches[":matchId"].$patch({
          json,
          param: { id: eventId, matchId },
        })
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["events", eventId, "bracket"],
      });
      queryClient.invalidateQueries({
        queryKey: ["events", eventId, "matches"],
      });
      queryClient.invalidateQueries({ queryKey: ["events", eventId, "live"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};
