import { Button } from "@rallycaststv/ui/components/button";
import { Card, CardContent } from "@rallycaststv/ui/components/card";
import { Input } from "@rallycaststv/ui/components/input";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { useCreateLeague } from "@/lib/hooks";

export const Route = createFileRoute("/_auth/u/organizer/leagues/new")({
  component: NewLeaguePage,
});

const formats = [
  ["singles", "Singles", "Individual players in a weekly round robin."],
  ["doubles_fixed", "Fixed doubles", "Pre-registered two-player teams."],
  ["squad_ab", "A/B squads", "Club squads with weighted A and B lines."],
  ["mlp_draft", "MLP draft", "Free agents drafted into four-player teams."],
  ["ladder", "Ladder", "Players move between weekly ranking pods."],
] as const;

function NewLeaguePage() {
  const navigate = useNavigate();
  const createLeague = useCreateLeague();
  const [name, setName] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [format, setFormat] = useState<(typeof formats)[number][0]>("singles");
  const [maxUnits, setMaxUnits] = useState("8");
  const [seasonWeeks, setSeasonWeeks] = useState("6");
  const [matchWindowDays, setMatchWindowDays] = useState("7");

  const submit = () => {
    if (!name.trim() || !locationLabel.trim()) {
      toast.error("Add a league name and location.");
      return;
    }
    createLeague.mutate(
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
            error instanceof Error ? error.message : "Could not create league."
          );
        },
        onSuccess: async (result) => {
          toast.success("League created");
          await navigate({
            params: { id: result.league.id },
            to: "/u/organizer/leagues/$id",
          });
        },
      }
    );
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-primary text-xs font-semibold tracking-[0.22em] uppercase">
          Organizer Tools
        </p>
        <h1 className="mt-1 text-3xl font-bold">Create a league</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Set the season foundation now; scheduling, standings, and drafts will
          build on this league in the next phases.
        </p>
      </header>

      <Card className="rounded-xl">
        <CardContent className="grid gap-5 p-6">
          <Field label="League name">
            <Input
              onChange={(event) => setName(event.target.value)}
              placeholder="Kanis Park Spring League"
              value={name}
            />
          </Field>
          <Field label="Location">
            <Input
              onChange={(event) => setLocationLabel(event.target.value)}
              placeholder="Kanis Park, Little Rock"
              value={locationLabel}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Units">
              <Input
                min={2}
                onChange={(event) => setMaxUnits(event.target.value)}
                type="number"
                value={maxUnits}
              />
            </Field>
            <Field label="Season weeks">
              <Input
                min={1}
                max={52}
                onChange={(event) => setSeasonWeeks(event.target.value)}
                type="number"
                value={seasonWeeks}
              />
            </Field>
          </div>
          <Field label="Match window (days)">
            <Input
              min={1}
              max={30}
              onChange={(event) => setMatchWindowDays(event.target.value)}
              type="number"
              value={matchWindowDays}
            />
          </Field>
          <div className="grid gap-2">
            <span className="text-sm font-semibold">Format</span>
            <div className="grid gap-2 sm:grid-cols-2">
              {formats.map(([value, label, description]) => (
                <button
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    format === value
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                  key={value}
                  onClick={() => setFormat(value)}
                  type="button"
                >
                  <span className="text-sm font-bold">{label}</span>
                  <span className="text-muted-foreground mt-1 block text-xs">
                    {description}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button
              onClick={() => navigate({ to: "/u/organizer/leagues" })}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={createLeague.isPending} onClick={submit}>
              {createLeague.isPending ? "Creating…" : "Create league"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold">
      {label}
      {children}
    </label>
  );
}
