import { Button, buttonVariants } from "@rallycaststv/ui/components/button";
import { cn } from "@rallycaststv/ui/lib/utils";
import { Link, createFileRoute, useSearch } from "@tanstack/react-router";
import {
  Calendar,
  Flame,
  MapPin,
  Navigation,
  Sparkles,
  TrendingUp,
  Users,
  Video,
} from "lucide-react";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { z } from "zod";

import {
  EmptyState,
  EventCard,
  ParkHeatCard,
  PlayerCard,
  VideoCard,
} from "@/components/rally/cards";
import type {
  VenueCardData,
  VideoCardData,
  PlayerCardData,
  EventCardData,
} from "@/components/rally/cards";
import { authClient } from "@/lib/auth-client";
import {
  useGeolocation,
  useInfiniteVideos,
  useRadarTracking,
  useTrending,
} from "@/lib/hooks";

const trendingSearchSchema = z.object({
  section: z.string().optional(),
});

export const Route = createFileRoute("/trending")({
  component: TrendingPage,
  validateSearch: trendingSearchSchema,
});

function HorizontalScroll({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted hover:scrollbar-thumb-muted-foreground/30",
        className
      )}
    >
      {children}
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  to,
  search,
  count,
  scope,
}: {
  icon: React.ReactNode;
  title: string;
  to: string;
  search?: Record<string, string>;
  count?: number;
  scope?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-xl font-bold">{title}</h2>
        {scope && (
          <span className="text-[10px] bg-muted text-muted-foreground font-semibold px-2 py-0.5 rounded-md">
            {scope}
          </span>
        )}
        {count !== undefined && count > 0 && (
          <span className="text-[10px] bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-md">
            {count}
          </span>
        )}
      </div>
      <Link
        to={to as unknown as never}
        search={search as unknown as never}
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "rounded-md text-xs font-semibold"
        )}
      >
        View all
      </Link>
    </div>
  );
}

function LocationStatus({
  error,
  isLoading,
  location,
  requestLocation,
}: {
  error: string | null;
  isLoading: boolean;
  location?: { isFallback?: boolean; lat: number; lng: number };
  requestLocation: () => void;
}) {
  if (isLoading && !location) {
    return (
      <span className="text-xs text-muted-foreground animate-pulse">
        Locating you...
      </span>
    );
  }

  if (error && !location) {
    return (
      <Button
        size="sm"
        variant="ghost"
        className="text-xs text-muted-foreground"
        onClick={requestLocation}
      >
        Use my location
      </Button>
    );
  }

  if (location) {
    return (
      <button
        type="button"
        onClick={requestLocation}
        className="text-xs text-emerald-500 font-medium flex items-center gap-1 hover:text-emerald-400"
      >
        <MapPin className="size-3" />{" "}
        {location.isFallback ? "Arkansas fallback" : "Location active"}
      </button>
    );
  }

  return null;
}

function VenuesViewSection({ venues }: { venues: VenueCardData[] }) {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-4 animate-in fade-in duration-300">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-xl bg-primary p-6 text-white shadow-xl sm:p-8">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-md bg-secondary/20 px-2.5 py-1 text-xs font-semibold text-[#bcdf21]">
            <Flame className="size-3" />
            <span>Parks Near You</span>
          </div>
          <h1 className="text-3xl font-logo sm:text-4xl tracking-wide lowercase">
            venues
          </h1>
          <p className="text-sm text-gray-200 sm:text-base leading-relaxed">
            Explore local pickleball and padel courts, tracked by active
            check-ins.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">
          All Nearby Venues ({venues.length})
        </h2>
        <Link
          to="/trending"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "rounded-md text-xs"
          )}
        >
          ← Back to Trending
        </Link>
      </div>

      {venues.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3">
          {venues.map((venue) => (
            <ParkHeatCard key={venue.id} venue={venue} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<MapPin className="size-5" />}
          message="No nearby courts with active play found."
          title="No venues found"
        />
      )}
    </div>
  );
}

function VideosViewSection() {
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteVideos();
  const videos = data?.pages.flatMap((page) => page.videos) ?? [];

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: "320px" }
    );
    observer.observe(target);

    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-4 animate-in fade-in duration-300">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-xl bg-primary p-6 text-white shadow-xl sm:p-8">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-md bg-secondary/20 px-2.5 py-1 text-xs font-semibold text-[#bcdf21]">
            <Video className="size-3" />
            <span>Trending Highlights</span>
          </div>
          <h1 className="text-3xl font-logo sm:text-4xl tracking-wide lowercase">
            videos
          </h1>
          <p className="text-sm text-gray-200 sm:text-base leading-relaxed">
            Watch top rallies, matches, and gameplay clips captured by the
            community.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex-1 truncate">
          All Videos ({videos.length})
        </h2>
        <Link
          to="/trending"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "rounded-md text-xs"
          )}
        >
          ← Back to Trending
        </Link>
      </div>

      {isLoading ? (
        <div className="h-72 animate-pulse rounded-xl bg-muted" />
      ) : null}
      {videos.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      ) : (
        <EmptyState
          message="No trending videos available yet."
          title="No videos found"
        />
      )}
      <div
        ref={loadMoreRef}
        className="flex min-h-12 items-center justify-center"
      >
        {isFetchingNextPage ? (
          <span className="text-xs text-muted-foreground">
            Loading more rallies…
          </span>
        ) : null}
        {!hasNextPage && videos.length > 0 ? (
          <span className="text-xs text-muted-foreground">
            You’re all caught up.
          </span>
        ) : null}
      </div>
    </div>
  );
}

function TrendingDashboardView({
  geoError,
  geoLoading,
  location,
  requestLocation,
  venues,
  videos,
  players,
  events,
  playerCount,
  isLoading,
  isAuthenticated,
}: {
  geoError: string | null;
  geoLoading: boolean;
  location?: { isFallback?: boolean; lat: number; lng: number } | null;
  requestLocation: () => void;
  venues: VenueCardData[];
  videos: VideoCardData[];
  players: PlayerCardData[];
  events: EventCardData[];
  playerCount: number;
  isLoading: boolean;
  isAuthenticated: boolean;
}) {
  return (
    <div className="mx-auto max-w-7xl space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-xl bg-primary p-6 text-white shadow-xl">
        <div className="flex flex-col justify-between">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="max-w-xl space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-md bg-secondary/20 px-2.5 py-1 text-xs font-semibold text-[#bcdf21]">
                <Sparkles className="size-3" />
                <span>Happening near you</span>
              </div>
              <h1 className="text-3xl font-logo tracking-wide lowercase sm:text-4xl">
                trending
              </h1>
              <p className="text-sm text-gray-200 sm:text-base leading-relaxed">
                Spot active parks, nearby players, local clips, and events worth
                playing in.
              </p>
              {location?.isFallback && (
                <p className="text-xs font-medium text-[#bcdf21] pt-1">
                  Showing Northwest Arkansas while we wait for exact location.
                </p>
              )}
            </div>
          </div>

          <div className="relative z-10 mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-white/15 bg-black/15 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-xs text-white/75">
                <Flame className="size-4 text-[#bcdf21]" /> Parks heating up
              </div>
              <p className="mt-2 text-2xl font-black">{venues.length}</p>
              <p className="text-[11px] text-white/60">Within 50 miles</p>
            </div>
            <div className="rounded-lg border border-white/15 bg-black/15 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-xs text-white/75">
                <Users className="size-4 text-[#bcdf21]" /> Players nearby
              </div>
              <p className="mt-2 text-2xl font-black">
                {playerCount || players.length}
              </p>
              <p className="text-[11px] text-white/60">Within 100 miles</p>
            </div>
            <div className="rounded-lg border border-white/15 bg-black/15 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-xs text-white/75">
                <Navigation className="size-4 text-[#bcdf21]" /> Your location
              </div>
              <div className="mt-3 min-h-7 text-xs text-white/75">
                {isAuthenticated ? (
                  <LocationStatus
                    error={geoError}
                    isLoading={geoLoading}
                    location={location || undefined}
                    requestLocation={requestLocation}
                  />
                ) : (
                  <Link className="font-semibold text-[#bcdf21]" to="/login">
                    Sign in to activate
                  </Link>
                )}
              </div>
              <p className="text-[11px] text-white/60">Tap to refresh</p>
            </div>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="h-72 animate-pulse rounded-lg bg-muted" />
      ) : null}

      {/* Parks Near You */}
      <section className="space-y-4">
        <SectionHeader
          icon={<Flame className="size-5 text-primary" />}
          title="Parks Near You"
          to="/trending"
          search={{ section: "venues" }}
          count={venues.length}
          scope="Within 50 mi"
        />
        {venues.length > 0 ? (
          <HorizontalScroll>
            {venues.map((venue) => (
              <ParkHeatCard key={venue.id} venue={venue} />
            ))}
          </HorizontalScroll>
        ) : (
          <EmptyState
            icon={<MapPin className="size-5" />}
            message="Allow location or add venues to reveal nearby courts with active play."
            title="No nearby park heat yet"
          />
        )}
      </section>

      {/* Trending Videos */}
      <section className="space-y-4">
        <SectionHeader
          icon={<Video className="size-5 text-primary" />}
          title="Trending Videos"
          to="/trending"
          search={{ section: "videos" }}
          count={videos.length}
          scope="Within 500 mi"
        />
        {videos.length > 0 ? (
          <HorizontalScroll>
            {videos.slice(0, 8).map((video) => (
              <div key={video.id} className="w-72 shrink-0">
                <VideoCard video={video} />
              </div>
            ))}
          </HorizontalScroll>
        ) : (
          <EmptyState
            message="Videos will rank here as players publish local rallies."
            title="No trending videos yet"
          />
        )}
      </section>

      {/* Top Players Nearby */}
      <section className="space-y-4">
        <SectionHeader
          icon={<Users className="size-5 text-primary" />}
          title="Top Players Nearby"
          to="/players"
          search={{ section: "near-you" }}
          count={players.length}
          scope="Within 100 mi"
        />
        {players.length > 0 ? (
          <HorizontalScroll>
            {players.slice(0, 6).map((player) => (
              <div key={player.id} className="w-64 shrink-0">
                <PlayerCard player={player} />
              </div>
            ))}
          </HorizontalScroll>
        ) : (
          <EmptyState
            message="Players appear once they complete onboarding."
            title="No local players yet"
          />
        )}
      </section>

      {/* Events Worth Joining */}
      <section className="space-y-4">
        <SectionHeader
          icon={<Calendar className="size-5 text-primary" />}
          title="Events Worth Joining"
          to="/events"
          search={{ section: "near-you" }}
          count={events.length}
          scope="Within 200 mi"
        />
        {events.length > 0 ? (
          <HorizontalScroll>
            {events.slice(0, 6).map((event) => (
              <div key={event.id} className="w-80 shrink-0">
                <EventCard event={event} />
              </div>
            ))}
          </HorizontalScroll>
        ) : (
          <EmptyState
            message="Published events will appear here."
            title="No events yet"
          />
        )}
      </section>

      {/* Quick links */}
      <section className="grid gap-4 sm:grid-cols-3">
        <Link
          to="/trending"
          search={{ section: "venues" }}
          className="group rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition-all"
        >
          <MapPin className="size-5 text-primary mb-3" />
          <h3 className="font-bold text-sm group-hover:text-primary transition-colors">
            Browse all parks
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Explore courts across the region
          </p>
        </Link>
        <Link
          to="/events"
          className="group rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition-all"
        >
          <TrendingUp className="size-5 text-primary mb-3" />
          <h3 className="font-bold text-sm group-hover:text-primary transition-colors">
            Tournament calendar
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Find events worth traveling for
          </p>
        </Link>
        <Link
          to="/players"
          className="group rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition-all"
        >
          <Users className="size-5 text-primary mb-3" />
          <h3 className="font-bold text-sm group-hover:text-primary transition-colors">
            Player directory
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Connect with nearby players
          </p>
        </Link>
      </section>
    </div>
  );
}

function TrendingPage() {
  const { data: session } = authClient.useSession();
  const {
    error: geoError,
    isLoading: geoLoading,
    location,
    requestLocation,
  } = useGeolocation(Boolean(session?.user));
  const { data, isLoading } = useTrending(session?.user ? location : undefined);
  useRadarTracking(session?.user?.id);
  const videos = data?.videos ?? [];
  const venues = data?.venues ?? [];
  const players = data?.players ?? [];
  const events = data?.events ?? [];
  const playerCount = venues.reduce(
    (total, venue) =>
      total + ((venue as unknown as VenueCardData).activePlayers ?? 0),
    0
  );

  const search = useSearch({ strict: false });
  const viewSection =
    typeof search.section === "string" ? search.section : null;

  if (viewSection === "venues") {
    return <VenuesViewSection venues={venues as unknown as VenueCardData[]} />;
  }

  if (viewSection === "videos") {
    return <VideosViewSection />;
  }

  return (
    <TrendingDashboardView
      geoError={geoError}
      geoLoading={geoLoading}
      location={location}
      requestLocation={requestLocation}
      venues={venues as unknown as VenueCardData[]}
      videos={videos as unknown as VideoCardData[]}
      players={players as unknown as PlayerCardData[]}
      events={events as unknown as EventCardData[]}
      playerCount={playerCount}
      isLoading={isLoading}
      isAuthenticated={Boolean(session?.user)}
    />
  );
}
