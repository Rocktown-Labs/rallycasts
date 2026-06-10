import { buttonVariants } from "@rallycaststv/ui/components/button";
import { cn } from "@rallycaststv/ui/lib/utils";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Calendar, Flame, MapPin, Navigation, Users } from "lucide-react";

import {
  EmptyState,
  EventCard,
  ParkHeatCard,
  PlayerCard,
  StatCard,
  VideoCard,
} from "@/components/rally/cards";
import { useTrending } from "@/lib/hooks";

export const Route = createFileRoute("/trending")({
  component: TrendingPage,
});

function TrendingPage() {
  const { data, isLoading } = useTrending();
  const videos = data?.videos ?? [];
  const venues = data?.venues ?? [];
  const players = data?.players ?? [];
  const events = data?.events ?? [];
  const playerCount = venues.reduce(
    (total, venue) => total + (venue.activePlayers ?? 0),
    0
  );

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="grid gap-4 md:grid-cols-[1.3fr_.7fr]">
        <div className="rounded-lg border border-border bg-[linear-gradient(135deg,hsl(142_100%_18%/.28),hsl(240_10%_4%/.4))] p-6">
          <p className="text-sm font-semibold text-primary">
            Happening near you
          </p>
          <h1 className="mt-2 text-3xl font-bold md:text-5xl">
            Find the courts with energy right now.
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Whether this is home or a new city, RallyCasts helps you spot active
            parks, nearby players, local clips, and events worth joining.
          </p>
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
            trend="Based on your current area"
          />
          <StatCard
            icon={<Navigation className="size-5" />}
            label="Players out now"
            value={`${playerCount || players.length}`}
            trend="Estimated from local activity"
          />
        </div>
      </section>

      {isLoading ? (
        <div className="h-72 animate-pulse rounded-lg bg-muted" />
      ) : null}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Parks Heating Up</h2>
          <Link to="/trending" className={buttonVariants({ variant: "ghost" })}>
            View all
          </Link>
        </div>
        {venues.length > 0 ? (
          <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
            {venues.map((venue) => (
              <ParkHeatCard key={venue.id} venue={venue} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<MapPin className="size-5" />}
            message="Allow location or add venues to reveal nearby courts with active play."
            title="No nearby park heat yet"
          />
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Trending Videos</h2>
          <Link to="/" className={buttonVariants({ variant: "ghost" })}>
            View all
          </Link>
        </div>
        {videos.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-3">
            {videos.slice(0, 6).map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        ) : (
          <EmptyState
            message="Videos will rank here as players publish local rallies."
            title="No trending videos yet"
          />
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Top Players Nearby</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {players.length > 0 ? (
              players
                .slice(0, 4)
                .map((player) => <PlayerCard key={player.id} player={player} />)
            ) : (
              <EmptyState
                message="Players appear once they complete onboarding."
                title="No local players yet"
              />
            )}
          </div>
        </div>
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Events Worth Recording</h2>
          <div className="grid gap-4">
            {events.length > 0 ? (
              events
                .slice(0, 4)
                .map((event) => <EventCard key={event.id} event={event} />)
            ) : (
              <EmptyState
                message="Published events will appear here."
                title="No events yet"
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
