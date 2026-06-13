import { Button } from "@rallycaststv/ui/components/button";
import { Card, CardContent } from "@rallycaststv/ui/components/card";
import { Input } from "@rallycaststv/ui/components/input";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { Clock, MapPin, Swords, Video, Trophy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { useEventBracket, useSubmitMatchScore } from "@/lib/hooks";

export const Route = createFileRoute("/events/$id/matches")({
  component: EventMatchesTab,
});

interface Match {
  id: string;
  round: string;
  t1: string;
  t2: string;
  score?: string;
  court: string;
  time: string;
  status: "scheduled" | "live" | "completed";
  caster?: string;
}

interface BackendMatchRow {
  match: {
    courtLabel?: string | null;
    id: string;
    playerOneScore?: number | null;
    playerOneUserId?: string | null;
    playerTwoScore?: number | null;
    playerTwoUserId?: string | null;
    round: number;
    status: "scheduled" | "in_progress" | "completed" | "cancelled";
    winnerUserId?: string | null;
  };
  playerOne?: { id: string | null; name: string | null } | null;
  playerTwo?: { id: string | null; name: string | null } | null;
}

const mockMatches: Match[] = [
  {
    court: "Court 1",
    id: "m1",
    round: "Quarterfinals",
    score: "11-9, 11-7",
    status: "completed",
    t1: "Sarah & CG",
    t2: "David & Emma",
    time: "10:00 AM",
  },
  {
    court: "Court 2",
    id: "m2",
    round: "Quarterfinals",
    score: "11-8, 6-11, 11-5",
    status: "completed",
    t1: "Mike & John",
    t2: "Lucas & Nathan",
    time: "10:30 AM",
  },
  {
    caster: "Premium Caster Alex",
    court: "Court 1",
    id: "m3",
    round: "Semifinals",
    score: "11-8, 11-6",
    status: "completed",
    t1: "Sarah & CG",
    t2: "Mike & John",
    time: "1:00 PM",
  },
  {
    caster: "Assigning Caster...",
    court: "Court 1",
    id: "m4",
    round: "Finals",
    status: "scheduled",
    t1: "Sarah & CG",
    t2: "Winner SF2",
    time: "3:00 PM",
  },
];

function getMatchStatusClass(
  status: "scheduled" | "live" | "completed"
): string {
  if (status === "completed") {
    return "bg-muted text-muted-foreground";
  }
  if (status === "live") {
    return "bg-red-500/20 text-red-400 animate-pulse";
  }
  return "bg-yellow-500/20 text-yellow-400";
}

const getScoreToastMessage = (status: "confirmed" | "disputed" | "pending") => {
  if (status === "confirmed") {
    return "Score confirmed and match advanced.";
  }
  if (status === "disputed") {
    return "Score dispute sent to organizer.";
  }
  return "Score submitted. Waiting for the other team.";
};

const getDisplayStatus = (
  status: BackendMatchRow["match"]["status"]
): "scheduled" | "live" | "completed" => {
  if (status === "in_progress") {
    return "live";
  }
  if (status === "cancelled") {
    return "completed";
  }
  return status;
};

function ScoreSubmitForm({
  eventId,
  row,
}: {
  eventId: string;
  row: BackendMatchRow;
}) {
  const [playerOneScore, setPlayerOneScore] = useState(
    row.match.playerOneScore?.toString() ?? ""
  );
  const [playerTwoScore, setPlayerTwoScore] = useState(
    row.match.playerTwoScore?.toString() ?? ""
  );
  const [winnerUserId, setWinnerUserId] = useState(
    row.match.winnerUserId ?? row.match.playerOneUserId ?? ""
  );
  const submitScore = useSubmitMatchScore(eventId, row.match.id);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const firstScore = Number.parseInt(playerOneScore, 10);
    const secondScore = Number.parseInt(playerTwoScore, 10);

    if (
      Number.isNaN(firstScore) ||
      Number.isNaN(secondScore) ||
      !winnerUserId
    ) {
      toast.error("Enter both scores and choose a winner.");
      return;
    }

    submitScore.mutate(
      {
        playerOneScore: firstScore,
        playerTwoScore: secondScore,
        winnerUserId,
      },
      {
        onError: () => {
          toast.error("Could not submit score.");
        },
        onSuccess: (result) => {
          toast.success(getScoreToastMessage(result.status));
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
      <Input
        aria-label={`${row.playerOne?.name ?? "Player one"} score`}
        value={playerOneScore}
        onChange={(event) => setPlayerOneScore(event.target.value)}
        className="h-8 w-16 text-xs"
        inputMode="numeric"
      />
      <Input
        aria-label={`${row.playerTwo?.name ?? "Player two"} score`}
        value={playerTwoScore}
        onChange={(event) => setPlayerTwoScore(event.target.value)}
        className="h-8 w-16 text-xs"
        inputMode="numeric"
      />
      <select
        aria-label="Winner"
        value={winnerUserId}
        onChange={(event) => setWinnerUserId(event.target.value)}
        className="h-8 rounded-md border border-border bg-background px-2 text-xs"
      >
        <option value={row.match.playerOneUserId ?? ""}>
          {row.playerOne?.name ?? "Player one"}
        </option>
        <option value={row.match.playerTwoUserId ?? ""}>
          {row.playerTwo?.name ?? "Player two"}
        </option>
      </select>
      <Button
        type="submit"
        disabled={submitScore.isPending}
        className="h-8 rounded-md text-xs"
      >
        Submit score
      </Button>
    </form>
  );
}

function EventMatchesTab() {
  const { id } = useParams({ from: "/events/$id/matches" });
  const { data: session } = authClient.useSession();
  const { data: bracketData } = useEventBracket(id);
  const backendMatches = (bracketData?.matches ?? []) as BackendMatchRow[];
  const hasBackendMatches = backendMatches.length > 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Swords className="size-5 text-primary" /> Event Matches
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Review court schedules, active matches, and historical tournament
          results.
        </p>
      </div>

      <div className="space-y-4">
        {hasBackendMatches
          ? backendMatches.map((row) => (
              <Card
                key={row.match.id}
                className="border border-border/50 bg-card rounded-xl overflow-hidden shadow-sm"
              >
                <CardContent className="p-4 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full capitalize">
                          Round {row.match.round}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${getMatchStatusClass(
                            getDisplayStatus(row.match.status)
                          )}`}
                        >
                          {row.match.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 font-semibold text-sm">
                        <span>{row.playerOne?.name ?? "TBD"}</span>
                        <span className="text-xs text-muted-foreground font-normal">
                          vs
                        </span>
                        <span>{row.playerTwo?.name ?? "Bye"}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3.5" />{" "}
                        {row.match.courtLabel ?? "Court TBD"}
                      </span>
                      {row.match.playerOneScore !== null &&
                        row.match.playerTwoScore !== null && (
                          <span className="inline-flex items-center gap-1 font-bold text-foreground">
                            <Trophy className="size-3.5 text-brand-yellow" />{" "}
                            {row.match.playerOneScore}-
                            {row.match.playerTwoScore}
                          </span>
                        )}
                    </div>
                  </div>

                  {session?.user &&
                    row.match.playerOneUserId &&
                    row.match.playerTwoUserId && (
                      <ScoreSubmitForm eventId={id} row={row} />
                    )}
                </CardContent>
              </Card>
            ))
          : mockMatches.map((match) => (
              <Card
                key={match.id}
                className="border border-border/50 bg-card rounded-xl overflow-hidden shadow-sm"
              >
                <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full capitalize">
                        {match.round}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${getMatchStatusClass(
                          match.status
                        )}`}
                      >
                        {match.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 font-semibold text-sm">
                      <span
                        className={
                          match.status === "completed" &&
                          match.score?.startsWith("11")
                            ? "text-primary"
                            : ""
                        }
                      >
                        {match.t1}
                      </span>
                      <span className="text-xs text-muted-foreground font-normal">
                        vs
                      </span>
                      <span>{match.t2}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3.5" /> {match.time}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3.5" /> {match.court}
                    </span>
                    {match.score && (
                      <span className="inline-flex items-center gap-1 font-bold text-foreground">
                        <Trophy className="size-3.5 text-brand-yellow" />{" "}
                        {match.score}
                      </span>
                    )}
                    {match.caster && (
                      <span className="inline-flex items-center gap-1 text-red-400 font-medium">
                        <Video className="size-3.5" /> Casted: {match.caster}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>
    </div>
  );
}
