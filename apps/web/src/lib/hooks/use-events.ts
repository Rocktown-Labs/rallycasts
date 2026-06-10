import { useQuery } from "@tanstack/react-query";

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
