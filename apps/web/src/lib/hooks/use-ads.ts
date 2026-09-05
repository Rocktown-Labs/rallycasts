import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";

import { readApiJson } from "./api";

export interface CreateCampaignInput {
  city?: string;
  cpmCents?: number;
  creatives: {
    body?: string;
    ctaPath?: string;
    imageUrl?: string;
    kind: "display" | "preroll";
    title: string;
    videoId?: string;
  }[];
  dailyBudgetCents: number;
  endsAt?: string;
  eventId: string;
  name: string;
  organizationId: string;
  placements?: "both" | "display" | "preroll";
  skillLevel?: "advanced" | "beginner" | "intermediate" | "pro";
  startsAt?: string;
  state?: string;
  totalBudgetCents: number;
  venueId?: string;
  videoCpmCents?: number;
}

export const useAdCampaigns = (organizationId?: string) =>
  useQuery({
    enabled: Boolean(organizationId),
    queryFn: () =>
      readApiJson(
        apiClient.api.v1.ads.campaigns.$get({
          query: { organizationId: organizationId ?? "" },
        })
      ),
    queryKey: ["ads", "campaigns", organizationId],
  });

export const useCreateAdCampaign = (organizationId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (json: CreateCampaignInput) =>
      readApiJson(apiClient.api.v1.ads.campaigns.$post({ json })),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["ads", "campaigns", organizationId],
      });
    },
  });
};

export const useAdCampaignAction = (organizationId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
    }: {
      action: "pause" | "resume" | "submit";
      id: string;
    }) =>
      readApiJson(
        apiClient.api.v1.ads.campaigns[":id"].$patch({
          json: { action },
          param: { id },
        })
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["ads", "campaigns", organizationId],
      });
    },
  });
};

export const useAdTopup = () =>
  useMutation({
    mutationFn: ({ id, amountCents }: { amountCents: number; id: string }) =>
      readApiJson(
        apiClient.api.v1.ads.campaigns[":id"].topup.$post({
          json: { amountCents },
          param: { id },
        })
      ),
  });

export const useAdStats = (campaignId?: string) =>
  useQuery({
    enabled: Boolean(campaignId),
    queryFn: () =>
      readApiJson(
        apiClient.api.v1.ads.campaigns[":id"].stats.$get({
          param: { id: campaignId ?? "" },
        })
      ),
    queryKey: ["ads", "stats", campaignId],
  });

export const usePendingAds = () =>
  useQuery({
    queryFn: () => readApiJson(apiClient.api.v1.ads.pending.$get()),
    queryKey: ["ads", "pending"],
  });

export const useReviewAd = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      approve,
      id,
      reason,
    }: {
      approve: boolean;
      id: string;
      reason?: string;
    }) =>
      readApiJson(
        apiClient.api.v1.ads.campaigns[":id"].review.$post({
          json: { approve, reason },
          param: { id },
        })
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["ads", "pending"] });
    },
  });
};
