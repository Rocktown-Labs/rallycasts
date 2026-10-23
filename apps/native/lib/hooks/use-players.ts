import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { readApiJson } from "@/lib/api";
import { withDemoItems } from "@/lib/demo-mode";
import { demoPlayers, type PlayerData } from "@/lib/demo-data";

export interface PlayersResponse {
  players: PlayerData[];
}

export function usePlayers(query = "", role?: string) {
  return useQuery({
    queryKey: ["players", query, role],
    queryFn: async (): Promise<PlayersResponse> => {
      try {
        const queryParams = {
          ...(query ? { query } : {}),
          ...(role ? { role } : {}),
        };
        const data = await readApiJson<PlayersResponse>(
          apiClient.api.v1.players.$get({ query: queryParams })
        );
        if (data?.players?.length) {
          return {
            players: withDemoItems(
              data.players,
              demoPlayers.filter((player) =>
                query.trim()
                  ? [player.name, player.username, player.homeCity, player.skillLevel]
                      .filter(Boolean)
                      .some((value) =>
                        String(value)
                          .toLowerCase()
                          .includes(query.trim().toLowerCase())
                      )
                  : true
              ),
            ),
          };
        }
      } catch {
        // Fall back
      }

      let filtered = [...demoPlayers];
      if (query.trim()) {
        const q = query.toLowerCase();
        filtered = filtered.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.username?.toLowerCase().includes(q) ||
            p.homeCity?.toLowerCase().includes(q) ||
            p.skillLevel?.toLowerCase().includes(q)
        );
      }
      return { players: filtered };
    },
  });
}

export function usePlayer(username: string) {
  return useQuery({
    queryKey: ["player", username],
    queryFn: async (): Promise<PlayerData> => {
      try {
        const data = await readApiJson<{ player: PlayerData }>(
          apiClient.api.v1.players[":username"].$get({
            param: { username },
          })
        );
        if (data?.player) {
          return data.player;
        }
      } catch {
        // Fall back
      }

      const match = demoPlayers.find(
        (p) =>
          p.username?.toLowerCase() === username.toLowerCase() ||
          p.displayUsername?.toLowerCase() === username.toLowerCase()
      );
      if (match) {
        return match;
      }
      return demoPlayers[0]!;
    },
  });
}
