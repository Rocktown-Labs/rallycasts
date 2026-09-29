/* eslint-disable complexity */
import { Button, buttonVariants } from "@rallycaststv/ui/components/button";
import { cn } from "@rallycaststv/ui/lib/utils";
import {
  Link,
  createFileRoute,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import {
  Calendar,
  Flame,
  MapPin,
  Navigation,
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
import type { GeoLocation } from "@/lib/hooks";
import {
  useGeolocation,
  useInfiniteVideos,
  useLocationConsent,
  useProfile,
  useRadarTracking,
  useTrending,
} from "@/lib/hooks";

const trendingSearchSchema = z.object({
  page: z.coerce.number().optional(),
  radius: z.coerce.number().optional(),
  section: z.string().optional(),
});

const VENUE_RADIUS_OPTIONS = [10, 25, 50, 100] as const;
const DEFAULT_VENUE_RADIUS = 50;
const VIEW_ALL_VENUE_LIMIT = 48;
const VIEW_ALL_VENUE_PAGE_SIZE = 24;

const normalizeVenueRadius = (radius?: number) => {
  if (!radius || !Number.isFinite(radius)) {
    return DEFAULT_VENUE_RADIUS;
  }

  let closest = DEFAULT_VENUE_RADIUS;
  for (const option of VENUE_RADIUS_OPTIONS) {
    if (Math.abs(option - radius) < Math.abs(closest - radius)) {
      closest = option;
    }
  }

  return closest;
};

const getTrendingViewSection = (section: unknown) =>
  typeof section === "string" ? section : null;

const getActivePlayerCount = (venues: unknown[]) => {
  let total = 0;
  for (const venue of venues) {
    total += (venue as VenueCardData).activePlayers ?? 0;
  }
  return total;
};

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
  actions,
  count,
  scope,
}: {
  icon: React.ReactNode;
  title: string;
  to: string;
  search?: Record<string, number | string | undefined>;
  actions?: ReactNode;
  count?: number;
  scope?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-xl font-bold">{title}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {scope && (
            <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              {scope}
            </span>
          )}
          {count !== undefined && count > 0 && (
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              {count}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {actions}
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
    </div>
  );
}

function VenueRadiusSelect({
  onRadiusChange,
  radius,
}: {
  onRadiusChange: (radius: number) => void;
  radius: number;
}) {
  return (
    <label
      className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground shadow-sm"
      title="Park search radius"
    >
      <MapPin className="size-3 text-primary" />
      <select
        aria-label="Park search radius"
        className="cursor-pointer appearance-none bg-transparent text-foreground outline-none"
        onChange={(event) => onRadiusChange(Number(event.target.value))}
        value={radius}
      >
        {VENUE_RADIUS_OPTIONS.map((option) => (
          <option key={option} value={option}>
            Within {option} mi
          </option>
        ))}
      </select>
    </label>
  );
}

function LocationStatus({
  error,
  hasLocationConsent,
  isApiFallback,
  isLoading,
  location,
  requestLocation,
}: {
  error: string | null;
  hasLocationConsent: boolean;
  isApiFallback?: boolean;
  isLoading: boolean;
  location?: GeoLocation;
  requestLocation: () => void;
}) {
  if (!hasLocationConsent) {
    return (
      <Button
        className="rounded-lg text-xs text-[#bcdf21]"
        onClick={requestLocation}
        size="sm"
        variant="ghost"
      >
        Enable location
      </Button>
    );
  }

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
        className="rounded-lg text-xs text-muted-foreground"
        onClick={requestLocation}
      >
        Use my location
      </Button>
    );
  }

  if (location) {
    const locationLabel = location.isFallback
      ? "Arkansas fallback"
      : location.label ||
        [location.city, location.stateCode].filter(Boolean).join(", ") ||
        `${location.lat.toFixed(3)}, ${location.lng.toFixed(3)}`;

    return (
      <button
        type="button"
        onClick={requestLocation}
        className="flex items-center gap-1 text-xs font-semibold text-white hover:text-white/80 transition-colors"
      >
        <MapPin className="size-3" />
        {isApiFallback ? "Demo fallback" : locationLabel}
      </button>
    );
  }

  return null;
}

function HeroStatusMessages({
  isApiFallback,
  isLocationFallback,
}: {
  isApiFallback: boolean;
  isLocationFallback?: boolean;
}) {
  return (
    <>
      {isLocationFallback && (
        <p className="text-xs font-medium text-[#bcdf21] pt-1">
          Showing Northwest Arkansas while we wait for exact location.
        </p>
      )}
      {isApiFallback && (
        <p className="text-xs font-medium text-rose-200 pt-1">
          Trending API is unavailable, so this page is showing demo data instead
          of live nearby parks.
        </p>
      )}
    </>
  );
}

function ParksNearYouSection({
  location,
  onRadiusChange,
  radius,
  requestLocation,
  venues,
}: {
  location?: { lat: number; lng: number };
  onRadiusChange: (radius: number) => void;
  radius: number;
  requestLocation: () => void;
  venues: VenueCardData[];
}) {
  const emptyMessage = location
    ? "Location is available, but no RallyCasts or Google Places pickleball parks were returned nearby."
    : "Allow location to search Google Places and RallyCasts venues near you.";

  return (
    <section className="space-y-4">
      <SectionHeader
        icon={<Flame className="size-5 text-primary" />}
        title="Parks Near You"
        to="/trending"
        search={{ radius, section: "venues" }}
        count={venues.length}
        scope={
          <VenueRadiusSelect onRadiusChange={onRadiusChange} radius={radius} />
        }
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
          message={emptyMessage}
          title="No nearby park heat yet"
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={requestLocation}
              className="rounded-md"
            >
              Refresh Location
            </Button>
          }
        />
      )}
    </section>
  );
}

function VenuesViewSection({
  location,
  onRadiusChange,
  page,
  pagination,
  radius,
  requestLocation,
  venues,
}: {
  location?: { lat: number; lng: number };
  onRadiusChange: (radius: number) => void;
  page: number;
  pagination?: {
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
    page?: number;
    pageSize?: number;
    totalCount?: number;
  };
  radius: number;
  requestLocation: () => void;
  venues: VenueCardData[];
}) {
  const emptyMessage = location
    ? `No Google Places or RallyCasts parks found within ${radius} miles.`
    : "Allow location to search Google Places and RallyCasts parks near you.";

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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">
            Nearby Pickleball Parks ({venues.length})
          </h2>
          <p className="text-xs text-muted-foreground">
            Showing places within {radius} miles.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <VenueRadiusSelect onRadiusChange={onRadiusChange} radius={radius} />
          <Link
            to="/trending"
            search={{ radius }}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "rounded-md text-xs"
            )}
          >
            ← Back to Trending
          </Link>
        </div>
      </div>

      {venues.length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3">
            {venues.map((venue) => (
              <ParkHeatCard key={venue.id} venue={venue} />
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              Page {pagination?.page ?? page}
              {pagination?.totalCount
                ? ` of ${Math.max(
                    1,
                    Math.ceil(
                      pagination.totalCount /
                        (pagination.pageSize ?? VIEW_ALL_VENUE_PAGE_SIZE)
                    )
                  )}`
                : ""}
            </p>
            <div className="flex items-center gap-2">
              <Link
                to="/trending"
                search={{
                  page: Math.max(page - 1, 1),
                  radius,
                  section: "venues",
                }}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "rounded-md text-xs",
                  pagination?.hasPreviousPage === false &&
                    "pointer-events-none opacity-50"
                )}
              >
                Previous
              </Link>
              <Link
                to="/trending"
                search={{ page: page + 1, radius, section: "venues" }}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "rounded-md text-xs",
                  pagination?.hasNextPage === false &&
                    "pointer-events-none opacity-50"
                )}
              >
                Next
              </Link>
            </div>
          </div>
        </>
      ) : (
        <EmptyState
          icon={<MapPin className="size-5" />}
          message={emptyMessage}
          title="No venues found"
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={requestLocation}
              className="rounded-md"
            >
              Use My Location
            </Button>
          }
        />
      )}
    </div>
  );
}

function VideosViewSection() {
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteVideos();
  const videos: VideoCardData[] =
    data?.pages.flatMap(
      (page) => (page?.videos ?? []) as unknown as VideoCardData[]
    ) ?? [];

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
  hasLocationConsent,
  location,
  onVenueRadiusChange,
  requestLocation,
  venueRadius,
  venues,
  videos,
  players,
  events,
  playerCount,
  isLoading,
  isAuthenticated,
  isApiFallback,
}: {
  geoError: string | null;
  geoLoading: boolean;
  hasLocationConsent: boolean;
  location?: { isFallback?: boolean; lat: number; lng: number } | null;
  onVenueRadiusChange: (radius: number) => void;
  requestLocation: () => void;
  venueRadius: number;
  venues: VenueCardData[];
  videos: VideoCardData[];
  players: PlayerCardData[];
  events: EventCardData[];
  playerCount: number;
  isLoading: boolean;
  isAuthenticated: boolean;
  isApiFallback: boolean;
}) {
  return (
    <div className="mx-auto max-w-7xl space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-xl bg-primary p-6 text-white shadow-xl">
        <div className="flex flex-col justify-between">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="max-w-xl space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-md bg-secondary/20 px-2.5 py-1 text-xs font-semibold text-[#bcdf21]">
                <span>Happening near you</span>
              </div>
              <h1 className="text-3xl font-logo tracking-wide lowercase sm:text-4xl">
                trending
              </h1>
              <p className="text-sm text-gray-200 sm:text-base leading-relaxed">
                Spot active parks, nearby players, local clips, and events worth
                playing in.
              </p>
              <HeroStatusMessages
                isApiFallback={isApiFallback}
                isLocationFallback={location?.isFallback}
              />
            </div>
          </div>

          <div className="relative z-10 mt-6 grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-lg border border-white/15 bg-black/15 p-3 backdrop-blur-sm sm:p-4">
              <div className="flex items-center gap-2 text-[10px] font-semibold text-white/75 sm:text-xs">
                <Flame className="size-4 shrink-0 text-[#bcdf21]" /> Parks
                heating up
              </div>
              <p className="mt-2 text-lg font-black sm:text-2xl">
                {venues.length}
              </p>
              <p className="text-[10px] text-white/60 sm:text-[11px]">
                Within {venueRadius} miles
              </p>
            </div>
            <div className="rounded-lg border border-white/15 bg-black/15 p-3 backdrop-blur-sm sm:p-4">
              <div className="flex items-center gap-2 text-[10px] font-semibold text-white/75 sm:text-xs">
                <Users className="size-4 shrink-0 text-[#bcdf21]" /> Players
                nearby
              </div>
              <p className="mt-2 text-lg font-black sm:text-2xl">
                {playerCount || players.length}
              </p>
              <p className="text-[10px] text-white/60 sm:text-[11px]">
                Within 100 miles
              </p>
            </div>
            <div className="rounded-lg border border-white/15 bg-black/15 p-3 backdrop-blur-sm sm:p-4">
              <div className="flex items-center gap-2 text-[10px] font-semibold text-white/75 sm:text-xs">
                <Navigation className="size-4 shrink-0 text-[#bcdf21]" /> Your
                location
              </div>
              <div className="mt-2 min-h-7 text-xs text-white/75">
                {isAuthenticated ? (
                  <LocationStatus
                    error={geoError}
                    hasLocationConsent={hasLocationConsent}
                    isApiFallback={isApiFallback}
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
              <p className="text-[10px] text-white/60 sm:text-[11px]">
                Tap to refresh
              </p>
            </div>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="h-72 animate-pulse rounded-lg bg-muted" />
      ) : null}

      <ParksNearYouSection
        location={location || undefined}
        onRadiusChange={onVenueRadiusChange}
        radius={venueRadius}
        requestLocation={requestLocation}
        venues={venues}
      />

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
      <section className="grid grid-cols-3 gap-2 sm:gap-4">
        <Link
          to="/trending"
          search={{ radius: venueRadius, section: "venues" }}
          className="group flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl bg-primary p-4 text-white shadow-sm transition-[background-color,transform] duration-150 hover:bg-primary/90 active:scale-[0.98] cursor-pointer sm:p-5"
        >
          <MapPin className="size-5 text-[#bcdf21]" />
          <span className="text-xs font-semibold sm:text-sm">Parks</span>
        </Link>
        <Link
          to="/events"
          className="group flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl bg-primary p-4 text-white shadow-sm transition-[background-color,transform] duration-150 hover:bg-primary/90 active:scale-[0.98] cursor-pointer sm:p-5"
        >
          <TrendingUp className="size-5 text-[#bcdf21]" />
          <span className="text-xs font-semibold sm:text-sm">Events</span>
        </Link>
        <Link
          to="/players"
          className="group flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl bg-primary p-4 text-white shadow-sm transition-[background-color,transform] duration-150 hover:bg-primary/90 active:scale-[0.98] cursor-pointer sm:p-5"
        >
          <Users className="size-5 text-[#bcdf21]" />
          <span className="text-xs font-semibold sm:text-sm">Players</span>
        </Link>
      </section>
    </div>
  );
}

function TrendingPage() {
  const navigate = useNavigate({ from: "/trending" });
  const { data: session } = authClient.useSession();
  const search = useSearch({ strict: false });
  const viewSection = getTrendingViewSection(search.section);
  const venuePage =
    typeof search.page === "number" && Number.isFinite(search.page)
      ? Math.max(1, Math.floor(search.page))
      : 1;
  const venueRadius = normalizeVenueRadius(
    typeof search.radius === "number" ? search.radius : undefined
  );
  const venueLimit =
    viewSection === "venues" ? VIEW_ALL_VENUE_LIMIT : undefined;
  const { grantConsent, hasConsent: hasLocationConsent } = useLocationConsent();
  const {
    error: geoError,
    isLoading: geoLoading,
    location,
    requestLocation: requestLocationFromHook,
  } = useGeolocation(Boolean(session?.user) && hasLocationConsent);
  const { data: profileData } = useProfile();
  const profile = profileData?.profile;
  const homeLat =
    profile &&
    "homeLatitude" in profile &&
    typeof profile.homeLatitude === "number"
      ? profile.homeLatitude
      : null;
  const homeLng =
    profile &&
    "homeLongitude" in profile &&
    typeof profile.homeLongitude === "number"
      ? profile.homeLongitude
      : null;

  const effectiveLocation: GeoLocation =
    (location?.lat && location?.lng ? location : undefined) ??
    (homeLat !== null && homeLng !== null
      ? {
          city:
            (profile &&
            "homeCity" in profile &&
            typeof profile.homeCity === "string"
              ? profile.homeCity
              : undefined) || undefined,
          isFallback: false,
          label:
            (profile &&
            "homeCity" in profile &&
            typeof profile.homeCity === "string"
              ? profile.homeCity
              : undefined) || "Your Home Area",
          lat: homeLat,
          lng: homeLng,
          stateCode:
            (profile &&
            "homeState" in profile &&
            typeof profile.homeState === "string"
              ? profile.homeState
              : undefined) || undefined,
        }
      : {
          city: "Searcy",
          isFallback: true,
          label: "Searcy, AR",
          lat: 35.2506,
          lng: -91.7362,
          stateCode: "AR",
        });
  const { data, isLoading } = useTrending(effectiveLocation, {
    venueLimit,
    venuePage: viewSection === "venues" ? venuePage : undefined,
    venueRadius,
  });
  useRadarTracking(session?.user?.id, hasLocationConsent);
  const requestLocation = () => {
    if (!hasLocationConsent) {
      grantConsent();
      return;
    }
    requestLocationFromHook();
  };
  const isApiFallback = data?.isApiFallback ?? false;
  const videos = data?.videos ?? [];
  const venues = data?.venues ?? [];
  const players = data?.players ?? [];
  const events = data?.events ?? [];
  const playerCount = getActivePlayerCount(venues);

  const handleVenueRadiusChange = (radius: number) => {
    navigate({
      search: (previous) => ({
        ...previous,
        page: undefined,
        radius,
      }),
    });
  };

  if (viewSection === "venues") {
    return (
      <VenuesViewSection
        location={effectiveLocation}
        onRadiusChange={handleVenueRadiusChange}
        page={venuePage}
        pagination={
          data && "venuePagination" in data ? data.venuePagination : undefined
        }
        radius={venueRadius}
        requestLocation={requestLocation}
        venues={venues as unknown as VenueCardData[]}
      />
    );
  }

  if (viewSection === "videos") {
    return <VideosViewSection />;
  }

  return (
    <TrendingDashboardView
      geoError={geoError}
      geoLoading={geoLoading}
      hasLocationConsent={hasLocationConsent}
      location={effectiveLocation}
      onVenueRadiusChange={handleVenueRadiusChange}
      requestLocation={requestLocation}
      venueRadius={venueRadius}
      venues={venues as unknown as VenueCardData[]}
      videos={videos as unknown as VideoCardData[]}
      players={players as unknown as PlayerCardData[]}
      events={events as unknown as EventCardData[]}
      playerCount={playerCount}
      isLoading={isLoading}
      isAuthenticated={Boolean(session?.user)}
      isApiFallback={isApiFallback}
    />
  );
}
