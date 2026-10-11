import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { readApiJson } from "@/lib/hooks/api";

export interface OrganizerEventStats {
  capacity: number | null;
  entryFeeCents: number;
  eventType: "clinic" | "league" | "open_play" | "tournament";
  id: string;
  name: string;
  organizationId: string | null;
  registrations: {
    cancelled: number;
    checkedIn: number;
    registered: number;
  };
  startsAt: string;
  status: "cancelled" | "completed" | "draft" | "published";
}

export interface OrganizerCampaign {
  clicks: number;
  createdAt: string;
  id: string;
  impressions: number;
  name: string;
  spentCents: number;
  status: string;
  totalBudgetCents: number;
}

export interface OrganizerAnalytics {
  campaigns: OrganizerCampaign[];
  events: OrganizerEventStats[];
  registrationsByDay: { date: string; registrations: number }[];
  totals: {
    activeEvents: number;
    adClicks: number;
    adImpressions: number;
    cancelledRegistrations: number;
    checkedInRegistrations: number;
    pastEvents: number;
    registrations: number;
    revenueCents: number;
  };
}

/** One aggregate call for the organizer dashboard views. */
export const useOrganizerAnalytics = () =>
  useQuery({
    queryFn: () =>
      readApiJson<OrganizerAnalytics>(
        apiClient.api.v1.organizer.analytics.$get()
      ),
    queryKey: ["organizer-analytics"],
  });

export const formatDollars = (cents: number): string =>
  cents >= 0
    ? `$${(cents / 100).toFixed(2)}`
    : `-$${(-cents / 100).toFixed(2)}`;
