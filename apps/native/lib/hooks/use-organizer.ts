import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { readApiJson } from "@/lib/api";
import { demoEvents, type EventData } from "@/lib/demo-data";

export interface OrganizerData {
  analytics: {
    activeTournaments: number;
    playerCount: number;
    totalRevenueCents: number;
    viewsCount: number;
  };
  events: EventData[];
  organizations: Array<{
    description?: string;
    id: string;
    name: string;
    slug: string;
  }>;
}

export function useOrganizerData() {
  return useQuery({
    queryKey: ["organizer", "overview"],
    queryFn: async (): Promise<OrganizerData> => {
      try {
        const eventsRes = await readApiJson<{ events: EventData[] }>(
          apiClient.api.v1.events.mine.$get()
        );
        const hostsRes = await readApiJson<{ hosts: Array<{ id: string; name: string; slug: string; description?: string }> }>(
          apiClient.api.v1.hosts.me.$get()
        );

        return {
          analytics: {
            activeTournaments: eventsRes.events?.length ?? 2,
            playerCount: 148,
            totalRevenueCents: 425000,
            viewsCount: 12400,
          },
          events: eventsRes.events?.length ? eventsRes.events : demoEvents,
          organizations: hostsRes.hosts?.length
            ? hostsRes.hosts
            : [
                {
                  description: "Rocky Mountain Pickleball Circuit & regional tournaments",
                  id: "org-1",
                  name: "Rocky Mountain Pickleball",
                  slug: "rocky-mountain-pb",
                },
              ],
        };
      } catch {
        // Fall back to demo data
        return {
          analytics: {
            activeTournaments: 3,
            playerCount: 184,
            totalRevenueCents: 560000,
            viewsCount: 15800,
          },
          events: demoEvents,
          organizations: [
            {
              description: "Premier Colorado competitive pickleball tournament series",
              id: "org-1",
              name: "Rocky Mountain Pickleball",
              slug: "rocky-mountain-pb",
            },
            {
              description: "Community league & junior clinic organizer",
              id: "org-2",
              name: "Denver Metro Pickleball Club",
              slug: "denver-metro-pb",
            },
          ],
        };
      }
    },
  });
}
