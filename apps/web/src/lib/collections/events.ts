import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";
import type { QueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { readApiJson } from "@/lib/hooks/api";

export interface MatchPlayer {
  displayUsername?: string | null;
  id: string | null;
  image?: string | null;
  name: string | null;
  username?: string | null;
}

export interface BackendMatchRow {
  match: {
    courtLabel?: string | null;
    id: string;
    playerOneScore?: number | null;
    playerOneUserId?: string | null;
    playerTwoScore?: number | null;
    playerTwoUserId?: string | null;
    round: number;
    status: "cancelled" | "completed" | "in_progress" | "scheduled";
    winnerUserId?: string | null;
  };
  playerOne?: MatchPlayer | null;
  playerTwo?: MatchPlayer | null;
  $synced?: boolean;
}

const matchCollectionsByClient = new WeakMap<
  QueryClient,
  Map<string, ReturnType<typeof createMatchCollection>>
>();

function createMatchCollection(qc: QueryClient, eventId: string) {
  return createCollection(
    queryCollectionOptions({
      getKey: (item: BackendMatchRow) => item.match.id,
      id: `event-matches-${eventId}`,
      onUpdate: async ({ transaction }) => {
        const item = transaction.mutations[0].modified as BackendMatchRow;
        await readApiJson(
          apiClient.api.v1.events[":id"].matches[":matchId"].scores.$post({
            json: {
              playerOneScore: item.match.playerOneScore ?? 0,
              playerTwoScore: item.match.playerTwoScore ?? 0,
              winnerUserId: item.match.winnerUserId ?? "",
            },
            param: { id: eventId, matchId: item.match.id },
          })
        );
      },
      queryClient: qc,
      queryFn: () =>
        readApiJson<{ matches: BackendMatchRow[] }>(
          apiClient.api.v1.events[":id"].bracket.$get({
            param: { id: eventId },
          })
        ),
      queryKey: ["events", eventId, "bracket"],
      select: (res: { matches: BackendMatchRow[] }) => res.matches ?? [],
    })
  );
}

export function getEventMatchesCollection(qc: QueryClient, eventId: string) {
  let map = matchCollectionsByClient.get(qc);
  if (!map) {
    map = new Map();
    matchCollectionsByClient.set(qc, map);
  }
  let col = map.get(eventId);
  if (!col) {
    col = createMatchCollection(qc, eventId);
    map.set(eventId, col);
  }
  return col;
}
