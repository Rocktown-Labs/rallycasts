import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { readApiJson } from "@/lib/api";
import { demoDataEnabled, withDemoItems } from "@/lib/demo-mode";
import { demoEvents, type EventData } from "@/lib/demo-data";

export interface EventsResponse {
  events: EventData[];
}

export function useEvents(query = "") {
  return useQuery({
    queryKey: ["events", query],
    queryFn: async (): Promise<EventsResponse> => {
      try {
        const data = await readApiJson<EventsResponse>(
          apiClient.api.v1.events.$get()
        );
        if (data?.events?.length) {
          return { events: withDemoItems(data.events, demoEvents) };
        }
        if (demoDataEnabled) {
          return { events: demoEvents };
        }
        return { events: [] };
      } catch (error) {
        if (!demoDataEnabled) {
          throw error;
        }
      }

      let filtered = [...demoEvents];
      if (query.trim()) {
        const q = query.toLowerCase();
        filtered = filtered.filter(
          (e) =>
            e.name.toLowerCase().includes(q) ||
            e.location?.toLowerCase().includes(q) ||
            e.category?.toLowerCase().includes(q)
        );
      }
      return { events: filtered };
    },
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: ["event", id],
    queryFn: async (): Promise<EventData> => {
      try {
        const data = await readApiJson<{ event: EventData }>(
          apiClient.api.v1.events[":id"].$get({ param: { id } })
        );
        if (data?.event) {
          return data.event;
        }
      } catch (error) {
        if (!demoDataEnabled) {
          throw error;
        }
      }

      const match = demoEvents.find((e) => e.id === id);
      if (match) {
        return match;
      }
      throw new Error("Event not found");
    },
  });
}

export function useJoinEvent(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.api.v1.events[":id"].join.$post({
        param: { id },
      });
      const body = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      if (!response.ok) {
        throw new Error(body.message ?? "Could not register for this event");
      }
      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", id] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}
