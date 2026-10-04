import { Card, CardContent } from "@rallycaststv/ui/components/card";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { Star, Users } from "lucide-react";

import { demoEnabled } from "@/lib/demo-data";
import { useEventPlayers } from "@/lib/hooks";

export const Route = createFileRoute("/events/$id/players")({
  component: EventPlayersTab,
});

interface Team {
  rank: number;
  p1: { name: string; username: string; rating: string; img?: string };
  p2: { name: string; username: string; rating: string; img?: string };
  seed: number;
}

const mockTeams: Team[] = [
  {
    p1: { name: "CG Stewart", rating: "4.0", username: "cgstewart" },
    p2: { name: "Sarah Johnson", rating: "4.5", username: "sarahpickle" },
    rank: 1,
    seed: 1,
  },
  {
    p1: { name: "Mike Rodriguez", rating: "3.5", username: "mikeball" },
    p2: { name: "John Doe", rating: "4.0", username: "johndoe" },
    rank: 2,
    seed: 2,
  },
  {
    p1: { name: "David Miller", rating: "3.8", username: "davidm" },
    p2: { name: "Emma Watson", rating: "3.5", username: "emmaw" },
    rank: 3,
    seed: 3,
  },
  {
    p1: { name: "Lucas Scott", rating: "4.2", username: "lucass" },
    p2: { name: "Nathan Hale", rating: "3.9", username: "nathanh" },
    rank: 4,
    seed: 4,
  },
];

function EventPlayersTab() {
  const { id } = useParams({ from: "/events/$id/players" });
  const { data } = useEventPlayers(id);
  const registeredPlayers = data?.players ?? [];
  const fallbackTeams = demoEnabled ? mockTeams : [];
  const hasRegisteredPlayers = registeredPlayers.length > 0;

  return (
    <div className="animate-in fade-in space-y-6 duration-300">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Users className="text-primary size-5" /> Registered Teams (
          {hasRegisteredPlayers
            ? `${registeredPlayers.length} players`
            : `${fallbackTeams.length * 2} players`}
          )
        </h2>
        <p className="text-muted-foreground mt-1 text-xs">
          Review the player seeds, DUPR ratings, and team profiles for this
          event.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {hasRegisteredPlayers
          ? registeredPlayers.map(({ player, registration }, index) => (
              <Card
                key={registration.id}
                className="border-border/50 bg-card hover:border-primary/30 overflow-hidden rounded-xl border shadow-sm transition-all"
              >
                <CardContent className="space-y-3 p-4">
                  <div className="border-border/40 flex items-center justify-between border-b pb-2">
                    <span className="text-primary text-xs font-bold">
                      Seed #{registration.seed ?? index + 1}
                    </span>
                    <span className="bg-muted text-muted-foreground rounded px-2 py-0.5 text-[10px] font-semibold capitalize">
                      {registration.status}
                    </span>
                  </div>

                  <Link
                    to="/players/$username"
                    params={{ username: player.username ?? player.id }}
                    className="hover:text-primary flex items-center gap-2.5 text-xs font-semibold transition-colors"
                  >
                    <div className="bg-muted text-foreground flex size-9 items-center justify-center overflow-hidden rounded-full font-bold">
                      {player.image ? (
                        <img
                          src={player.image}
                          alt={player.name}
                          className="size-full object-cover"
                        />
                      ) : (
                        player.name[0]
                      )}
                    </div>
                    <div>
                      <p>{player.name}</p>
                      <p className="text-muted-foreground text-[10px] font-normal">
                        @{player.username || player.displayUsername || "player"}
                      </p>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            ))
          : fallbackTeams.map((team) => (
              <Card
                key={team.rank}
                className="border-border/50 bg-card hover:border-primary/30 overflow-hidden rounded-xl border shadow-sm transition-all"
              >
                <CardContent className="space-y-3 p-4">
                  <div className="border-border/40 flex items-center justify-between border-b pb-2">
                    <span className="text-primary text-xs font-bold">
                      Seed #{team.seed}
                    </span>
                    <span className="bg-muted text-muted-foreground rounded px-2 py-0.5 text-[10px] font-semibold">
                      Team Rank #{team.rank}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {/* Player 1 */}
                    <div className="flex items-center justify-between">
                      <Link
                        to="/players/$username"
                        params={{ username: team.p1.username }}
                        className="hover:text-primary flex items-center gap-2.5 text-xs font-semibold transition-colors"
                      >
                        <div className="bg-muted text-foreground flex size-8 items-center justify-center rounded-full font-bold">
                          {team.p1.name[0]}
                        </div>
                        <div>
                          <p>{team.p1.name}</p>
                          <p className="text-muted-foreground text-[10px] font-normal">
                            @{team.p1.username}
                          </p>
                        </div>
                      </Link>
                      <span className="text-brand-yellow inline-flex items-center gap-1 rounded bg-yellow-500/10 px-1.5 py-0.5 text-[10px] font-bold">
                        <Star className="size-3 fill-current" />{" "}
                        {team.p1.rating}
                      </span>
                    </div>

                    <div className="text-muted-foreground/30 flex items-center justify-center text-xs">
                      <div className="bg-border/50 h-px flex-1" />
                      <span className="px-2 text-[9px] font-bold tracking-wider uppercase">
                        and
                      </span>
                      <div className="bg-border/50 h-px flex-1" />
                    </div>

                    {/* Player 2 */}
                    <div className="flex items-center justify-between">
                      <Link
                        to="/players/$username"
                        params={{ username: team.p2.username }}
                        className="hover:text-primary flex items-center gap-2.5 text-xs font-semibold transition-colors"
                      >
                        <div className="bg-muted text-foreground flex size-8 items-center justify-center rounded-full font-bold">
                          {team.p2.name[0]}
                        </div>
                        <div>
                          <p>{team.p2.name}</p>
                          <p className="text-muted-foreground text-[10px] font-normal">
                            @{team.p2.username}
                          </p>
                        </div>
                      </Link>
                      <span className="text-brand-yellow inline-flex items-center gap-1 rounded bg-yellow-500/10 px-1.5 py-0.5 text-[10px] font-bold">
                        <Star className="size-3 fill-current" />{" "}
                        {team.p2.rating}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>
    </div>
  );
}
