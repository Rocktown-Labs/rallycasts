import { Button } from "@rallycaststv/ui/components/button";
import { Card, CardContent } from "@rallycaststv/ui/components/card";
import { Input } from "@rallycaststv/ui/components/input";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useLeague, useUpdateLeague } from "@/lib/hooks/use-leagues";
import type { LeagueFormat } from "@/lib/hooks/use-leagues";

export const Route = createFileRoute("/_auth/u/organizer/leagues/$id")({
  component: LeagueEditorPage,
});

const formats: [LeagueFormat, string][] = [
  ["singles", "Singles"],
  ["doubles_fixed", "Fixed doubles"],
  ["squad_ab", "A/B squads"],
  ["mlp_draft", "MLP draft"],
  ["ladder", "Ladder"],
];

function LeagueEditorPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useLeague(id);
  const updateLeague = useUpdateLeague(id);
  const league = data?.league;
  const [name, setName] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [format, setFormat] = useState<LeagueFormat>("singles");
  const [maxUnits, setMaxUnits] = useState("8");
  const [seasonWeeks, setSeasonWeeks] = useState("6");
  const [matchWindowDays, setMatchWindowDays] = useState("7");

  useEffect(() => {
    if (!league) {
      return;
    }
    setName(league.name);
    setLocationLabel(league.locationLabel);
    setFormat(league.format);
    setMaxUnits(String(league.maxUnits));
    setSeasonWeeks(String(league.seasonWeeks));
    setMatchWindowDays(String(league.matchWindowDays));
  }, [league]);

  if (isLoading) {
    return (
      <div className="bg-muted mx-auto h-48 max-w-3xl animate-pulse rounded-xl" />
    );
  }

  if (!league) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 text-center">
        <h1 className="text-2xl font-bold">League not found</h1>
        <Button onClick={() => navigate({ to: "/u/organizer/leagues" })}>
          Back to leagues
        </Button>
      </div>
    );
  }

  const save = () => {
    updateLeague.mutate(
      {
        format,
        locationLabel,
        matchWindowDays: Number(matchWindowDays),
        maxUnits: Number(maxUnits),
        name,
        seasonWeeks: Number(seasonWeeks),
      },
      {
        onError: (error) => {
          toast.error(
            error instanceof Error ? error.message : "Could not save league."
          );
        },
        onSuccess: () => toast.success("League saved"),
      }
    );
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-primary text-xs font-semibold tracking-[0.22em] uppercase">
          Organizer Tools
        </p>
        <h1 className="mt-1 text-3xl font-bold">{league.name}</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Configure the league foundation before adding players and scheduling
          weekly matchups.
        </p>
      </header>

      <Card className="rounded-xl">
        <CardContent className="grid gap-5 p-6">
          <label
            className="grid gap-1.5 text-sm font-semibold"
            htmlFor="league-name"
          >
            League name
            <Input
              id="league-name"
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
          </label>
          <label
            className="grid gap-1.5 text-sm font-semibold"
            htmlFor="league-location"
          >
            Location
            <Input
              id="league-location"
              onChange={(event) => setLocationLabel(event.target.value)}
              value={locationLabel}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label
              className="grid gap-1.5 text-sm font-semibold"
              htmlFor="league-units"
            >
              Units
              <Input
                id="league-units"
                min={2}
                onChange={(event) => setMaxUnits(event.target.value)}
                type="number"
                value={maxUnits}
              />
            </label>
            <label
              className="grid gap-1.5 text-sm font-semibold"
              htmlFor="league-season-weeks"
            >
              Season weeks
              <Input
                id="league-season-weeks"
                max={52}
                min={1}
                onChange={(event) => setSeasonWeeks(event.target.value)}
                type="number"
                value={seasonWeeks}
              />
            </label>
            <label
              className="grid gap-1.5 text-sm font-semibold"
              htmlFor="league-match-window"
            >
              Match window
              <Input
                id="league-match-window"
                max={30}
                min={1}
                onChange={(event) => setMatchWindowDays(event.target.value)}
                type="number"
                value={matchWindowDays}
              />
            </label>
          </div>
          <div className="grid gap-2">
            <span className="text-sm font-semibold">Format</span>
            <div className="flex flex-wrap gap-2">
              {formats.map(([value, label]) => (
                <button
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                    format === value
                      ? "border-primary bg-primary/10"
                      : "border-border"
                  }`}
                  key={value}
                  onClick={() => setFormat(value)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-between border-t pt-4">
            <Button
              onClick={() => navigate({ to: "/u/organizer/leagues" })}
              type="button"
              variant="outline"
            >
              Back
            </Button>
            <Button disabled={updateLeague.isPending} onClick={save}>
              {updateLeague.isPending ? "Saving…" : "Save league"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
