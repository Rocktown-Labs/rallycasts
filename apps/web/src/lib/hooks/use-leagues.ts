import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";

import { readApiJson } from "./api";

export type LeagueFormat =
  | "doubles_fixed"
  | "ladder"
  | "mlp_draft"
  | "singles"
  | "squad_ab";

export type LeagueRegistrationMode =
  | "direct"
  | "draft_async"
  | "draft_live"
  | "rolling_pool";

export interface LeagueRecord {
  casterMode: "none" | "optional" | "required";
  currentUnits: number;
  entryFeeCents: number;
  format: LeagueFormat;
  id: string;
  isVideoLeague: boolean;
  locationLabel: string;
  matchWindowDays: number;
  maxUnits: number;
  name: string;
  registrationMode: LeagueRegistrationMode;
  seasonWeeks: number;
  startTrigger: "manual" | "on_full" | "scheduled";
  status:
    | "active"
    | "cancelled"
    | "completed"
    | "drafting"
    | "playoffs"
    | "recruiting";
}

export interface LeagueMatchup {
  awayTeamId: string;
  homeTeamId: string;
  id: string;
  leagueId: string;
  status: string;
  weekNumber: number;
}

export interface LeagueStanding {
  id: string;
  matchesLost: number;
  matchesWon: number;
  name: string;
  pointsDiff: number;
  teamPoints: number;
}

interface LeagueInput {
  casterMode?: "none" | "optional" | "required";
  entryFeeCents?: number;
  format: LeagueFormat;
  isVideoLeague?: boolean;
  locationLabel: string;
  matchWindowDays?: number;
  maxUnits: number;
  name: string;
  registrationMode?: LeagueRegistrationMode;
  seasonWeeks?: number;
  startTrigger?: "manual" | "on_full" | "scheduled";
  status?: LeagueRecord["status"];
}

export const useMyLeagues = () =>
  useQuery({
    queryFn: () => readApiJson(apiClient.api.v1.leagues.mine.$get()),
    queryKey: ["leagues", "mine"],
  });

export const useLeague = (id: string) =>
  useQuery({
    enabled: id.length > 0,
    queryFn: () =>
      readApiJson(
        apiClient.api.v1.leagues[":id"].$get({
          param: { id },
        })
      ),
    queryKey: ["leagues", id],
  });

export const useCreateLeague = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (json: LeagueInput) =>
      readApiJson(apiClient.api.v1.leagues.$post({ json })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leagues"] });
    },
  });
};

export const useUpdateLeague = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (json: Partial<LeagueInput>) =>
      readApiJson(
        apiClient.api.v1.leagues[":id"].$patch({
          json,
          param: { id },
        })
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leagues"] });
      queryClient.invalidateQueries({ queryKey: ["leagues", id] });
    },
  });
};

export const useLeagueMatchups = (id: string) =>
  useQuery({
    enabled: id.length > 0,
    queryFn: () =>
      readApiJson(
        apiClient.api.v1.leagues[":id"].matchups.$get({
          param: { id },
        })
      ),
    queryKey: ["leagues", id, "matchups"],
  });

export const useLeagueStandings = (id: string) =>
  useQuery({
    enabled: id.length > 0,
    queryFn: () =>
      readApiJson(
        apiClient.api.v1.leagues[":id"].standings.$get({
          param: { id },
        })
      ),
    queryKey: ["leagues", id, "standings"],
  });
