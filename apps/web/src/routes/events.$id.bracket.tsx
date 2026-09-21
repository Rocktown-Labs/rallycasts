import { Button } from "@rallycaststv/ui/components/button";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useParams } from "@tanstack/react-router";
import {
  Award,
  Bell,
  CheckCircle2,
  Radio,
  SlidersHorizontal,
  Sparkles,
  Swords,
  Trophy,
  Video,
  Zap,
} from "lucide-react";
import { useState } from "react";
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

const getRoundLabel = (round: number, isLive: boolean) => {
  if (isLive) {
    return `Round ${round}`;
  }
  if (round === 3) {
    return "Final";
  }
  return round === 2 ? "Semifinals" : "Quarterfinals";
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
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-brand-yellow/10 border border-brand-yellow/30 p-4">
      <div className="flex items-center gap-3">
        <Trophy className="size-7 text-brand-yellow" />
        <div>
          <h3 className="font-bold text-sm text-foreground">
            Tournament Completed!
          </h3>
          <p className="text-xs text-muted-foreground">
            All matches have concluded and final standings have been recorded.
          </p>
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={onReseed}
        disabled={isPending}
        className="gap-1.5"
      >
        <Sparkles className="size-3.5 text-primary" /> Re-Seed Tournament
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
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-card border border-primary/20 p-4 shadow-sm">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-black uppercase">
            Your Active Match
          </span>
          <span className="text-xs text-muted-foreground font-medium">
            {getRoundLabel(round, false)} · {courtLabel ?? "Court 1"}
          </span>
        </div>
        <p className="text-base font-bold flex items-center gap-2">
          <span>
            {userName}{" "}
            <span className="text-xs text-muted-foreground font-normal">
              (Seed 1)
            </span>
          </span>
          <span className="text-xs font-normal text-muted-foreground">vs</span>
          <span>{opponentName}</span>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onTestNotification}
          disabled={isTesting}
          className="gap-1.5"
        >
          <Bell className="size-3.5 text-primary" />
          Send Match Call (In-App & Email)
        </Button>

        {advancementMode === "intelligent" ? (
          <Button
            size="sm"
            onClick={onAdvance}
            disabled={isAdvancing}
            className="gap-1.5 font-bold"
          >
            <Zap className="size-3.5" />
            {getAdvanceButtonLabel(round)}
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={onAdvance}
            disabled={isAdvancing}
            className="gap-1.5 font-semibold"
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
      className={`flex items-center justify-between ${
        isWinner ? "font-black text-primary" : "font-semibold"
      }`}
    >
      <span className="truncate">{name}</span>
      <span className="font-mono text-xs">{score}</span>
    </div>
  );
}

interface BracketMatchCardProps {
  currentUserId?: string;
  match: {
    courtLabel?: string | null;
    id: string;
    playerOneScore?: number | null;
    playerOneUserId?: string | null;
    playerTwoScore?: number | null;
    playerTwoUserId?: string | null;
    status: string;
  };
  onCasterRequest: (matchId: string) => void;
  onTestNotification: () => void;
  playerOne?: { id: string; name?: string | null } | null;
  playerTwo?: { id: string; name?: string | null } | null;
  winner?: { id: string; name?: string | null } | null;
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
  const isUserMatch =
    match.playerOneUserId === currentUserId ||
    match.playerTwoUserId === currentUserId;

  const isP1Winner = Boolean(winner?.id && winner.id === playerOne?.id);
  const isP2Winner = Boolean(winner?.id && winner.id === playerTwo?.id);
  const courtText = match.courtLabel || "Court TBD";
  const p1Name = playerOne?.name || "TBD";
  const p2Name = playerTwo?.name || "TBD";
  const p1Score =
    match.playerOneScore !== null && match.playerOneScore !== undefined
      ? String(match.playerOneScore)
      : "—";
  const p2Score =
    match.playerTwoScore !== null && match.playerTwoScore !== undefined
      ? String(match.playerTwoScore)
      : "—";

  return (
    <article
      className={`rounded-xl border p-4 transition-all ${
        isUserMatch
          ? "border-primary/60 bg-primary/[0.03] ring-1 ring-primary/20 shadow-sm"
          : "border-border bg-card"
      }`}
      key={match.id}
    >
      <div className="mb-3 flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="font-semibold text-foreground flex items-center gap-1">
          📍 {courtText}
        </span>
        <div className="flex items-center gap-1.5">
          {isUserMatch && (
            <span className="rounded bg-primary/10 px-1 py-0.5 font-black text-[9px] text-primary">
              YOU
            </span>
          )}
          <span
            className={`capitalize font-bold px-1.5 py-0.5 rounded text-[9px] ${getStatusBadgeClassName(
              match.status
            )}`}
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
          className="flex-1"
          onClick={() => onCasterRequest(match.id)}
          size="sm"
          variant="outline"
        >
          <Video className="size-3.5" /> Caster
        </Button>

        {match.status !== "completed" && (
          <Button
            className="size-8 p-0"
            onClick={onTestNotification}
            size="sm"
            title="Send match court call notification"
            variant="outline"
          >
            <Bell className="size-3.5 text-primary" />
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
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Director Mode:
        </span>
        <div className="inline-flex rounded-lg border bg-muted/40 p-0.5 text-xs font-medium">
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
        <span className="inline-block size-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-muted-foreground font-medium">
          {advancementMode === "intelligent"
            ? "Automatic court queuing & notifications enabled"
            : "Host override & manual court calls active"}
        </span>
      </div>
    </div>
  );
}

function BracketColumnsGrid({
  backendMatches,
  currentUserId,
  hasRealBracket,
  onCasterRequest,
  onTestNotification,
  previewRounds,
  roundNumbers,
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
  hasRealBracket: boolean;
  onCasterRequest: (matchId: string) => void;
  onTestNotification: () => void;
  previewRounds: typeof demoRounds;
  roundNumbers: number[];
}) {
  const roundsToRender = hasRealBracket
    ? roundNumbers.map((round) => ({ round }))
    : previewRounds;

  return (
    <div className="grid min-w-0 gap-5 overflow-x-auto lg:grid-flow-col lg:auto-cols-[minmax(18rem,1fr)]">
      {roundsToRender.map((roundData) => {
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
          disabled={isSeeding}
          onClick={onSeedDemo}
          variant="outline"
        >
          <Sparkles className="size-4 text-primary" />
          Seed 8 Demo Players & Live Bracket
        </Button>
        <Button disabled={isGenerating} onClick={onGenerate}>
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
    <section className="rounded-2xl border bg-gradient-to-br from-card to-muted/20 p-5 shadow-sm space-y-4">
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
        <div className="rounded-xl border border-dashed bg-muted/20 p-4 text-xs text-muted-foreground">
          Preview mode: this sample shows how a seeded eight-player bracket
          progresses. Click "Seed 8 Demo Players & Live Bracket" to launch the
          tournament director.
        </div>
      ) : null}

      <BracketColumnsGrid
        backendMatches={backendMatches}
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
