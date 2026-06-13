import { Button, buttonVariants } from "@rallycaststv/ui/components/button";
import { cn } from "@rallycaststv/ui/lib/utils";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Calendar,
  Flame,
  MapPin,
  Navigation,
  TrendingUp,
  Users,
  Video,
} from "lucide-react";
import type { ReactNode } from "react";

import {
  EmptyState,
  EventCard,
  ParkHeatCard,
  PlayerCard,
  StatCard,
  VideoCard,
} from "@/components/rally/cards";
import { authClient } from "@/lib/auth-client";
import { useGeolocation, useRadarTracking, useTrending } from "@/lib/hooks";

export const Route = createFileRoute("/trending")({
  component: TrendingPage,
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
  href,
  count,
  scope,
}: {
  icon: React.ReactNode;
  title: string;
  href: string;
  count?: number;
  scope?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-xl font-bold">{title}</h2>
        {scope && (
          <span className="text-[10px] bg-muted text-muted-foreground font-semibold px-2 py-0.5 rounded-full">
            {scope}
          </span>
        )}
        {count !== undefined && count > 0 && (
          <span className="text-[10px] bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full">
            {count}
          </span>
        )}
      </div>
      <Link to={href} className={buttonVariants({ variant: "ghost" })}>
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

function TrendingPage() {
  const {
    error: geoError,
    isLoading: geoLoading,
    location,
    requestLocation,
  } = useGeolocation();
  const { data, isLoading } = useTrending(location);
  const { data: session } = authClient.useSession();
  useRadarTracking(session?.user?.id);
  const videos = data?.videos ?? [];
  const venues = data?.venues ?? [];
  const players = data?.players ?? [];
  const events = data?.events ?? [];
  const playerCount = venues.reduce(
    (total, venue) => total + (venue.activePlayers ?? 0),
    0
  );

  return (
    <div className="mx-auto max-w-7xl space-y-10">
      {/* Hero */}
      <section className="grid gap-4 md:grid-cols-[1.3fr_.7fr]">
        <div className="rounded-lg border border-border bg-[linear-gradient(135deg,hsl(142_100%_18%/.28),hsl(240_10%_4%/.4))] p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-primary">
              Happening near you
            </p>
            <LocationStatus
              error={geoError}
              isLoading={geoLoading}
              location={location}
              requestLocation={requestLocation}
            />
          </div>
          <h1 className="mt-2 text-3xl font-bold md:text-5xl">
            Find the courts with energy right now.
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Whether this is home or a new city, RallyCasts helps you spot active
            parks, nearby players, local clips, and events worth joining.
          </p>
          {location?.isFallback && (
            <p className="mt-3 text-xs font-medium text-primary">
              Showing Northwest Arkansas while we wait for exact location.
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/players" className={cn(buttonVariants(), "rounded-md")}>
              <Users className="size-4" />
              Find players
            </Link>
            <Link
              to="/events"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "rounded-md"
              )}
            >
              <Calendar className="size-4" />
              Upcoming events
            </Link>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1">
          <StatCard
            icon={<Flame className="size-5" />}
            label="Parks heating up"
            value={`${venues.length}`}
            trend="Within 50 miles"
          />
          <StatCard
            icon={<Navigation className="size-5" />}
            label="Players nearby"
            value={`${playerCount || players.length}`}
            trend="Within 100 miles"
          />
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
          href="/venues"
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
          href="/"
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
          href="/players"
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

      {/* Events Worth Recording */}
      <section className="space-y-4">
        <SectionHeader
          icon={<Calendar className="size-5 text-primary" />}
          title="Events Worth Recording"
          href="/events"
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
          to="/venues"
          className="group rounded-lg border border-border bg-card p-5 hover:border-primary/40 transition-all"
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
          className="group rounded-lg border border-border bg-card p-5 hover:border-primary/40 transition-all"
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
          className="group rounded-lg border border-border bg-card p-5 hover:border-primary/40 transition-all"
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
