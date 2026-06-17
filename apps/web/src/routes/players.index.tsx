import { Button } from "@rallycaststv/ui/components/button";
import { Input } from "@rallycaststv/ui/components/input";
import { cn } from "@rallycaststv/ui/lib/utils";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Flame, Globe, MapPin, Sparkles, Trophy, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/rally/cards";
import { useGeolocation, usePlayers } from "@/lib/hooks";

export const Route = createFileRoute("/players/")({
  component: PlayersPage,
});

type TabType =
  | "near-you"
  | "state-leaderboard"
  | "global-leaderboard"
  | "trending";

interface PlayerWithStreak {
  bio?: string | null;
  displayUsername?: string | null;
  homeCity?: string | null;
  homeState?: string | null;
  id: string;
  image?: string | null;
  name: string | null;
  skillLevel?: string | null;
  username: string | null;
  streak?: number;
  trendingReason?: string;
}

const getRankBadgeClass = (rank: number): string => {
  if (rank === 1) {
    return "bg-amber-500";
  }
  if (rank === 2) {
    return "bg-slate-400";
  }
  if (rank === 3) {
    return "bg-amber-700";
  }
  return "bg-primary";
};

const getPlayerScore = (skill: string | null | undefined): number => {
  if (!skill) {
    return 3;
  }
  const s = skill.toLowerCase();
  if (s.includes("pro") || s.includes("5.0")) {
    return 5;
  }
  if (s.includes("4.5")) {
    return 4.5;
  }
  if (s.includes("4.0")) {
    return 4;
  }
  if (s.includes("3.5")) {
    return 3.5;
  }
  if (s.includes("3.0")) {
    return 3;
  }
  if (s.includes("2.5") || s.includes("beginner")) {
    return 2.5;
  }
  return 3;
};

const getDuprRating = (skill: string | null | undefined): string => {
  const score = getPlayerScore(skill);
  return score.toFixed(1);
};

const handleChallenge = (playerName: string) => {
  toast.success(`Challenge request sent to ${playerName}!`);
};

function PlayersPage() {
  const [query, setQuery] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("near-you");

  const { location } = useGeolocation();
  const userState = selectedState || location?.stateCode || "AR";

  const { data, isLoading } = usePlayers(query);
  const players = data?.players ?? [];

  // Filter players based on search and filters
  const filteredPlayers = players.filter((player) => {
    const matchesState = selectedState
      ? player.homeState?.toLowerCase() === selectedState.toLowerCase()
      : true;
    const matchesSkill = selectedSkill
      ? player.skillLevel?.toLowerCase().includes(selectedSkill.toLowerCase())
      : true;
    return matchesState && matchesSkill;
  });

  // Near You: Players in user's state
  const localPlayers = filteredPlayers.filter(
    (p) => p.homeState?.toUpperCase() === userState.toUpperCase()
  );

  // State Leaderboard: Sorted by score descending
  const stateLeaderboard = [...filteredPlayers]
    .filter((p) => p.homeState?.toUpperCase() === userState.toUpperCase())
    .toSorted(
      (a, b) => getPlayerScore(b.skillLevel) - getPlayerScore(a.skillLevel)
    );

  // Global Leaderboard: All filtered players sorted by score descending
  const globalLeaderboard = [...filteredPlayers].toSorted(
    (a, b) => getPlayerScore(b.skillLevel) - getPlayerScore(a.skillLevel)
  );

  // Trending / Who's Hot: Simulating based on challenges/history
  const trendingPlayers = filteredPlayers
    .map((p, idx) => ({
      ...p,
      streak: idx % 2 === 0 ? 3 + idx : undefined,
      trendingReason: idx % 2 === 0 ? "On a win streak!" : "Highly challenged",
    }))
    .filter((p) => p.streak !== undefined);

  const getActiveList = (): PlayerWithStreak[] => {
    switch (activeTab) {
      case "near-you": {
        return localPlayers;
      }
      case "state-leaderboard": {
        return stateLeaderboard;
      }
      case "global-leaderboard": {
        return globalLeaderboard;
      }
      case "trending": {
        return trendingPlayers;
      }
      default: {
        return filteredPlayers;
      }
    }
  };

  const activeList = getActiveList();

  let content;
  if (isLoading) {
    content = (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="h-48 animate-pulse rounded-2xl bg-muted/40 border border-border/50"
          />
        ))}
      </div>
    );
  } else if (activeList.length > 0) {
    content = (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {activeList.map((player, idx) => {
          const rating = getDuprRating(player.skillLevel);
          const rank = idx + 1;
          const { streak } = player;

          return (
            <div
              key={player.id}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 flex flex-col justify-between"
            >
              {/* Background glow on card hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              <div className="relative z-10 space-y-4">
                {/* Card Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="relative">
                      <div className="size-12 rounded-full overflow-hidden border border-border/80 bg-muted flex items-center justify-center">
                        {player.image ? (
                          <img
                            src={player.image}
                            alt={player.name || "Player avatar"}
                            className="size-full object-cover"
                          />
                        ) : (
                          <Users className="size-5 text-muted-foreground" />
                        )}
                      </div>
                      {/* Tab-specific Rank Badge */}
                      {(activeTab === "state-leaderboard" ||
                        activeTab === "global-leaderboard") && (
                        <div
                          className={cn(
                            "absolute -bottom-1 -right-1 size-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white border border-background shadow-sm",
                            getRankBadgeClass(rank)
                          )}
                        >
                          {rank}
                        </div>
                      )}
                    </div>

                    {/* Name / Handle */}
                    <div>
                      <Link
                        to={`/players/${player.username || player.displayUsername}`}
                        className="font-bold hover:underline text-foreground block text-sm"
                      >
                        {player.name ||
                          `@${player.username || player.displayUsername}`}
                      </Link>
                      {player.name && (
                        <span className="text-xs text-muted-foreground block">
                          @{player.username || player.displayUsername}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* DUPR Rating Badge */}
                  <div className="rounded-lg bg-primary/10 border border-primary/20 px-2 py-1 text-center">
                    <span className="block text-[8px] font-bold uppercase tracking-wider text-primary">
                      DUPR
                    </span>
                    <span className="block text-xs font-black text-primary">
                      {rating}
                    </span>
                  </div>
                </div>

                {/* Bio & Details */}
                <div className="space-y-2 text-xs">
                  <p className="text-muted-foreground line-clamp-2 leading-relaxed">
                    {player.bio || "No bio added yet."}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3 text-primary/70" />
                      {player.homeCity && player.homeState
                        ? `${player.homeCity}, ${player.homeState}`
                        : (player.homeState ?? "Unknown")}
                    </span>
                    <span className="rounded-full bg-muted/80 px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground/90">
                      {player.skillLevel || "Player"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="relative z-10 mt-5 pt-4 border-t border-border/50 flex items-center justify-between gap-2">
                {/* Streak/Badge details if trending */}
                {activeTab === "trending" && streak && (
                  <span className="inline-flex items-center gap-1 rounded bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold text-orange-600">
                    <Flame className="size-3 fill-orange-600" />
                    <span>{streak} Win Streak!</span>
                  </span>
                )}

                <Link
                  to={`/players/${player.username || player.displayUsername}`}
                  className="text-xs text-primary hover:underline font-semibold"
                >
                  View profile
                </Link>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleChallenge(player.name || "Player")}
                  className="h-8 rounded-md text-xs border-primary/20 hover:bg-primary/5 hover:text-primary transition-all duration-200"
                >
                  Challenge
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    );
  } else {
    content = (
      <EmptyState
        message="No players match the chosen state or skill level filter."
        title="No players found"
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-4 animate-in fade-in duration-300">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary/95 to-sidebar p-6 text-white shadow-xl sm:p-8">
        <div className="absolute -right-8 -top-8 size-48 rounded-full bg-secondary/10 blur-2xl" />
        <div className="absolute -bottom-8 -left-8 size-48 rounded-full bg-brand-green/20 blur-2xl" />

        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary/20 px-3 py-1 text-xs font-semibold text-brand-yellow">
            <Sparkles className="size-3" />
            <span>Padel & Pickleball Community</span>
          </div>
          <h1 className="text-3xl font-logo sm:text-4xl tracking-wide lowercase">
            players
          </h1>
          <p className="text-sm text-gray-200 sm:text-base leading-relaxed">
            Connect with local legends, track leaderboards, and challenge
            players around your level.
          </p>
        </div>
      </div>

      {/* Filters & Tabs Wrapper */}
      <div className="space-y-4">
        {/* Search and Dropdowns */}
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-[2fr_1fr_1fr]">
          <Input
            placeholder="Search players by name, handle, or city..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full bg-muted/40 border-border/80 focus:border-primary/50"
          />
          <select
            value={selectedSkill}
            onChange={(e) => setSelectedSkill(e.target.value)}
            className="h-10 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          >
            <option value="">All Skill Levels</option>
            <option value="beginner">Beginner (2.5+)</option>
            <option value="intermediate">Intermediate (3.5+)</option>
            <option value="advanced">Advanced (4.5+)</option>
            <option value="pro">Pro (5.0+)</option>
          </select>
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="h-10 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          >
            <option value="">All States</option>
            <option value="AR">Arkansas</option>
            <option value="CO">Colorado</option>
            <option value="AZ">Arizona</option>
            <option value="TX">Texas</option>
            <option value="FL">Florida</option>
            <option value="CA">California</option>
          </select>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap gap-2 border-b border-border/50 pb-3">
          <Button
            variant={activeTab === "near-you" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("near-you")}
            className="rounded-full gap-1.5 h-9"
          >
            <MapPin className="size-3.5" />
            <span>Near You ({localPlayers.length})</span>
          </Button>
          <Button
            variant={activeTab === "state-leaderboard" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("state-leaderboard")}
            className="rounded-full gap-1.5 h-9"
          >
            <Trophy className="size-3.5" />
            <span>State Leaderboard</span>
          </Button>
          <Button
            variant={activeTab === "global-leaderboard" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("global-leaderboard")}
            className="rounded-full gap-1.5 h-9"
          >
            <Globe className="size-3.5" />
            <span>Global ({globalLeaderboard.length})</span>
          </Button>
          <Button
            variant={activeTab === "trending" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("trending")}
            className="rounded-full gap-1.5 h-9"
          >
            <Flame className="size-3.5" />
            <span>Trending 🔥</span>
          </Button>
        </div>
      </div>

      {/* List / Grid Display */}
      {content}
    </div>
  );
}
