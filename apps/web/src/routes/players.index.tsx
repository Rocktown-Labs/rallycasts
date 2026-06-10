import { Input } from "@rallycaststv/ui/components/input";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { EmptyState, PlayerCard } from "@/components/rally/cards";
import { usePlayers } from "@/lib/hooks";

export const Route = createFileRoute("/players/")({
  component: PlayersPage,
});

function PlayersPage() {
  const [query, setQuery] = useState("");
  const { data, isLoading } = usePlayers(query);
  const players = data?.players ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Players</h1>
        <div className="mt-5 grid gap-3 md:grid-cols-[minmax(16rem,24rem)_12rem_12rem]">
          <Input
            placeholder="Search players..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Input aria-label="Skill filter" placeholder="Skill level" readOnly />
          <Input aria-label="Location filter" placeholder="Location" readOnly />
        </div>
      </div>
      {isLoading ? (
        <div className="h-72 animate-pulse rounded-lg bg-muted" />
      ) : null}
      {players.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {players.map((player) => (
            <PlayerCard key={player.id} player={player} />
          ))}
        </div>
      ) : (
        <EmptyState
          message="Players appear here after onboarding."
          title="No players found"
        />
      )}
    </div>
  );
}
