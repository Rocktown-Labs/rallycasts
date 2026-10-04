import { Button } from "@rallycaststv/ui/components/button";
import { Card, CardContent } from "@rallycaststv/ui/components/card";
import { Input } from "@rallycaststv/ui/components/input";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useParams } from "@tanstack/react-router";
import {
  Bell,
  Clock,
  MapPin,
  SlidersHorizontal,
  Swords,
  Trophy,
  Video,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { getEventMatchesCollection, useLiveQuery } from "@/lib/collections";
import type { BackendMatchRow } from "@/lib/collections";
import { demoEnabled } from "@/lib/demo-data";
import { useTestNotification } from "@/lib/hooks";

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

function PresetButtons({
  p1Id,
  p2Id,
  p1Name,
  p2Name,
  onSelect,
}: {
  p1Id?: string | null;
  p2Id?: string | null;
  p1Name: string;
  p2Name: string;
  onSelect: (first: number, second: number, winner: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-muted-foreground mr-1 text-[10px] font-bold uppercase">
        Presets:
      </span>
      {p1Id ? (
        <button
          type="button"
          onClick={() => onSelect(11, 7, p1Id)}
          className="bg-muted/40 text-muted-foreground hover:bg-primary/10 hover:text-primary cursor-pointer rounded border px-2 py-0.5 text-[10px] font-bold transition-all"
        >
          11–7 ({p1Name})
        </button>
      ) : null}
      {p2Id ? (
        <button
          type="button"
          onClick={() => onSelect(7, 11, p2Id)}
          className="bg-muted/40 text-muted-foreground hover:bg-primary/10 hover:text-primary cursor-pointer rounded border px-2 py-0.5 text-[10px] font-bold transition-all"
        >
          11–7 ({p2Name})
        </button>
      ) : null}
      {p1Id ? (
        <button
          type="button"
          onClick={() => onSelect(11, 9, p1Id)}
          className="bg-muted/40 text-muted-foreground hover:bg-primary/10 hover:text-primary cursor-pointer rounded border px-2 py-0.5 text-[10px] font-bold transition-all"
        >
          11–9 ({p1Name})
        </button>
      ) : null}
    </div>
  );
}

const updateMatchScore = (
  matchesCollection: ReturnType<typeof getEventMatchesCollection>,
  matchId: string,
  playerOneScore: number,
  playerTwoScore: number,
  winnerUserId: string,
  successMessage = "Score confirmed and match advanced."
) => {
  try {
    matchesCollection.update(matchId, (draft) => {
      draft.match.playerOneScore = playerOneScore;
      draft.match.playerTwoScore = playerTwoScore;
      draft.match.winnerUserId = winnerUserId;
      draft.match.status = "completed";
    });
    toast.success(successMessage);
  } catch {
    toast.error("Could not submit score.");
  }
};

function ScoreInputs({
  playerOneScore,
  playerTwoScore,
  winnerUserId,
  p1UserId,
  p2UserId,
  p1Name,
  p2Name,
  onP1ScoreChange,
  onP2ScoreChange,
  onWinnerChange,
  onSubmit,
}: {
  playerOneScore: string;
  playerTwoScore: string;
  winnerUserId: string;
  p1UserId: string;
  p2UserId: string;
  p1Name: string;
  p2Name: string;
  onP1ScoreChange: (v: string) => void;
  onP2ScoreChange: (v: string) => void;
  onWinnerChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
      <Input
        aria-label={`${p1Name} score`}
        value={playerOneScore}
        onChange={(event) => onP1ScoreChange(event.target.value)}
        className="h-8 w-16 font-mono text-xs"
        inputMode="numeric"
        placeholder="0"
      />
      <Input
        aria-label={`${p2Name} score`}
        value={playerTwoScore}
        onChange={(event) => onP2ScoreChange(event.target.value)}
        className="h-8 w-16 font-mono text-xs"
        inputMode="numeric"
        placeholder="0"
      />
      <select
        aria-label="Winner"
        value={winnerUserId}
        onChange={(event) => onWinnerChange(event.target.value)}
        className="border-border bg-background h-8 rounded-md border px-2 text-xs font-medium"
      >
        <option value={p1UserId}>Winner: {p1Name}</option>
        <option value={p2UserId}>Winner: {p2Name}</option>
      </select>
      <Button type="submit" className="h-8 rounded-md text-xs font-bold">
        Submit score
      </Button>
    </form>
  );
}

function ScoreSubmitForm({
  matchesCollection,
  row,
}: {
  matchesCollection: ReturnType<typeof getEventMatchesCollection>;
  row: BackendMatchRow;
}) {
  const { match, playerOne, playerTwo } = row;
  const p1Name = playerOne?.name || "Player 1";
  const p2Name = playerTwo?.name || "Player 2";
  const p1UserId = match.playerOneUserId || "";
  const p2UserId = match.playerTwoUserId || "";

  const [playerOneScore, setPlayerOneScore] = useState(
    match.playerOneScore !== null && match.playerOneScore !== undefined
      ? String(match.playerOneScore)
      : ""
  );
  const [playerTwoScore, setPlayerTwoScore] = useState(
    match.playerTwoScore !== null && match.playerTwoScore !== undefined
      ? String(match.playerTwoScore)
      : ""
  );
  const [winnerUserId, setWinnerUserId] = useState(
    match.winnerUserId || p1UserId
  );

  const applyPreset = (first: number, second: number, winner: string) => {
    setPlayerOneScore(String(first));
    setPlayerTwoScore(String(second));
    setWinnerUserId(winner);
    updateMatchScore(
      matchesCollection,
      match.id,
      first,
      second,
      winner,
      `Score ${first}–${second} confirmed and match advanced.`
    );
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const firstScore = Math.trunc(Number(playerOneScore));
    const secondScore = Math.trunc(Number(playerTwoScore));

    if (
      Number.isNaN(firstScore) ||
      Number.isNaN(secondScore) ||
      !winnerUserId
    ) {
      toast.error("Enter both scores and choose a winner.");
      return;
    }

    updateMatchScore(
      matchesCollection,
      match.id,
      firstScore,
      secondScore,
      winnerUserId
    );
  };

  return (
    <div className="border-border/40 space-y-3 border-t pt-2">
      <PresetButtons
        p1Id={match.playerOneUserId}
        p2Id={match.playerTwoUserId}
        p1Name={p1Name.split(" ")[0] || "P1"}
        p2Name={p2Name.split(" ")[0] || "P2"}
        onSelect={applyPreset}
      />

      <ScoreInputs
        playerOneScore={playerOneScore}
        playerTwoScore={playerTwoScore}
        winnerUserId={winnerUserId}
        p1UserId={p1UserId}
        p2UserId={p2UserId}
        p1Name={p1Name}
        p2Name={p2Name}
        onP1ScoreChange={setPlayerOneScore}
        onP2ScoreChange={setPlayerTwoScore}
        onWinnerChange={setWinnerUserId}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

function EventMatchesTab() {
  const { id } = useParams({ from: "/events/$id/matches" });
  const { data: session } = authClient.useSession();
  const queryClient = useQueryClient();
  const testNotification = useTestNotification(id);
  const [advancementMode, setAdvancementMode] = useState<
    "intelligent" | "manual"
  >("intelligent");

  const matchesCollection = useMemo(
    () => getEventMatchesCollection(queryClient, id),
    [queryClient, id]
  );
  const { data: backendMatches = [] } = useLiveQuery(matchesCollection);
  const fallbackMatches = demoEnabled ? mockMatches : [];
  const hasBackendMatches = backendMatches.length > 0;
  const currentUserId = session?.user?.id;

  const handleCallMatch = async () => {
    try {
      const res = await testNotification.mutateAsync();
      toast.success(res.message);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send match call"
      );
    }
  };

  return (
    <div className="animate-in fade-in space-y-6 duration-300">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <Swords className="text-primary size-5" /> Event Matches
          </h2>
          <p className="text-muted-foreground mt-1 text-xs">
            Review court schedules, active matches, and historical tournament
            results.
          </p>
        </div>

        {hasBackendMatches && (
          <div className="flex items-center gap-2">
            <div className="bg-muted/40 inline-flex rounded-lg border p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setAdvancementMode("intelligent")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 transition-all ${
                  advancementMode === "intelligent"
                    ? "bg-primary text-primary-foreground font-bold shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Zap className="size-3.5" /> Intelligent
              </button>
              <button
                type="button"
                onClick={() => setAdvancementMode("manual")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 transition-all ${
                  advancementMode === "manual"
                    ? "bg-primary text-primary-foreground font-bold shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <SlidersHorizontal className="size-3.5" /> Manual
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {hasBackendMatches
          ? backendMatches.map((row) => {
              const isUserMatch =
                row.match.playerOneUserId === currentUserId ||
                row.match.playerTwoUserId === currentUserId;

              return (
                <Card
                  key={row.match.id}
                  className={`overflow-hidden rounded-xl border shadow-sm transition-all ${
                    isUserMatch
                      ? "border-primary/50 bg-primary/[0.02] ring-primary/20 ring-1"
                      : "border-border/50 bg-card"
                  }`}
                >
                  <CardContent className="space-y-4 p-4">
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-bold capitalize">
                            Round {row.match.round}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${getMatchStatusClass(
                              getDisplayStatus(row.match.status)
                            )}`}
                          >
                            {row.match.status}
                          </span>
                          {isUserMatch && (
                            <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-[9px] font-black">
                              YOUR MATCH
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm font-semibold">
                          <span className="text-foreground font-bold">
                            {row.playerOne?.name ?? "TBD"}
                          </span>
                          <span className="text-muted-foreground text-xs font-normal">
                            vs
                          </span>
                          <span className="text-foreground font-bold">
                            {row.playerTwo?.name ?? "Bye"}
                          </span>
                        </div>
                      </div>

                      <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                        <span className="inline-flex items-center gap-1 font-medium">
                          <MapPin className="size-3.5" />{" "}
                          {row.match.courtLabel ?? "Court TBD"}
                        </span>
                        {row.match.playerOneScore !== null &&
                          row.match.playerTwoScore !== null && (
                            <span className="text-foreground inline-flex items-center gap-1 font-bold">
                              <Trophy className="text-brand-yellow size-3.5" />{" "}
                              {row.match.playerOneScore}-
                              {row.match.playerTwoScore}
                            </span>
                          )}

                        {row.match.status !== "completed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCallMatch}
                            className="h-7 gap-1 text-xs"
                            title="Call match to court and notify players"
                          >
                            <Bell className="text-primary size-3" /> Call Court
                          </Button>
                        )}
                      </div>
                    </div>

                    {session?.user &&
                      row.match.playerOneUserId &&
                      row.match.playerTwoUserId && (
                        <ScoreSubmitForm
                          matchesCollection={matchesCollection}
                          row={row}
                        />
                      )}
                  </CardContent>
                </Card>
              );
            })
          : fallbackMatches.map((match) => (
              <Card
                key={match.id}
                className="border-border/50 bg-card overflow-hidden rounded-xl border shadow-sm"
              >
                <CardContent className="flex flex-col justify-between gap-4 p-4 md:flex-row md:items-center">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-bold capitalize">
                        {match.round}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${getMatchStatusClass(
                          match.status
                        )}`}
                      >
                        {match.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm font-semibold">
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
                      <span className="text-muted-foreground text-xs font-normal">
                        vs
                      </span>
                      <span>{match.t2}</span>
                    </div>
                  </div>

                  <div className="text-muted-foreground flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3.5" /> {match.time}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3.5" /> {match.court}
                    </span>
                    {match.score && (
                      <span className="text-foreground inline-flex items-center gap-1 font-bold">
                        <Trophy className="text-brand-yellow size-3.5" />{" "}
                        {match.score}
                      </span>
                    )}
                    {match.caster && (
                      <span className="inline-flex items-center gap-1 font-medium text-red-400">
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
