import { Button } from "@rallycaststv/ui/components/button";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useParams } from "@tanstack/react-router";
import {
  Award,
  CheckCircle2,
  Radio,
  Sparkles,
  Swords,
  Video,
} from "lucide-react";
import { toast } from "sonner";

import { demoEnabled } from "@/lib/demo-data";
import {
  useCreateCastingJob,
  useEventBracket,
  useGenerateEventBracket,
  useSeedDemoEvent,
} from "@/lib/hooks";

import { useEventContext } from "./events.$id";

export const Route = createFileRoute("/events/$id/bracket")({
  component: EventBracketTab,
});

const demoRounds = [
  {
    matches: [
      {
        court: "Court 1",
        id: "demo-q1",
        one: "CG Stewart",
        score: "11–7",
        status: "completed",
        two: "Jordan Lee",
      },
      {
        court: "Court 2",
        id: "demo-q2",
        one: "Taylor Smith",
        score: "11–9",
        status: "completed",
        two: "Alex Rivera",
      },
      {
        court: "Court 3",
        id: "demo-q3",
        one: "Morgan Chen",
        score: "Scheduled",
        status: "scheduled",
        two: "Sam Davis",
      },
      {
        court: "Court 4",
        id: "demo-q4",
        one: "Jamie Wilson",
        score: "Scheduled",
        status: "scheduled",
        two: "Casey Brown",
      },
    ],
    round: 1,
  },
  {
    matches: [
      {
        court: "Court 1",
        id: "demo-s1",
        one: "CG Stewart",
        score: "Awaiting opponent",
        status: "scheduled",
        two: "TBD",
      },
      {
        court: "Court 2",
        id: "demo-s2",
        one: "TBD",
        score: "Awaiting results",
        status: "scheduled",
        two: "TBD",
      },
    ],
    round: 2,
  },
  {
    matches: [
      {
        court: "Championship Court",
        id: "demo-f1",
        one: "TBD",
        score: "Final",
        status: "scheduled",
        two: "TBD",
      },
    ],
    round: 3,
  },
];

const getRoundLabel = (round: number, isLive: boolean) => {
  if (isLive) {
    return `Round ${round}`;
  }
  if (round === 3) {
    return "Final";
  }
  return round === 2 ? "Semifinals" : "Quarterfinals";
};

function EventBracketTab() {
  const { id } = useParams({ from: "/events/$id/bracket" });
  const { event } = useEventContext();
  const queryClient = useQueryClient();
  const { data } = useEventBracket(id);
  const generateBracket = useGenerateEventBracket(id);
  const seedDemo = useSeedDemoEvent(id);
  const createCastingJob = useCreateCastingJob();
  const backendMatches = data?.matches ?? [];
  const roundNumbers = [
    ...new Set(backendMatches.map(({ match }) => match.round)),
  ].toSorted((left, right) => left - right);
  const hasRealBracket = backendMatches.length > 0;
  const previewRounds = demoEnabled ? demoRounds : [];

  const generate = async () => {
    try {
      await generateBracket.mutateAsync();
      await queryClient.invalidateQueries({
        queryKey: ["events", id, "bracket"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["events", id, "matches"],
      });
      toast.success("Bracket regenerated from checked-in seeds.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to generate bracket"
      );
    }
  };

  const showPreviewNotice = !hasRealBracket && previewRounds.length > 0;

  const requestCaster = (matchId: string) => {
    createCastingJob.mutate(
      {
        notes: `Caster requested for ${event.name}, match ${matchId}. Tips can be added when the caster is booked.`,
        requestedHours: 1,
        startsAt: event.startsAt,
        venueId: event.venueId ?? undefined,
      },
      {
        onError: () => toast.error("Could not request a caster."),
        onSuccess: () => toast.success("Caster request sent."),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <Award className="size-5 text-primary" /> Tournament bracket
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Seeds create round one. Confirmed winners automatically advance and
            receive their next court assignment.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            className="gap-1.5 font-bold cursor-pointer"
            disabled={seedDemo.isPending}
            onClick={() => {
              seedDemo.mutate(undefined, {
                onError: (err) =>
                  toast.error(
                    err instanceof Error
                      ? err.message
                      : "Failed to seed demo tournament"
                  ),
                onSuccess: () =>
                  toast.success(
                    "Tournament seeded with 8 demo players and live bracket!"
                  ),
              });
            }}
            variant="outline"
          >
            <Sparkles className="size-4 text-primary" />
            Seed 8 Demo Players & Live Bracket
          </Button>
          <Button disabled={generateBracket.isPending} onClick={generate}>
            {hasRealBracket ? "Regenerate from seeds" : "Generate live bracket"}
          </Button>
        </div>
      </div>

      {showPreviewNotice ? (
        <div className="rounded-xl border border-dashed bg-muted/20 p-4 text-xs text-muted-foreground">
          Preview mode: this sample shows how a seeded eight-player bracket
          progresses. Generate the live bracket after players register.
        </div>
      ) : null}

      <div className="grid min-w-0 gap-5 overflow-x-auto lg:grid-flow-col lg:auto-cols-[minmax(17rem,1fr)]">
        {(hasRealBracket
          ? roundNumbers.map((round) => ({ round }))
          : previewRounds
        ).map((roundData) => {
          const realMatches = backendMatches.filter(
            ({ match }) => match.round === roundData.round
          );
          const previewMatches =
            "matches" in roundData && Array.isArray(roundData.matches)
              ? (roundData.matches as (typeof demoRounds)[number]["matches"])
              : [];
          return (
            <section className="min-w-64 space-y-3" key={roundData.round}>
              <h3 className="text-center text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
                {getRoundLabel(roundData.round, hasRealBracket)}
              </h3>
              {hasRealBracket
                ? realMatches.map(({ match, playerOne, playerTwo, winner }) => (
                    <article
                      className="rounded-xl border bg-card p-4"
                      key={match.id}
                    >
                      <div className="mb-3 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{match.courtLabel ?? "Court TBD"}</span>
                        <span className="capitalize">{match.status}</span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <p
                          className={
                            winner?.id === playerOne?.id
                              ? "font-black text-primary"
                              : "font-semibold"
                          }
                        >
                          {playerOne?.name ?? "Bye"}{" "}
                          <span className="float-right">
                            {match.playerOneScore ?? "—"}
                          </span>
                        </p>
                        <p
                          className={
                            winner?.id === playerTwo?.id
                              ? "font-black text-primary"
                              : "font-semibold"
                          }
                        >
                          {playerTwo?.name ?? "Bye"}{" "}
                          <span className="float-right">
                            {match.playerTwoScore ?? "—"}
                          </span>
                        </p>
                      </div>
                      <Button
                        className="mt-4 w-full"
                        onClick={() => requestCaster(match.id)}
                        size="sm"
                        variant="outline"
                      >
                        <Video className="size-3.5" /> Request caster
                      </Button>
                    </article>
                  ))
                : previewMatches.map((match) => (
                    <article
                      className="rounded-xl border bg-card p-4"
                      key={match.id}
                    >
                      <div className="mb-3 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{match.court}</span>
                        {match.status === "completed" ? (
                          <CheckCircle2 className="size-3 text-primary" />
                        ) : (
                          <Radio className="size-3" />
                        )}
                      </div>
                      <p className="text-sm font-bold">{match.one}</p>
                      <p className="my-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Swords className="size-3" /> {match.score}
                      </p>
                      <p className="text-sm font-bold">{match.two}</p>
                    </article>
                  ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}
