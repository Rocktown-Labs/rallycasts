import { Button } from "@rallycaststv/ui/components/button";
import { Card, CardContent } from "@rallycaststv/ui/components/card";
import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { Plus, Users } from "lucide-react";

import { useMyLeagues } from "@/lib/hooks";

export const Route = createFileRoute("/_auth/u/organizer/leagues")({
  component: OrganizerLeaguesPage,
});

const formatLabels = {
  doubles_fixed: "Fixed doubles",
  ladder: "Ladder",
  mlp_draft: "MLP draft",
  singles: "Singles",
  squad_ab: "A/B squads",
} as const;

function OrganizerLeaguesPage() {
  const navigate = useNavigate();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const { data, isLoading } = useMyLeagues();
  const leagues = data?.leagues ?? [];

  if (pathname !== "/u/organizer/leagues") {
    return <Outlet />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-primary text-xs font-semibold tracking-[0.22em] uppercase">
            Organizer Tools
          </p>
          <h1 className="mt-1 text-3xl font-bold">Leagues</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
            Create a season, choose its format, and invite players into a
            structured weekly competition.
          </p>
        </div>
        <Button
          className="rounded-lg"
          onClick={() => navigate({ to: "/u/organizer/leagues/new" })}
        >
          <Plus className="size-4" />
          Create league
        </Button>
      </header>

      {isLoading ? (
        <div className="bg-muted h-48 animate-pulse rounded-xl" />
      ) : null}

      {!isLoading && leagues.length === 0 ? (
        <Card className="rounded-lg">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <Users className="text-muted-foreground size-10" />
            <div>
              <p className="font-bold">No leagues yet</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Start with a simple singles or doubles season.
              </p>
            </div>
            <Button
              className="rounded-lg"
              onClick={() => navigate({ to: "/u/organizer/leagues/new" })}
            >
              <Plus className="size-4" />
              Create league
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && leagues.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {leagues.map((league) => (
            <Link
              className="group"
              key={league.id}
              params={{ id: league.id }}
              to="/u/organizer/leagues/$id"
            >
              <Card className="group-hover:border-primary/60 h-full rounded-xl transition-colors">
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                        {formatLabels[league.format]}
                      </p>
                      <h2 className="mt-1 text-lg font-bold">{league.name}</h2>
                    </div>
                    <span className="bg-muted rounded-full px-2 py-1 text-[10px] font-bold uppercase">
                      {league.status}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {league.locationLabel}
                  </p>
                  <div className="text-muted-foreground flex items-center justify-between text-xs">
                    <span>
                      {league.currentUnits}/{league.maxUnits} units
                    </span>
                    <span>{league.seasonWeeks} weeks</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
