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
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Users className="size-5 text-primary" /> Registered Teams (
          {hasRegisteredPlayers
            ? `${registeredPlayers.length} players`
            : `${fallbackTeams.length * 2} players`}
          )
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Review the player seeds, DUPR ratings, and team profiles for this
          event.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {hasRegisteredPlayers
          ? registeredPlayers.map(({ player, registration }, index) => (
              <Card
                key={registration.id}
                className="border border-border/50 bg-card rounded-xl overflow-hidden shadow-sm hover:border-primary/30 transition-all"
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-border/40">
                    <span className="text-xs text-primary font-bold">
                      Seed #{registration.seed ?? index + 1}
                    </span>
                    <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground font-semibold capitalize">
                      {registration.status}
                    </span>
                  </div>

                  <Link
                    to="/players/$username"
                    params={{ username: player.username ?? player.id }}
                    className="flex items-center gap-2.5 hover:text-primary transition-colors text-xs font-semibold"
                  >
                    <div className="size-9 rounded-full bg-muted flex items-center justify-center font-bold text-foreground overflow-hidden">
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
                      <p className="text-[10px] text-muted-foreground font-normal">
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
                className="border border-border/50 bg-card rounded-xl overflow-hidden shadow-sm hover:border-primary/30 transition-all"
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-border/40">
                    <span className="text-xs text-primary font-bold">
                      Seed #{team.seed}
                    </span>
                    <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground font-semibold">
                      Team Rank #{team.rank}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {/* Player 1 */}
                    <div className="flex items-center justify-between">
                      <Link
                        to="/players/$username"
                        params={{ username: team.p1.username }}
                        className="flex items-center gap-2.5 hover:text-primary transition-colors text-xs font-semibold"
                      >
                        <div className="size-8 rounded-full bg-muted flex items-center justify-center font-bold text-foreground">
                          {team.p1.name[0]}
                        </div>
                        <div>
                          <p>{team.p1.name}</p>
                          <p className="text-[10px] text-muted-foreground font-normal">
                            @{team.p1.username}
                          </p>
                        </div>
                      </Link>
                      <span className="inline-flex items-center gap-1 text-[10px] text-brand-yellow font-bold bg-yellow-500/10 px-1.5 py-0.5 rounded">
                        <Star className="size-3 fill-current" />{" "}
                        {team.p1.rating}
                      </span>
                    </div>

                    <div className="flex items-center justify-center text-muted-foreground/30 text-xs">
                      <div className="h-px bg-border/50 flex-1" />
                      <span className="px-2 font-bold text-[9px] uppercase tracking-wider">
                        and
                      </span>
                      <div className="h-px bg-border/50 flex-1" />
                    </div>

                    {/* Player 2 */}
                    <div className="flex items-center justify-between">
                      <Link
                        to="/players/$username"
                        params={{ username: team.p2.username }}
                        className="flex items-center gap-2.5 hover:text-primary transition-colors text-xs font-semibold"
                      >
                        <div className="size-8 rounded-full bg-muted flex items-center justify-center font-bold text-foreground">
                          {team.p2.name[0]}
                        </div>
                        <div>
                          <p>{team.p2.name}</p>
                          <p className="text-[10px] text-muted-foreground font-normal">
                            @{team.p2.username}
                          </p>
                        </div>
                      </Link>
                      <span className="inline-flex items-center gap-1 text-[10px] text-brand-yellow font-bold bg-yellow-500/10 px-1.5 py-0.5 rounded">
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
