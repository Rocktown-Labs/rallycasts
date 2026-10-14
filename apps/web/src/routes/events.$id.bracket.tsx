import { Button } from "@rallycaststv/ui/components/button";
import { cn } from "@rallycaststv/ui/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useParams } from "@tanstack/react-router";
import {
  Award,
  Bell,
  SlidersHorizontal,
  Sparkles,
  Swords,
  Trophy,
  Video,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { demoEnabled } from "@/lib/demo-data";
import {
  useAdvanceDemoRound,
  useCreateCastingJob,
  useEventBracket,
  useGenerateEventBracket,
  useSeedDemoEvent,
  useTestNotification,
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

const getRoundLabel = (
  round: number,
  totalRoundsOrIsLive: number | boolean = 3
): string => {
  if (typeof totalRoundsOrIsLive === "boolean") {
    if (totalRoundsOrIsLive) {
      return `Round ${round}`;
    }
    if (round === 3) {
      return "Final";
    }
    return round === 2 ? "Semifinals" : "Quarterfinals";
  }
  const roundsFromFinal = totalRoundsOrIsLive - round;
  if (roundsFromFinal === 0) {
    return "Championship";
  }
  if (roundsFromFinal === 1) {
    return "Semifinals";
  }
  if (roundsFromFinal === 2) {
    return "Quarterfinals";
  }
  if (roundsFromFinal === 3) {
    return "Round of 16";
  }
  return `Round ${round}`;
};

const getAdvanceButtonLabel = (round: number): string => {
  if (round === 1) {
    return "Advance to Semifinals";
  }
  if (round === 2) {
    return "Advance to Championship";
  }
  return "Win Championship!";
};

const getStatusBadgeClassName = (status: string): string => {
  if (status === "completed") {
    return "bg-muted text-muted-foreground";
  }
  if (status === "in_progress") {
    return "bg-red-500/20 text-red-500";
  }
  return "bg-primary/10 text-primary";
};

function CompletedTournamentBanner({
  isPending,
  onReseed,
}: {
  isPending: boolean;
  onReseed: () => void;
}) {
  return (
    <div className="bg-brand-yellow/10 border-brand-yellow/30 flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4">
      <div className="flex items-center gap-3">
        <Trophy className="text-brand-yellow size-7" />
        <div>
          <h3 className="text-foreground text-sm font-bold">
            Tournament Completed!
          </h3>
          <p className="text-muted-foreground text-xs">
            All matches have concluded and final standings have been recorded.
          </p>
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={onReseed}
        disabled={isPending}
        className="gap-1.5 rounded-lg"
      >
        <Sparkles className="text-primary size-3.5" /> Re-Seed Tournament
      </Button>
    </div>
  );
}

function ActiveUserMatchBanner({
  advancementMode,
  courtLabel,
  isAdvancing,
  isTesting,
  onAdvance,
  onTestNotification,
  opponentName,
  round,
  userName,
}: {
  advancementMode: "intelligent" | "manual";
  courtLabel?: string | null;
  isAdvancing: boolean;
  isTesting: boolean;
  onAdvance: () => void;
  onTestNotification: () => void;
  opponentName: string;
  round: number;
  userName: string;
}) {
  return (
    <div className="bg-card border-primary/20 flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4 shadow-sm">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-black uppercase">
            Your Active Match
          </span>
          <span className="text-muted-foreground text-xs font-medium">
            {getRoundLabel(round, false)} · {courtLabel ?? "Court 1"}
          </span>
        </div>
        <p className="flex items-center gap-2 text-base font-bold">
          <span>
            {userName}{" "}
            <span className="text-muted-foreground text-xs font-normal">
              (Seed 1)
            </span>
          </span>
          <span className="text-muted-foreground text-xs font-normal">vs</span>
          <span>{opponentName}</span>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onTestNotification}
          disabled={isTesting}
          className="gap-1.5 rounded-lg"
        >
          <Bell className="text-primary size-3.5" />
          Send Match Call (In-App & Email)
        </Button>

        {advancementMode === "intelligent" ? (
          <Button
            size="sm"
            onClick={onAdvance}
            disabled={isAdvancing}
            className="gap-1.5 rounded-lg font-bold"
          >
            <Zap className="size-3.5" />
            {getAdvanceButtonLabel(round)}
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={onAdvance}
            disabled={isAdvancing}
            className="gap-1.5 rounded-lg font-semibold"
            variant="secondary"
          >
            <Swords className="size-3.5" />
            Confirm Score & Advance (11-7)
          </Button>
        )}
      </div>
    </div>
  );
}

function MatchParticipantRow({
  isWinner,
  name,
  score,
}: {
  isWinner: boolean;
  name: string;
  score: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between transition-colors",
        isWinner ? "text-primary font-black" : "text-foreground font-semibold"
      )}
    >
      <span className="truncate pr-2">{name}</span>
      <span
        className={cn(
          "shrink-0 font-mono text-xs",
          isWinner ? "text-primary font-bold" : "text-muted-foreground"
        )}
      >
        {score}
      </span>
    </div>
  );
}

interface BracketMatchCardProps {
  currentUserId?: string;
  match: {
    court?: string;
    courtLabel?: string | null;
    id: string;
    one?: string;
    playerOneScore?: number | null;
    playerOneUserId?: string | null;
    playerTwoScore?: number | null;
    playerTwoUserId?: string | null;
    score?: string;
    status: string;
    two?: string;
  };
  onCasterRequest?: (matchId: string) => void;
  onTestNotification?: () => void;
  playerOne?: { id: string; name?: string | null } | null;
  playerTwo?: { id: string; name?: string | null } | null;
  winner?: { id: string; name?: string | null } | null;
}

function parseScores(match: BracketMatchCardProps["match"]): {
  p1Score: string;
  p2Score: string;
} {
  let p1 = "—";
  let p2 = "—";
  if (match.playerOneScore !== null && match.playerOneScore !== undefined) {
    p1 = String(match.playerOneScore);
  } else if (match.score?.includes("–")) {
    p1 = match.score.split("–")[0] ?? "—";
  } else if (match.score) {
    p1 = match.score;
  }

  if (match.playerTwoScore !== null && match.playerTwoScore !== undefined) {
    p2 = String(match.playerTwoScore);
  } else if (match.score?.includes("–")) {
    p2 = match.score.split("–")[1] ?? "—";
  }
  return { p1Score: p1, p2Score: p2 };
}

function parseWinnerStatus(
  match: BracketMatchCardProps["match"],
  playerOne?: { id: string; name?: string | null } | null,
  playerTwo?: { id: string; name?: string | null } | null,
  winner?: { id: string; name?: string | null } | null
): { isP1Winner: boolean; isP2Winner: boolean } {
  if (winner?.id) {
    return {
      isP1Winner: winner.id === playerOne?.id,
      isP2Winner: winner.id === playerTwo?.id,
    };
  }
  if (match.status === "completed" && match.score?.includes("–")) {
    const parts = match.score.split("–");
    const s1 = Math.trunc(Number(parts[0] ?? "0"));
    const s2 = Math.trunc(Number(parts[1] ?? "0"));
    return {
      isP1Winner: s1 > s2,
      isP2Winner: s2 > s1,
    };
  }
  return { isP1Winner: false, isP2Winner: false };
}

function BracketMatchCard({
  currentUserId,
  match,
  onCasterRequest,
  onTestNotification,
  playerOne,
  playerTwo,
  winner,
}: BracketMatchCardProps) {
  const p1Name = playerOne?.name || match.one || "TBD";
  const p2Name =
    playerTwo?.name ||
    match.two ||
    (match.status === "completed" && !match.playerTwoUserId ? "BYE" : "TBD");

  const isUserMatch =
    match.playerOneUserId === currentUserId ||
    match.playerTwoUserId === currentUserId;

  const { isP1Winner, isP2Winner } = parseWinnerStatus(
    match,
    playerOne,
    playerTwo,
    winner
  );
  const { p1Score, p2Score } = parseScores(match);
  const courtText = match.courtLabel || match.court || "Court TBD";

  return (
    <article
      className={cn(
        "w-full rounded-xl border p-4 shadow-xs transition-all duration-150",
        isUserMatch
          ? "border-primary/60 bg-primary/[0.04] ring-primary/25 shadow-sm ring-1"
          : "border-border/80 bg-card hover:border-border"
      )}
      key={match.id}
    >
      <div className="text-muted-foreground mb-3 flex items-center justify-between text-[10px]">
        <span className="text-foreground flex items-center gap-1 font-semibold">
          📍 {courtText}
        </span>
        <div className="flex items-center gap-1.5">
          {isUserMatch && (
            <span className="bg-primary/15 text-primary rounded px-1.5 py-0.5 text-[9px] font-black tracking-wide">
              YOU
            </span>
          )}
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[9px] font-bold capitalize",
              getStatusBadgeClassName(match.status)
            )}
          >
            {match.status}
          </span>
        </div>
      </div>
      <div className="space-y-2 text-sm">
        <MatchParticipantRow
          isWinner={isP1Winner}
          name={p1Name}
          score={p1Score}
        />
        <MatchParticipantRow
          isWinner={isP2Winner}
          name={p2Name}
          score={p2Score}
        />
      </div>

      <div className="mt-4 flex gap-2">
        <Button
          className="flex-1 cursor-pointer"
          onClick={() => onCasterRequest?.(match.id)}
          size="sm"
          variant="outline"
        >
          <Video className="size-3.5" /> Caster
        </Button>

        {match.status !== "completed" && (
          <Button
            className="size-8 cursor-pointer p-0"
            onClick={onTestNotification}
            size="sm"
            title="Send match court call notification"
            variant="outline"
          >
            <Bell className="text-primary size-3.5" />
          </Button>
        )}
      </div>
    </article>
  );
}

function DirectorModeBar({
  advancementMode,
  onModeChange,
}: {
  advancementMode: "intelligent" | "manual";
  onModeChange: (mode: "intelligent" | "manual") => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
          Director Mode:
        </span>
        <div className="bg-muted/40 inline-flex rounded-lg border p-0.5 text-xs font-medium">
          <button
            type="button"
            onClick={() => onModeChange("intelligent")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 transition-all ${
              advancementMode === "intelligent"
                ? "bg-primary text-primary-foreground font-bold shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Zap className="size-3.5" /> Intelligent Auto-Advance
          </button>
          <button
            type="button"
            onClick={() => onModeChange("manual")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 transition-all ${
              advancementMode === "manual"
                ? "bg-primary text-primary-foreground font-bold shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <SlidersHorizontal className="size-3.5" /> Manual Control
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <span className="inline-block size-2 animate-pulse rounded-full bg-emerald-500" />
        <span className="text-muted-foreground font-medium">
          {advancementMode === "intelligent"
            ? "Automatic court queuing & notifications enabled"
            : "Host override & manual court calls active"}
        </span>
      </div>
    </div>
  );
}

function BracketConnector({
  highlightBottom = false,
  highlightTop = false,
}: {
  highlightBottom?: boolean;
  highlightTop?: boolean;
}) {
  return (
    <div className="relative h-full w-full">
      <svg
        className="h-full w-full overflow-visible"
        viewBox="0 0 48 100"
        preserveAspectRatio="none"
      >
        {/* Top feeder path: from left center (y=25) into middle elbow (x=24, y=50) */}
        <path
          d="M 0 25 H 24 V 50"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          className={cn(
            "transition-colors duration-200",
            highlightTop ? "text-primary" : "text-border/80"
          )}
        />
        {/* Bottom feeder path: from left center (y=75) into middle elbow (x=24, y=50) */}
        <path
          d="M 0 75 H 24 V 50"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          className={cn(
            "transition-colors duration-200",
            highlightBottom ? "text-primary" : "text-border/80"
          )}
        />
        {/* Output path: from middle elbow (x=24, y=50) to right center into next round match */}
        <path
          d="M 24 50 H 48"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          className={cn(
            "transition-colors duration-200",
            highlightTop || highlightBottom ? "text-primary" : "text-border/80"
          )}
        />
      </svg>
    </div>
  );
}

interface BracketMatchItem {
  match: {
    court?: string;
    courtLabel?: string | null;
    id: string;
    one?: string;
    playerOneScore?: number | null;
    playerOneUserId?: string | null;
    playerTwoScore?: number | null;
    playerTwoUserId?: string | null;
    round: number;
    score?: string;
    status: string;
    two?: string;
    winnerUserId?: string | null;
  };
  playerOne?: { id: string; name?: string | null } | null;
  playerTwo?: { id: string; name?: string | null } | null;
  winner?: { id: string; name?: string | null } | null;
}

function getParticipantIdentifier(
  participant?: { id: string; name?: string | null } | null,
  fallbackUserId?: string | null
): string | undefined {
  return participant?.id ?? participant?.name ?? fallbackUserId ?? undefined;
}

function getWinnerIdentifier(item?: BracketMatchItem): string | undefined {
  if (!item) {
    return undefined;
  }
  return getParticipantIdentifier(
    item.winner,
    (item.match as { winnerUserId?: string })?.winnerUserId
  );
}

function PairConnector({
  bottomItem,
  nextItem,
  topItem,
}: {
  bottomItem?: BracketMatchItem;
  nextItem?: BracketMatchItem;
  topItem?: BracketMatchItem;
}) {
  const topWinner = getWinnerIdentifier(topItem);
  const bottomWinner = getWinnerIdentifier(bottomItem);

  const nextP1 = getParticipantIdentifier(
    nextItem?.playerOne,
    nextItem?.match.playerOneUserId
  );
  const nextP2 = getParticipantIdentifier(
    nextItem?.playerTwo,
    nextItem?.match.playerTwoUserId
  );

  const topAdvanced = Boolean(
    topWinner && (topWinner === nextP1 || topWinner === nextP2)
  );
  const bottomAdvanced = Boolean(
    bottomWinner && (bottomWinner === nextP1 || bottomWinner === nextP2)
  );

  return (
    <div className="h-full w-full flex-1 py-2">
      <BracketConnector
        highlightBottom={bottomAdvanced}
        highlightTop={topAdvanced}
      />
    </div>
  );
}

function RoundConnectorsColumn({
  nextMatchCount,
  nextMatches,
  roundMatches,
  roundNumber,
}: {
  nextMatchCount: number;
  nextMatches?: BracketMatchItem[];
  roundMatches: BracketMatchItem[];
  roundNumber: number;
}) {
  return (
    <div aria-hidden="true" className="flex w-10 shrink-0 flex-col sm:w-14">
      <div className="mb-4 h-8" />
      <div className="flex flex-1 flex-col justify-around py-1">
        {Array.from({ length: nextMatchCount }).map((_, pairIndex) => (
          <PairConnector
            key={`connector-${roundNumber}-${pairIndex}`}
            bottomItem={roundMatches[pairIndex * 2 + 1]}
            nextItem={nextMatches?.[pairIndex]}
            topItem={roundMatches[pairIndex * 2]}
          />
        ))}
      </div>
    </div>
  );
}

function ChampionPodium({ championName }: { championName: string }) {
  return (
    <div className="flex items-stretch">
      <div className="flex w-10 shrink-0 flex-col sm:w-12" aria-hidden="true">
        <div className="mb-4 h-8" />
        <div className="flex flex-1 flex-col justify-center py-2">
          <svg
            className="h-full w-full overflow-visible"
            viewBox="0 0 40 100"
            preserveAspectRatio="none"
          >
            <line
              x1="0"
              y1="50"
              x2="40"
              y2="50"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              className="text-primary"
            />
          </svg>
        </div>
      </div>

      <section className="flex w-60 shrink-0 flex-col sm:w-68">
        <div className="mb-4 flex h-8 items-center justify-center">
          <h3 className="text-primary flex items-center gap-1.5 text-center text-xs font-black tracking-[0.18em] uppercase">
            <Trophy className="size-3.5" /> Champion
          </h3>
        </div>
        <div className="flex flex-1 flex-col justify-center py-2">
          <div className="bg-primary/10 border-primary/40 ring-primary/20 flex w-full flex-col items-center justify-center gap-3 rounded-2xl border p-5 text-center shadow-lg ring-1">
            <div className="bg-primary/20 text-primary ring-primary/10 grid size-12 place-items-center rounded-full ring-4">
              <Trophy className="text-primary size-6 animate-pulse" />
            </div>
            <div className="space-y-0.5">
              <span className="text-primary text-[10px] font-black tracking-wider uppercase">
                Tournament Winner
              </span>
              <h4 className="text-foreground text-base font-black tracking-tight">
                {championName}
              </h4>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function BracketColumnsGrid({
  backendMatches,
  bracketType = "single_elimination",
  currentUserId,
  hasRealBracket,
  onCasterRequest,
  onTestNotification,
  previewRounds,
  roundNumbers,
}: {
  backendMatches: BracketMatchItem[];
  bracketType?: string | null;
  currentUserId?: string;
  hasRealBracket: boolean;
  onCasterRequest: (matchId: string) => void;
  onTestNotification: () => void;
  previewRounds: typeof demoRounds;
  roundNumbers: number[];
}) {
  const normalizedRounds: {
    matches: BracketMatchItem[];
    round: number;
  }[] = useMemo(() => {
    if (hasRealBracket) {
      return roundNumbers.map((round) => ({
        matches: backendMatches.filter(({ match }) => match.round === round),
        round,
      }));
    }

    return previewRounds.map((rd) => ({
      matches: rd.matches.map((m) => {
        const isCompleted = m.status === "completed";
        const scores = m.score.includes("–") ? m.score.split("–") : [];
        const s1 = scores[0] ? Math.trunc(Number(scores[0])) : null;
        const s2 = scores[1] ? Math.trunc(Number(scores[1])) : null;
        const p1Winner = isCompleted && s1 !== null && s2 !== null && s1 > s2;
        const p2Winner = isCompleted && s1 !== null && s2 !== null && s2 > s1;

        let winner: { id: string; name: string } | null = null;
        if (p1Winner) {
          winner = { id: m.one, name: m.one };
        } else if (p2Winner) {
          winner = { id: m.two, name: m.two };
        }

        return {
          match: {
            courtLabel: m.court,
            id: m.id,
            playerOneScore: s1,
            playerTwoScore: s2,
            round: rd.round,
            score: m.score,
            status: m.status,
          },
          playerOne: { id: m.one, name: m.one },
          playerTwo: { id: m.two, name: m.two },
          winner,
        };
      }),
      round: rd.round,
    }));
  }, [backendMatches, hasRealBracket, previewRounds, roundNumbers]);

  const totalRounds = normalizedRounds.length;

  const lastRound = normalizedRounds.at(-1);
  const finalMatchItem = lastRound?.matches[0];
  const championName =
    finalMatchItem?.match.status === "completed"
      ? finalMatchItem.winner?.name ||
        (finalMatchItem.match.playerOneScore !== null &&
        finalMatchItem.match.playerTwoScore !== null &&
        (finalMatchItem.match.playerOneScore ?? 0) >
          (finalMatchItem.match.playerTwoScore ?? 0)
          ? finalMatchItem.playerOne?.name
          : finalMatchItem.playerTwo?.name)
      : null;

  if (bracketType === "round_robin") {
    return (
      <div className="space-y-4">
        <div className="bg-primary/10 border-primary/20 text-muted-foreground flex items-center gap-2 rounded-xl border p-3.5 text-xs">
          <Trophy className="text-primary size-4 shrink-0" />
          <span>
            <strong>Round Robin Format:</strong> All players face each other
            across scheduled rounds. Wins and scores determine final standings.
          </span>
        </div>
        <div className="grid min-w-0 gap-5 overflow-x-auto lg:auto-cols-[minmax(18rem,1fr)] lg:grid-flow-col">
          {normalizedRounds.map((roundData) => (
            <section className="min-w-64 space-y-3" key={roundData.round}>
              <h3 className="text-muted-foreground text-center text-xs font-black tracking-[0.18em] uppercase">
                Round {roundData.round}
              </h3>
              {roundData.matches.map(
                ({ match, playerOne, playerTwo, winner }) => (
                  <BracketMatchCard
                    currentUserId={currentUserId}
                    key={match.id}
                    match={match}
                    onCasterRequest={onCasterRequest}
                    onTestNotification={onTestNotification}
                    playerOne={playerOne}
                    playerTwo={playerTwo}
                    winner={winner}
                  />
                )
              )}
            </section>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="scrollbar-thin overflow-x-auto pb-6">
      <div className="flex min-w-max items-stretch py-2">
        {normalizedRounds.map((roundData, roundIndex) => {
          const isLastRound = roundIndex === normalizedRounds.length - 1;
          const nextRound = normalizedRounds[roundIndex + 1];
          const matchCount = roundData.matches.length;
          const nextMatchCount = nextRound?.matches.length ?? 0;
          const hasConnectors =
            !isLastRound &&
            nextMatchCount > 0 &&
            matchCount === nextMatchCount * 2;

          return (
            <div key={roundData.round} className="flex items-stretch">
              {/* Round Column */}
              <section className="flex w-72 shrink-0 flex-col sm:w-80">
                {/* Round Header */}
                <div className="mb-4 flex h-8 items-center justify-center">
                  <h3 className="text-muted-foreground text-center text-xs font-black tracking-[0.18em] uppercase">
                    {getRoundLabel(roundData.round, totalRounds)}
                  </h3>
                </div>

                {/* Matches Container: evenly distributes matches across the bracket height */}
                <div className="flex flex-1 flex-col justify-around gap-4 py-1">
                  {roundData.matches.map((item) => (
                    <div
                      key={item.match.id}
                      className="flex w-full items-center justify-center py-2"
                    >
                      <div className="w-full">
                        <BracketMatchCard
                          currentUserId={currentUserId}
                          match={item.match}
                          onCasterRequest={onCasterRequest}
                          onTestNotification={onTestNotification}
                          playerOne={item.playerOne}
                          playerTwo={item.playerTwo}
                          winner={item.winner}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Connector Column */}
              {hasConnectors && (
                <RoundConnectorsColumn
                  nextMatchCount={nextMatchCount}
                  nextMatches={nextRound?.matches}
                  roundMatches={roundData.matches}
                  roundNumber={roundData.round}
                />
              )}
            </div>
          );
        })}

        {/* Champion Trophy Column */}
        {championName && <ChampionPodium championName={championName} />}
      </div>
    </div>
  );
}

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

function BracketHeader({
  hasRealBracket,
  isGenerating,
  isSeeding,
  onGenerate,
  onSeedDemo,
}: {
  hasRealBracket: boolean;
  isGenerating: boolean;
  isSeeding: boolean;
  onGenerate: () => void;
  onSeedDemo: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Award className="text-primary size-5" /> Tournament bracket
        </h2>
        <p className="text-muted-foreground mt-1 text-xs">
          Seeds create round one. Confirmed winners automatically advance and
          receive their next court assignment.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          className="cursor-pointer gap-1.5 rounded-lg font-bold"
          disabled={isSeeding}
          onClick={onSeedDemo}
          variant="outline"
        >
          <Sparkles className="text-primary size-4" />
          Seed 8 Demo Players & Live Bracket
        </Button>
        <Button
          className="cursor-pointer rounded-lg"
          disabled={isGenerating}
          onClick={onGenerate}
        >
          {hasRealBracket ? "Regenerate from seeds" : "Generate live bracket"}
        </Button>
      </div>
    </div>
  );
}

function useBracketUserState({
  backendMatches,
  currentUserId,
  eventStatus,
}: {
  backendMatches: {
    match: {
      courtLabel?: string | null;
      id: string;
      playerOneScore?: number | null;
      playerOneUserId?: string | null;
      playerTwoScore?: number | null;
      playerTwoUserId?: string | null;
      round: number;
      status: string;
    };
    playerOne?: { id: string; name?: string | null } | null;
    playerTwo?: { id: string; name?: string | null } | null;
    winner?: { id: string; name?: string | null } | null;
  }[];
  currentUserId?: string;
  eventStatus: string;
}) {
  const userMatches = backendMatches.filter(
    (row) =>
      row.match.playerOneUserId === currentUserId ||
      row.match.playerTwoUserId === currentUserId
  );
  const userActiveMatch =
    userMatches.find(
      (row) =>
        row.match.status === "scheduled" || row.match.status === "in_progress"
    ) ?? userMatches.at(-1);

  const isTournamentCompleted =
    eventStatus === "completed" ||
    (backendMatches.length > 0 &&
      backendMatches.every((row) => row.match.status === "completed"));

  const userOpponent =
    userActiveMatch?.match.playerOneUserId === currentUserId
      ? userActiveMatch?.playerTwo
      : userActiveMatch?.playerOne;

  return { isTournamentCompleted, userActiveMatch, userOpponent };
}

function DirectorSection({
  advancementMode,
  courtLabel,
  hasActiveMatch,
  isAdvancing,
  isPending,
  isTesting,
  isTournamentCompleted,
  onAdvance,
  onModeChange,
  onReseed,
  onTestNotification,
  opponentName,
  round,
  userName,
}: {
  advancementMode: "intelligent" | "manual";
  courtLabel?: string | null;
  hasActiveMatch: boolean;
  isAdvancing: boolean;
  isPending: boolean;
  isTesting: boolean;
  isTournamentCompleted: boolean;
  onAdvance: () => void;
  onModeChange: (mode: "intelligent" | "manual") => void;
  onReseed: () => void;
  onTestNotification: () => void;
  opponentName: string;
  round: number;
  userName: string;
}) {
  return (
    <section className="from-card to-muted/20 space-y-4 rounded-2xl border bg-gradient-to-br p-5 shadow-sm">
      <DirectorModeBar
        advancementMode={advancementMode}
        onModeChange={onModeChange}
      />

      {isTournamentCompleted && (
        <CompletedTournamentBanner isPending={isPending} onReseed={onReseed} />
      )}

      {!isTournamentCompleted && hasActiveMatch && (
        <ActiveUserMatchBanner
          advancementMode={advancementMode}
          courtLabel={courtLabel}
          isAdvancing={isAdvancing}
          isTesting={isTesting}
          onAdvance={onAdvance}
          onTestNotification={onTestNotification}
          opponentName={opponentName}
          round={round}
          userName={userName}
        />
      )}
    </section>
  );
}

function EventBracketTab() {
  const { id } = useParams({ from: "/events/$id/bracket" });
  const { event } = useEventContext();
  const { data: session } = authClient.useSession();
  const queryClient = useQueryClient();
  const { data } = useEventBracket(id);
  const generateBracket = useGenerateEventBracket(id);
  const seedDemo = useSeedDemoEvent(id);
  const testNotification = useTestNotification(id);
  const advanceDemoRound = useAdvanceDemoRound(id);
  const createCastingJob = useCreateCastingJob();
  const [advancementMode, setAdvancementMode] = useState<
    "intelligent" | "manual"
  >("intelligent");

  const backendMatches = data?.matches ?? [];
  const roundNumbers = [
    ...new Set(backendMatches.map(({ match }) => match.round)),
  ].toSorted((left, right) => left - right);
  const hasRealBracket = backendMatches.length > 0;
  const previewRounds = demoEnabled ? demoRounds : [];

  const currentUserId = session?.user?.id;
  const { isTournamentCompleted, userActiveMatch, userOpponent } =
    useBracketUserState({
      backendMatches,
      currentUserId,
      eventStatus: event.status,
    });

  const generate = async () => {
    try {
      await generateBracket.mutateAsync({});
      await queryClient.invalidateQueries({
        queryKey: ["events", id, "bracket"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["events", id, "matches"],
      });
      toast.success("Bracket regenerated from checked-in seeds.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to generate bracket"));
    }
  };

  const handleTestNotification = async () => {
    try {
      const result = await testNotification.mutateAsync();
      toast.success(result.message);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to send match notification"));
    }
  };

  const handleAdvanceRound = async () => {
    try {
      const result = await advanceDemoRound.mutateAsync();
      toast.success(result.message);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to advance round"));
    }
  };

  const handleSeedDemo = () => {
    seedDemo.mutate(undefined, {
      onError: (err) =>
        toast.error(getErrorMessage(err, "Failed to seed demo tournament")),
      onSuccess: () =>
        toast.success(
          "Tournament seeded with 8 competitors including you as Seed #1!"
        ),
    });
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
      <BracketHeader
        hasRealBracket={hasRealBracket}
        isGenerating={generateBracket.isPending}
        isSeeding={seedDemo.isPending}
        onGenerate={generate}
        onSeedDemo={handleSeedDemo}
      />

      {hasRealBracket && (
        <DirectorSection
          advancementMode={advancementMode}
          courtLabel={userActiveMatch?.match.courtLabel}
          hasActiveMatch={Boolean(userActiveMatch)}
          isAdvancing={advanceDemoRound.isPending}
          isPending={seedDemo.isPending}
          isTesting={testNotification.isPending}
          isTournamentCompleted={isTournamentCompleted}
          onAdvance={handleAdvanceRound}
          onModeChange={setAdvancementMode}
          onReseed={() => seedDemo.mutate()}
          onTestNotification={handleTestNotification}
          opponentName={userOpponent?.name ?? "TBD"}
          round={userActiveMatch?.match.round ?? 1}
          userName={
            session?.user?.name || session?.user?.username || "CG Stewart"
          }
        />
      )}

      {showPreviewNotice ? (
        <div className="bg-muted/20 text-muted-foreground rounded-xl border border-dashed p-4 text-xs">
          Preview mode: this sample shows how a seeded eight-player bracket
          progresses. Click &quot;Seed 8 Demo Players & Live Bracket&quot; to
          launch the tournament director.
        </div>
      ) : null}

      <BracketColumnsGrid
        backendMatches={backendMatches}
        bracketType={event.bracketType}
        currentUserId={currentUserId}
        hasRealBracket={hasRealBracket}
        onCasterRequest={requestCaster}
        onTestNotification={handleTestNotification}
        previewRounds={previewRounds}
        roundNumbers={roundNumbers}
      />
    </div>
  );
}
