import { Button } from "@rallycaststv/ui/components/button";
import { Card, CardContent } from "@rallycaststv/ui/components/card";
import { Input } from "@rallycaststv/ui/components/input";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, Sparkles } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { toast } from "sonner";

import { PlaceSearchPicker } from "@/components/places/place-search-picker";
import type { SelectedPlace } from "@/components/places/place-search-picker";
import { apiClient } from "@/lib/api-client";
import { useProfile } from "@/lib/hooks";
import { readApiJson } from "@/lib/hooks/api";

export const Route = createFileRoute("/_auth/u/organizer/tournaments/new")({
  component: () => <NewTournamentPage />,
});

const eventTypeChoices = [
  {
    description: "Bracketed play with seeds, courts, and placements.",
    label: "Tournament",
    value: "tournament" as const,
  },
  {
    description: "Coached sessions and skills training.",
    label: "Clinic",
    value: "clinic" as const,
  },
  {
    description: "Recurring play with standings over time.",
    label: "League",
    value: "league" as const,
  },
  {
    description: "Casual drop-in games, no bracket.",
    label: "Open play",
    value: "open_play" as const,
  },
];

const NewTournamentPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: myProfile } = useProfile();
  const isPlatformAdmin = Boolean(myProfile?.isPlatformAdmin);

  const [name, setName] = useState("");
  const [eventType, setEventType] = useState<
    "clinic" | "league" | "open_play" | "tournament"
  >("tournament");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [capacity, setCapacity] = useState("16");
  const [entryFee, setEntryFee] = useState("0");
  const [courts, setCourts] = useState("Court 1, Court 2, Center Court");
  const [locationQuery, setLocationQuery] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(
    null
  );
  const [seedWithDemo, setSeedWithDemo] = useState(false);
  const [seedPlayerCount, setSeedPlayerCount] = useState("8");

  const createTournament = useMutation({
    mutationFn: () =>
      readApiJson(
        apiClient.api.v1.events.$post({
          json: {
            bracketType: "single_elimination",
            capacity: Number(capacity),
            courtLabels: courts
              .split(",")
              .map((court) => court.trim())
              .filter(Boolean),
            endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
            entryFeeCents: Math.round(Number(entryFee) * 100),
            eventType,
            googlePlaceId: selectedPlace?.placeId,
            name,
            startsAt: new Date(startsAt).toISOString(),
            status: "published",
          },
        })
      ),
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Could not publish the event."
      );
    },
    onSuccess: async (result) => {
      setName("");
      setLocationQuery("");
      setSelectedPlace(null);
      await queryClient.invalidateQueries({ queryKey: ["events", "mine"] });
      await queryClient.invalidateQueries({
        queryKey: ["organizer-analytics"],
      });

      if (seedWithDemo && isPlatformAdmin) {
        try {
          await readApiJson(
            apiClient.api.v1.events[":id"]["seed-demo"].$post({
              json: { playerCount: Number(seedPlayerCount) || 8 },
              param: { id: result.event.id },
            })
          );
          toast.success(
            `Event published and seeded with ${seedPlayerCount} demo competitors!`
          );
          await navigate({
            params: { id: result.event.id },
            to: "/events/$id/bracket",
          });
          return;
        } catch {
          // Fall through to the regular navigate
        }
      }

      toast.success("Event published");
      await navigate({
        params: { id: result.event.id },
        to: "/events/$id",
      });
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Give your event a name.");
      return;
    }
    if (!startsAt) {
      toast.error("Pick when the event starts.");
      return;
    }
    if (!selectedPlace) {
      toast.error("Search and select a location.");
      return;
    }
    createTournament.mutate();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-primary text-xs font-semibold tracking-[0.22em] uppercase">
          Organizer Tools
        </p>
        <h1 className="mt-1 text-3xl font-bold">Host an event</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Name it, set when it starts, and pick where it happens. Players can
          register the moment it is published.
        </p>
      </header>

      <Card className="rounded-lg">
        <CardContent>
          <form className="grid gap-4" onSubmit={submit}>
            <div className="grid gap-1.5 text-sm font-semibold">
              <label className="text-foreground" htmlFor="new-event-name">
                Event name
              </label>
              <Input
                className="rounded-lg font-normal"
                id="new-event-name"
                onChange={(changeEvent) => setName(changeEvent.target.value)}
                placeholder="Spring Classic 2026"
                value={name}
              />
            </div>

            <div className="grid gap-1.5 text-sm font-semibold">
              <span className="text-foreground">Location</span>
              <PlaceSearchPicker
                id="new-event-location"
                label="Event location"
                onPlaceChange={setSelectedPlace}
                onQueryChange={setLocationQuery}
                query={locationQuery}
                selectedPlace={selectedPlace}
              />
            </div>

            <div className="grid gap-1.5 text-sm font-semibold">
              <label className="text-foreground" htmlFor="new-event-starts">
                Starts
              </label>
              <Input
                className="rounded-lg font-normal"
                id="new-event-starts"
                onChange={(changeEvent) =>
                  setStartsAt(changeEvent.target.value)
                }
                type="datetime-local"
                value={startsAt}
              />
            </div>

            <div className="grid gap-1.5 text-sm font-semibold">
              <label className="text-foreground" htmlFor="new-event-ends">
                Ends
              </label>
              <Input
                className="rounded-lg font-normal"
                id="new-event-ends"
                onChange={(changeEvent) => setEndsAt(changeEvent.target.value)}
                type="datetime-local"
                value={endsAt}
              />
              <span className="text-muted-foreground text-[11px] font-normal">
                Leave blank if it ends when play finishes.
              </span>
            </div>

            <div className="grid gap-1.5 text-sm font-semibold">
              <span className="text-foreground" id="new-event-type-label">
                Event type
              </span>
              <div className="grid gap-2 sm:grid-cols-2">
                {eventTypeChoices.map((choice) => (
                  <button
                    aria-pressed={eventType === choice.value}
                    className={(() => {
                      const active = eventType === choice.value;
                      return `cursor-pointer rounded-lg border p-3 text-left transition-colors ${
                        active
                          ? "border-primary bg-primary/10"
                          : "border-border bg-muted/10 hover:border-primary/40"
                      }`;
                    })()}
                    key={choice.value}
                    onClick={() => setEventType(choice.value)}
                    type="button"
                  >
                    <span className="text-foreground block text-sm font-bold">
                      {choice.label}
                    </span>
                    <span className="text-muted-foreground mt-1 block text-xs">
                      {choice.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5 text-sm font-semibold">
                <label className="text-foreground" htmlFor="new-event-capacity">
                  Player capacity
                </label>
                <Input
                  className="rounded-lg font-normal"
                  id="new-event-capacity"
                  min="2"
                  onChange={(changeEvent) =>
                    setCapacity(changeEvent.target.value)
                  }
                  type="number"
                  value={capacity}
                />
              </div>
              <div className="grid gap-1.5 text-sm font-semibold">
                <label className="text-foreground" htmlFor="new-event-fee">
                  Entry fee ($)
                </label>
                <Input
                  className="rounded-lg font-normal"
                  id="new-event-fee"
                  min="0"
                  onChange={(changeEvent) =>
                    setEntryFee(changeEvent.target.value)
                  }
                  step="0.01"
                  type="number"
                  value={entryFee}
                />
              </div>
            </div>

            <div className="grid gap-1.5 text-sm font-semibold">
              <label className="text-foreground" htmlFor="new-event-courts">
                Courts (comma separated)
              </label>
              <Input
                className="rounded-lg font-normal"
                id="new-event-courts"
                onChange={(changeEvent) => setCourts(changeEvent.target.value)}
                placeholder="Court 1, Court 2, Center Court"
                value={courts}
              />
            </div>

            {isPlatformAdmin ? (
              <div className="border-primary/30 bg-primary/5 flex flex-wrap items-center gap-3 rounded-lg border p-3">
                <label
                  className="flex cursor-pointer items-center gap-2 text-xs font-semibold"
                  htmlFor="new-event-seed"
                >
                  <input
                    checked={seedWithDemo}
                    className="border-border text-primary focus:ring-primary size-4 cursor-pointer rounded"
                    id="new-event-seed"
                    onChange={(changeEvent) =>
                      setSeedWithDemo(changeEvent.target.checked)
                    }
                    type="checkbox"
                  />
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="text-primary size-4" />
                    Seed a demo bracket
                  </span>
                </label>
                {seedWithDemo ? (
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <label htmlFor="new-event-seed-count">Players</label>
                    <Input
                      className="w-24 rounded-lg font-normal"
                      id="new-event-seed-count"
                      max="64"
                      min="2"
                      onChange={(changeEvent) =>
                        setSeedPlayerCount(changeEvent.target.value)
                      }
                      type="number"
                      value={seedPlayerCount}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            <Button
              className="w-full rounded-lg"
              disabled={createTournament.isPending}
              type="submit"
            >
              <Plus className="size-4" />
              Publish event
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
