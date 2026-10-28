import { Button } from "@rallycaststv/ui/components/button";
import { Input } from "@rallycaststv/ui/components/input";
import { cn } from "@rallycaststv/ui/lib/utils";
import { Link, createFileRoute, useSearch } from "@tanstack/react-router";
import { MapPin, Users } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { EmptyState } from "@/components/rally/cards";
import { authClient } from "@/lib/auth-client";
import { useGeolocation, usePlayers } from "@/lib/hooks";

const playersSearchSchema = z.object({
  section: z.string().optional(),
});

export const Route = createFileRoute("/players/")({
  component: PlayersPage,
  validateSearch: playersSearchSchema,
});

interface PlayerWithStreak {
  bio?: string | null;
  displayUsername?: string | null;
  homeCity?: string | null;
  homeState?: string | null;
  id: string;
  image?: string | null;
  name: string;
  skillLevel?: string | null;
  username?: string | null;
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

const getSkillLabel = (skill: string | null | undefined): string =>
  skill ? skill.charAt(0).toUpperCase() + skill.slice(1) : "Open";

const stateNames: Record<string, string> = {
  AR: "Arkansas",
  AZ: "Arizona",
  CA: "California",
  CO: "Colorado",
  FL: "Florida",
  NY: "New York",
  TX: "Texas",
};

const getStateName = (code: string) => stateNames[code.toUpperCase()] || code;

type PlayerSection = "global" | "near-you" | "state";

const playerSections = new Set<PlayerSection>(["global", "near-you", "state"]);

const getInitialPlayersSection = (section: unknown): PlayerSection | null => {
  if (typeof section !== "string") {
    return null;
  }
  if (!playerSections.has(section as PlayerSection)) {
    return null;
  }
  return section as PlayerSection;
};

function PlayerCardChallengeAction({
  isCurrentUser,
  playerUsername,
}: {
  isCurrentUser: boolean;
  playerUsername: string;
}) {
  if (isCurrentUser) {
    return (
      <Button
        className="border-primary/20 h-8 rounded-md text-xs"
        disabled
        size="sm"
        variant="outline"
      >
        You
      </Button>
    );
  }

  return (
    <Link
      className="border-primary/20 hover:bg-primary/5 hover:text-primary inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium transition-all duration-200"
      params={{ username: playerUsername }}
      to="/players/$username"
    >
      Challenge
    </Link>
  );
}

function PlayersPage() {
  const search = useSearch({ strict: false });
  const initialSection = getInitialPlayersSection(search.section);

  const [query, setQuery] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("");
  const [viewAllSection, setViewAllSection] = useState<PlayerSection | null>(
    initialSection
  );

  const { location } = useGeolocation();
  const userState = location?.stateCode || "AR";
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id;

  const { data, isLoading } = usePlayers(query);
  const players = data?.players ?? [];

  // Filter players based on state and skill dropdowns (if active)
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
    // eslint-disable-next-line unicorn/no-array-sort
    .sort(
      (a, b) => getPlayerScore(b.skillLevel) - getPlayerScore(a.skillLevel)
    );

  // Global Leaderboard: All filtered players sorted by score descending
  // eslint-disable-next-line unicorn/no-array-sort
  const globalLeaderboard = [...filteredPlayers].sort(
    (a, b) => getPlayerScore(b.skillLevel) - getPlayerScore(a.skillLevel)
  );

  const isSearching =
    query !== "" || selectedState !== "" || selectedSkill !== "";

  const renderPlayerCard = (player: PlayerWithStreak, rank?: number) => {
    const skillLabel = getSkillLabel(player.skillLevel);
    const isCurrentUser = currentUserId === player.id;
    const playerUsername = player.username || player.displayUsername || "";
    return (
      <div
        key={player.id}
        className="group border-border bg-card hover:border-primary/30 hover:shadow-primary/5 relative flex min-h-[190px] flex-col justify-between overflow-hidden rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
      >
        <div className="from-primary/5 absolute inset-0 bg-gradient-to-br via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="relative z-10 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="border-border/80 bg-muted flex size-12 items-center justify-center overflow-hidden rounded-full border">
                  {player.image ? (
                    <img
                      src={player.image}
                      alt={player.name || "Player avatar"}
                      className="size-full object-cover"
                    />
                  ) : (
                    <Users className="text-muted-foreground size-5" />
                  )}
                </div>
                {rank && (
                  <div
                    className={cn(
                      "border-background absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full border text-[10px] font-bold text-white shadow-sm",
                      getRankBadgeClass(rank)
                    )}
                  >
                    {rank}
                  </div>
                )}
              </div>

              <div>
                <Link
                  to="/players/$username"
                  params={{
                    username: playerUsername,
                  }}
                  className="text-foreground block text-sm font-bold hover:underline"
                >
                  {player.name ||
                    `@${player.username || player.displayUsername}`}
                </Link>
                {player.name && (
                  <span className="text-muted-foreground block text-xs">
                    @{player.username || player.displayUsername}
                  </span>
                )}
              </div>
            </div>

            <div className="bg-primary/10 border-primary/20 rounded-lg border px-2 py-1 text-center">
              <span className="text-primary block text-[8px] font-bold tracking-wider uppercase">
                Level
              </span>
              <span className="text-primary block text-[10px] font-black">
                {skillLabel}
              </span>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <p className="text-muted-foreground line-clamp-2 leading-relaxed">
              {player.bio || "No bio added yet."}
            </p>
            <div className="text-muted-foreground flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1">
                <MapPin className="text-primary/70 size-3" />
                {player.homeCity && player.homeState
                  ? `${player.homeCity}, ${player.homeState}`
                  : (player.homeState ?? "Unknown")}
              </span>
              <span className="bg-muted/80 text-muted-foreground/90 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase">
                {player.skillLevel || "Player"}
              </span>
            </div>
          </div>
        </div>

        <div className="border-border/50 relative z-10 mt-5 flex items-center justify-between gap-2 border-t pt-4">
          <Link
            to="/players/$username"
            params={{
              username: playerUsername,
            }}
            className="text-primary text-xs font-semibold hover:underline"
          >
            View profile
          </Link>

          <PlayerCardChallengeAction
            isCurrentUser={isCurrentUser}
            playerUsername={playerUsername}
          />
        </div>
      </div>
    );
  };

  let mainContent;

  if (isLoading) {
    mainContent = (
      <div className="animate-in fade-in grid grid-cols-2 gap-3 duration-300 sm:gap-6 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="bg-muted/40 border-border/50 h-48 animate-pulse rounded-2xl border"
          />
        ))}
      </div>
    );
  } else if (isSearching) {
    mainContent = (
      <div className="animate-in fade-in space-y-6 duration-300">
        <h2 className="text-foreground text-xl font-bold tracking-tight">
          Search Results ({filteredPlayers.length})
        </h2>
        {filteredPlayers.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
            {filteredPlayers.map((player) => renderPlayerCard(player))}
          </div>
        ) : (
          <EmptyState
            message="No players match the chosen search query or filters."
            title="No search results"
          />
        )}
      </div>
    );
  } else if (viewAllSection) {
    const getSectionDetails = () => {
      switch (viewAllSection) {
        case "near-you": {
          return {
            list: localPlayers,
            title: `Near You in ${getStateName(userState)}`,
          };
        }
        case "state": {
          return {
            list: stateLeaderboard,
            ranked: true,
            title: `${getStateName(userState)} Leaderboard`,
          };
        }
        case "global": {
          return {
            list: globalLeaderboard,
            ranked: true,
            title: "Global Leaderboard",
          };
        }
        default: {
          return { list: [], title: "" };
        }
      }
    };

    const section = getSectionDetails();

    mainContent = (
      <div className="animate-in fade-in space-y-6 duration-300">
        <div className="flex items-center justify-between">
          <h2 className="text-foreground text-xl font-bold tracking-tight">
            {section.title} ({section.list.length})
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewAllSection(null)}
            className="h-8 rounded-md text-xs"
          >
            ← Back to Discover
          </Button>
        </div>
        {section.list.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
            {section.list.map((player, idx) =>
              renderPlayerCard(player, section.ranked ? idx + 1 : undefined)
            )}
          </div>
        ) : (
          <EmptyState
            message="No players currently in this section."
            title="No players found"
          />
        )}
      </div>
    );
  } else {
    // Dashboard sections with horizontal scroll
    mainContent = (
      <div className="animate-in fade-in space-y-10 duration-500">
        {/* Section 1: Near You */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-foreground text-xl font-bold tracking-tight">
              Near You ({getStateName(userState)})
            </h2>
            {localPlayers.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewAllSection("near-you")}
                className="text-primary hover:text-primary/80 rounded-md text-xs font-semibold"
              >
                View All
              </Button>
            )}
          </div>
          {localPlayers.length > 0 ? (
            <div
              className="-mx-4 flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth px-4 pb-4 md:-mx-0 md:px-0"
              style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}
            >
              {localPlayers.map((player) => (
                <div
                  key={player.id}
                  className="w-[300px] shrink-0 snap-start sm:w-[330px]"
                >
                  {renderPlayerCard(player)}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              message="No players registered in your state yet."
              title="No local players"
            />
          )}
        </div>

        {/* Section 2: State Leaderboard */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-foreground text-xl font-bold tracking-tight">
              State Leaderboard ({getStateName(userState)})
            </h2>
            {stateLeaderboard.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewAllSection("state")}
                className="text-primary hover:text-primary/80 rounded-md text-xs font-semibold"
              >
                View All
              </Button>
            )}
          </div>
          {stateLeaderboard.length > 0 ? (
            <div
              className="-mx-4 flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth px-4 pb-4 md:-mx-0 md:px-0"
              style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}
            >
              {stateLeaderboard.map((player, idx) => (
                <div
                  key={player.id}
                  className="w-[300px] shrink-0 snap-start sm:w-[330px]"
                >
                  {renderPlayerCard(player, idx + 1)}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              message="No players registered in your state yet."
              title="No leaderboard entries"
            />
          )}
        </div>

        {/* Section 3: Global Leaderboard */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-foreground text-xl font-bold tracking-tight">
              Global Leaderboard
            </h2>
            {globalLeaderboard.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewAllSection("global")}
                className="text-primary hover:text-primary/80 rounded-md text-xs font-semibold"
              >
                View All
              </Button>
            )}
          </div>
          {globalLeaderboard.length > 0 ? (
            <div
              className="-mx-4 flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth px-4 pb-4 md:-mx-0 md:px-0"
              style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}
            >
              {globalLeaderboard.map((player, idx) => (
                <div
                  key={player.id}
                  className="w-[300px] shrink-0 snap-start sm:w-[330px]"
                >
                  {renderPlayerCard(player, idx + 1)}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              message="No players registered on the platform yet."
              title="No global entries"
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in mx-auto max-w-7xl space-y-8 px-4 py-4 duration-300">
      {/* Hero Section */}
      <div className="bg-primary relative overflow-hidden rounded-2xl p-6 text-white shadow-xl sm:p-8">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="bg-secondary/20 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold text-[#bcdf21]">
            <span>Padel & Pickleball Community</span>
          </div>
          <h1 className="font-logo text-3xl tracking-wide lowercase sm:text-4xl">
            players
          </h1>
          <p className="text-sm leading-relaxed text-gray-200 sm:text-base">
            Connect with local legends, track leaderboards, and challenge
            players around your level.
          </p>
        </div>
      </div>

      {/* Filters & Search - Rounded Md */}
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-[2fr_1fr_1fr]">
          <Input
            placeholder="Search players by name, handle, or city..."
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              // Reset detail view on type
              setViewAllSection(null);
            }}
            className="bg-muted/40 border-border/80 focus:border-primary/50 h-10 w-full rounded-md px-4"
          />
          <select
            value={selectedSkill}
            onChange={(e) => {
              setSelectedSkill(e.target.value);
              setViewAllSection(null);
            }}
            className="border-border bg-background text-muted-foreground focus:ring-primary focus:border-primary h-10 cursor-pointer rounded-md border px-4 py-2 text-sm focus:ring-1 focus:outline-none"
          >
            <option value="">All Skill Levels</option>
            <option value="beginner">Beginner (2.5+)</option>
            <option value="intermediate">Intermediate (3.5+)</option>
            <option value="advanced">Advanced (4.5+)</option>
            <option value="pro">Pro (5.0+)</option>
          </select>
          <select
            value={selectedState}
            onChange={(e) => {
              setSelectedState(e.target.value);
              setViewAllSection(null);
            }}
            className="border-border bg-background text-muted-foreground focus:ring-primary focus:border-primary h-10 cursor-pointer rounded-md border px-4 py-2 text-sm focus:ring-1 focus:outline-none"
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
      </div>

      {/* List / Grid Display */}
      {mainContent}
    </div>
  );
}
