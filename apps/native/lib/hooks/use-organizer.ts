import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { readApiJson } from "@/lib/api";
import { demoEvents, type EventData } from "@/lib/demo-data";
import { demoDataEnabled } from "@/lib/demo-mode";

export interface OrganizerData {
  analytics: {
    activeTournaments: number;
    checkedIn: number;
    playerCount: number;
    totalRevenueCents: number;
  };
  events: EventData[];
  organizations: Array<{
    description?: string;
    id: string;
    name: string;
    slug: string;
  }>;
}

interface OrganizerAnalyticsResponse {
  totals: {
    activeEvents: number;
    checkedInRegistrations: number;
    registrations: number;
    revenueCents: number;
  };
}

const EMPTY_ORGANIZER_DATA: OrganizerData = {
  analytics: {
    activeTournaments: 0,
    checkedIn: 0,
    playerCount: 0,
    totalRevenueCents: 0,
  },
  events: [],
  organizations: [],
};

export function useOrganizerData() {
  return useQuery({
    queryKey: ["organizer", "overview"],
    queryFn: async (): Promise<OrganizerData> => {
      try {
        const [eventsRes, hostsRes, analyticsRes] = await Promise.all([
          readApiJson<{ events: EventData[] }>(
            apiClient.api.v1.events.mine.$get()
          ),
          readApiJson<{
            hosts: Array<{
              description?: string;
              id: string;
              name: string;
              slug: string;
            }>;
          }>(apiClient.api.v1.hosts.me.$get()),
          readApiJson<OrganizerAnalyticsResponse>(
            apiClient.api.v1.organizer.analytics.$get()
          ),
        ]);

        return {
          analytics: {
            activeTournaments: analyticsRes.totals.activeEvents,
            checkedIn: analyticsRes.totals.checkedInRegistrations,
            playerCount: analyticsRes.totals.registrations,
            totalRevenueCents: analyticsRes.totals.revenueCents,
          },
          events: eventsRes.events ?? [],
          organizations: hostsRes.hosts ?? [],
        };
      } catch {
        if (demoDataEnabled) {
          return {
            analytics: {
              activeTournaments: 0,
              checkedIn: 0,
              playerCount: 0,
              totalRevenueCents: 0,
            },
            events: demoEvents,
            organizations: [
              {
                description:
                  "Premier Colorado competitive pickleball tournament series",
                id: "org-1",
                name: "Rocky Mountain Pickleball",
                slug: "rocky-mountain-pb",
              },
            ],
          };
        }
        return EMPTY_ORGANIZER_DATA;
      }
    },
  });
}
