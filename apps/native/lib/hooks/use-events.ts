import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { readApiJson } from "@/lib/api";
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
          return data;
        }
      } catch {
        // Fall back
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
      } catch {
        // Fall back
      }

      const match = demoEvents.find((e) => e.id === id);
      if (match) {
        return match;
      }
      return demoEvents[0]!;
    },
  });
}
