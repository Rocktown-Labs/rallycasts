import { Button, buttonVariants } from "@rallycaststv/ui/components/button";
import { cn } from "@rallycaststv/ui/lib/utils";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  Award,
  Building2,
  Calendar,
  Compass,
  ExternalLink,
  Flame,
  Globe,
  Loader2,
  MapPin,
  MessageSquare,
  Navigation,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Trophy,
  UploadCloud,
  UserPlus,
  Users,
  Video,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ParkHeatCard } from "@/components/rally/cards";
import type { VenueCardData } from "@/components/rally/cards";
import type { CourtSuggestion } from "@/lib/google-places";
import { mapGooglePlaceToCourtSuggestion } from "@/lib/google-places";
import {
  useEvents,
  useFriends,
  useGeolocation,
  useMyOrganizations,
  usePlaceSearch,
  usePlayers,
  useProfile,
  useSendFriendRequest,
  useTrending,
} from "@/lib/hooks";
import type { GeoLocation } from "@/lib/hooks/use-geolocation";

export const Route = createFileRoute("/_auth/u/me")({
  component: DashboardPage,
});

interface QuickDestination {
  city: string;
  icon: string;
  label: string;
  lat: number;
  lng: number;
  stateCode: string;
}

const POPULAR_DESTINATIONS: QuickDestination[] = [
  {
    city: "Naples",
    icon: "🌴",
    label: "Naples, FL (Pickleball Capital)",
    lat: 26.142,
    lng: -81.7948,
    stateCode: "FL",
  },
  {
    city: "New York",
    icon: "🗽",
    label: "New York, NY",
    lat: 40.7128,
    lng: -74.006,
    stateCode: "NY",
  },
  {
    city: "Austin",
    icon: "🤠",
    label: "Austin, TX",
    lat: 30.2672,
    lng: -97.7431,
    stateCode: "TX",
  },
  {
    city: "Phoenix",
    icon: "☀️",
    label: "Phoenix, AZ",
    lat: 33.4484,
    lng: -112.074,
    stateCode: "AZ",
  },
];

function getEffectiveLocation(
  geoLoc?: GeoLocation,
  profile?: unknown
): GeoLocation | undefined {
  if (geoLoc?.lat && geoLoc?.lng) {
    return geoLoc;
  }
  const hasCoords =
    profile &&
    typeof profile === "object" &&
    "homeLatitude" in profile &&
    "homeLongitude" in profile &&
    typeof profile.homeLatitude === "number" &&
    typeof profile.homeLongitude === "number";

  if (hasCoords) {
    const city =
      ("homeCity" in profile && typeof profile.homeCity === "string"
        ? profile.homeCity
        : undefined) || undefined;
    const stateCode =
      ("homeState" in profile && typeof profile.homeState === "string"
        ? profile.homeState
        : undefined) || undefined;
    return {
      city,
      label: [city, stateCode].filter(Boolean).join(", "),
      lat: profile.homeLatitude as number,
      lng: profile.homeLongitude as number,
      stateCode,
    };
  }

  return {
    city: "Searcy",
    label: "Searcy, AR",
    lat: 35.2506,
    lng: -91.7362,
    stateCode: "AR",
  };
}

function getProfileDisplay(profile: unknown) {
  const isComplete =
    profile && typeof profile === "object" && "homeCity" in profile;
  const homeCourtName =
    (isComplete &&
    "homeCourtName" in profile &&
    typeof profile.homeCourtName === "string"
      ? profile.homeCourtName
      : null) || "Local Court";
  const homeCity =
    (isComplete && typeof profile.homeCity === "string"
      ? profile.homeCity
      : null) || "Searcy";
  const homeState =
    (isComplete &&
    "homeState" in profile &&
    typeof profile.homeState === "string"
      ? profile.homeState
      : null) || "AR";
  const skillLevel =
    (isComplete &&
    "skillLevel" in profile &&
    typeof profile.skillLevel === "string"
      ? profile.skillLevel
      : null) || null;

  return {
    homeCity,
    homeCourtName,
    homeLocationLabel: `${homeCity}, ${homeState}`,
    homeState,
    skillLevel,
  };
}

function useDashboardLocation(profile: unknown) {
  const {
    browsingLocation,
    isBrowsing,
    location: geoLoc,
    resetToCurrentLocation,
    setBrowsingLocation,
  } = useGeolocation();

  const effectiveLocation = useMemo(
    () => getEffectiveLocation(geoLoc, profile),
    [geoLoc, profile]
  );

  return {
    browsingLocation,
    effectiveLocation,
    isBrowsing,
    resetToCurrentLocation,
    setBrowsingLocation,
  };
}

function useFriendRequestHandler() {
  const sendFriendRequest = useSendFriendRequest();
  return async (targetUserId: string, name: string) => {
    try {
      await sendFriendRequest.mutateAsync({ toUserId: targetUserId });
      toast.success(`Friend request sent to ${name}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to send request";
      toast.error(message);
    }
  };
}

function checkIsOrganizer(profile: unknown, orgCount: number): boolean {
  if (orgCount > 0) {
    return true;
  }
  return Boolean(
    profile &&
    typeof profile === "object" &&
    "isOrganizer" in profile &&
    profile.isOrganizer
  );
}

function useCitySearch(
  setBrowsingLocation: (loc: {
    city?: string;
    label?: string;
    lat: number;
    lng: number;
    stateCode?: string;
  }) => void
) {
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState("");
  const { data: placeSearchResults, isFetching: isSearchingPlaces } =
    usePlaceSearch(citySearchQuery);

  const placeSuggestions = useMemo(
    () =>
      (placeSearchResults?.places ?? []).map(mapGooglePlaceToCourtSuggestion),
    [placeSearchResults?.places]
  );

  const handleSelectDestination = (dest: {
    city?: string;
    label?: string;
    lat: number;
    lng: number;
    stateCode?: string;
  }) => {
    const destinationLabel =
      dest.label ?? `${dest.city ?? "Area"}, ${dest.stateCode ?? ""}`;
    setBrowsingLocation({
      city: dest.city,
      label: destinationLabel,
      lat: dest.lat,
      lng: dest.lng,
      stateCode: dest.stateCode,
    });
    setShowCityPicker(false);
    setCitySearchQuery("");
    toast.success(`Showing pickleball feed for ${destinationLabel}`);
  };

  return {
    citySearchQuery,
    handleSelectDestination,
    isSearchingPlaces,
    placeSuggestions,
    setCitySearchQuery,
    setShowCityPicker,
    showCityPicker,
  };
}

function filterOtherPlayers<T extends { id: string }>(
  players: T[] | undefined,
  currentUserId?: string
): T[] {
  if (!players) {
    return [];
  }
  return players.filter((p) => p.id !== currentUserId).slice(0, 4);
}

function HeroHeaderCard({
  accountTier,
  citySearchQuery,
  effectiveLocationLabel,
  homeCourtName,
  homeLocationLabel,
  isBrowsing,
  isSearchingPlaces,
  onResetLocation,
  onSearchChange,
  onSelectDestination,
  onTogglePicker,
  placeSuggestions,
  showCityPicker,
  skillLevel,
  userName,
}: {
  accountTier: string;
  citySearchQuery: string;
  effectiveLocationLabel: string;
  homeCourtName: string;
  homeLocationLabel: string;
  isBrowsing: boolean;
  isSearchingPlaces: boolean;
  onResetLocation: () => void;
  onSearchChange: (q: string) => void;
  onSelectDestination: (dest: {
    city?: string;
    label?: string;
    lat: number;
    lng: number;
    stateCode?: string;
  }) => void;
  onTogglePicker: () => void;
  placeSuggestions: CourtSuggestion[];
  showCityPicker: boolean;
  skillLevel: string | null;
  userName: string;
}) {
  return (
    <div className="border-border/80 from-card via-card/90 to-card/60 relative overflow-hidden rounded-2xl border bg-linear-to-b p-6 shadow-md sm:p-8">
      <div className="bg-primary/10 pointer-events-none absolute -top-16 -right-16 size-72 rounded-full blur-3xl" />

      <DashboardHeader
        accountTier={accountTier}
        effectiveLocationLabel={effectiveLocationLabel}
        homeCourtName={homeCourtName}
        homeLocationLabel={homeLocationLabel}
        isPickerOpen={showCityPicker}
        onTogglePicker={onTogglePicker}
        skillLevel={skillLevel}
        userName={userName}
      />

      <TripPlanningPicker
        citySearchQuery={citySearchQuery}
        isBrowsing={isBrowsing}
        isOpen={showCityPicker}
        isSearchingPlaces={isSearchingPlaces}
        onResetLocation={onResetLocation}
        onSearchChange={onSearchChange}
        onSelectDestination={onSelectDestination}
        placeSuggestions={placeSuggestions}
      />
    </div>
  );
}

function useDashboardData() {
  const { data: profileData } = useProfile();
  const user = profileData?.user;
  const profile = profileData?.profile;

  const {
    browsingLocation,
    effectiveLocation,
    isBrowsing,
    resetToCurrentLocation,
    setBrowsingLocation,
  } = useDashboardLocation(profile);

  const trendingQuery = useTrending(effectiveLocation, {
    venueLimit: 6,
    venueRadius: 50,
  });
  const eventsQuery = useEvents();
  const playersQuery = usePlayers("", "player");
  const friendsQuery = useFriends();
  const myOrgsQuery = useMyOrganizations();

  return {
    browsingLocation,
    effectiveLocation,
    eventsQuery,
    friendsQuery,
    isBrowsing,
    myOrgsQuery,
    playersQuery,
    profile,
    resetToCurrentLocation,
    setBrowsingLocation,
    trendingQuery,
    user,
  };
}

function getDashboardLabels(
  profile: unknown,
  user: { name?: string | null } | undefined,
  effectiveLocation?: GeoLocation,
  homeLocationLabel = ""
) {
  const accountTier =
    profile &&
    typeof profile === "object" &&
    "accountTier" in profile &&
    typeof profile.accountTier === "string"
      ? profile.accountTier
      : "Free";
  const effectiveLocationLabel =
    effectiveLocation?.label || effectiveLocation?.city || homeLocationLabel;
  const userName = user?.name || "Pickleballer";

  return { accountTier, effectiveLocationLabel, userName };
}

function DashboardPage() {
  const {
    browsingLocation,
    effectiveLocation,
    eventsQuery,
    friendsQuery,
    isBrowsing,
    myOrgsQuery,
    playersQuery,
    profile,
    resetToCurrentLocation,
    setBrowsingLocation,
    trendingQuery,
    user,
  } = useDashboardData();

  const handleFriendRequest = useFriendRequestHandler();
  const myOrgs = myOrgsQuery.data?.organizations ?? [];
  const isOrganizer = checkIsOrganizer(profile, myOrgs.length);

  const {
    citySearchQuery,
    handleSelectDestination,
    isSearchingPlaces,
    placeSuggestions,
    setCitySearchQuery,
    setShowCityPicker,
    showCityPicker,
  } = useCitySearch(setBrowsingLocation);

  const { homeCourtName, homeLocationLabel, skillLevel } = useMemo(
    () => getProfileDisplay(profile),
    [profile]
  );

  const handleResetLocation = () => {
    resetToCurrentLocation();
    setShowCityPicker(false);
    toast.info(`Reset back to your location (${homeLocationLabel})`);
  };

  const venues = trendingQuery.data?.venues ?? [];
  const events = (eventsQuery.data?.events ?? []).slice(0, 3);
  const players = filterOtherPlayers(playersQuery.data?.players, user?.id);
  const friends = friendsQuery.data?.friends ?? [];

  const { accountTier, effectiveLocationLabel, userName } = getDashboardLabels(
    profile,
    user,
    effectiveLocation,
    homeLocationLabel
  );

  return (
    <div className="animate-in fade-in mx-auto max-w-7xl space-y-8 px-4 py-6 duration-300 sm:px-6">
      <TripPlanningBanner
        browsingLocation={browsingLocation}
        homeLocationLabel={homeLocationLabel}
        isBrowsing={isBrowsing}
        onReset={handleResetLocation}
      />

      <HeroHeaderCard
        accountTier={accountTier}
        citySearchQuery={citySearchQuery}
        effectiveLocationLabel={effectiveLocationLabel}
        homeCourtName={homeCourtName}
        homeLocationLabel={homeLocationLabel}
        isBrowsing={isBrowsing}
        isSearchingPlaces={isSearchingPlaces}
        onResetLocation={handleResetLocation}
        onSearchChange={setCitySearchQuery}
        onSelectDestination={handleSelectDestination}
        onTogglePicker={() => setShowCityPicker((prev) => !prev)}
        placeSuggestions={placeSuggestions}
        showCityPicker={showCityPicker}
        skillLevel={skillLevel}
        userName={userName}
      />

      <ActionStrip />

      <ParksAroundYouSection
        effectiveLocationLabel={effectiveLocationLabel}
        homeCourtName={homeCourtName}
        isLoading={trendingQuery.isLoading}
        onOpenCityPicker={() => setShowCityPicker(true)}
        venues={venues}
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <TournamentsSection events={events} />
        <PlayersSection onConnect={handleFriendRequest} players={players} />
      </div>

      {isOrganizer && (
        <OrganizationsSection
          isLoading={myOrgsQuery.isLoading}
          myOrgs={myOrgs}
        />
      )}

      <FriendsSection friends={friends} />
    </div>
  );
}

function ParksAroundYouSection({
  effectiveLocationLabel,
  homeCourtName,
  isLoading,
  onOpenCityPicker,
  venues,
}: {
  effectiveLocationLabel: string;
  homeCourtName: string;
  isLoading: boolean;
  onOpenCityPicker: () => void;
  venues: VenueCardData[];
}) {
  const hasHomeCourtName =
    Boolean(homeCourtName) && homeCourtName !== "Local Court";
  const matchesHomeCourt = (venue: VenueCardData) =>
    hasHomeCourtName &&
    venue.name.toLowerCase().includes(homeCourtName.toLowerCase());
  const orderedVenues = hasHomeCourtName
    ? [...venues].toSorted(
        (left, right) =>
          Number(matchesHomeCourt(right)) - Number(matchesHomeCourt(left))
      )
    : venues;
  const homeInResults = venues.some(matchesHomeCourt);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Flame className="text-primary size-5" />
          <h2 className="text-foreground text-xl font-bold tracking-tight">
            Parks Around You
          </h2>
          <span className="bg-primary/10 text-primary rounded-md px-2 py-0.5 text-[10px] font-bold">
            {venues.length} parks
          </span>
        </div>
        <Link
          className={cn(
            buttonVariants({ size: "sm", variant: "outline" }),
            "gap-1 rounded-lg text-xs font-semibold"
          )}
          search={{ radius: 50, section: "venues" }}
          to="/trending"
        >
          View Interactive Map
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {isLoading && (
        <div className="-mx-4 flex gap-4 overflow-hidden px-4 sm:mx-0 sm:px-0">
          {[1, 2, 3].map((idx) => (
            <div
              className="border-border/60 bg-muted/40 h-64 w-72 shrink-0 animate-pulse rounded-xl border"
              key={idx}
            />
          ))}
        </div>
      )}

      {!isLoading && venues.length === 0 && (
        <div className="border-border bg-muted/10 space-y-3 rounded-xl border border-dashed p-8 text-center">
          <MapPin className="text-muted-foreground mx-auto size-8" />
          <p className="text-foreground text-sm font-semibold">
            No parks found within 50 miles of {effectiveLocationLabel}
          </p>
          <p className="text-muted-foreground mx-auto max-w-sm text-xs">
            Try switching destination cities with the Trip Planner or searching
            nearby municipalities.
          </p>
          <Button
            className="cursor-pointer rounded-lg text-xs font-semibold transition-transform duration-150 ease-out active:scale-97"
            onClick={onOpenCityPicker}
            size="sm"
            variant="outline"
          >
            Search Another City
          </Button>
        </div>
      )}

      {!isLoading && venues.length > 0 && (
        <>
          {hasHomeCourtName && !homeInResults && (
            <p className="text-muted-foreground text-xs">
              Your home court{" "}
              <strong className="text-foreground">{homeCourtName}</strong> is
              not showing in this range yet.
            </p>
          )}
          <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            {orderedVenues.map((venue) => (
              <ParkHeatCard key={venue.id} venue={venue} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function TripPlanningBanner({
  browsingLocation,
  homeLocationLabel,
  isBrowsing,
  onReset,
}: {
  browsingLocation: ReturnType<typeof useGeolocation>["browsingLocation"];
  homeLocationLabel: string;
  isBrowsing: boolean;
  onReset: () => void;
}) {
  if (!isBrowsing || !browsingLocation) {
    return null;
  }

  const browsingLocationLabel =
    browsingLocation.label ?? browsingLocation.city ?? "Destination";

  return (
    <div className="border-primary/40 bg-primary/10 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="bg-primary text-primary-foreground rounded-lg p-2">
          <Compass className="size-5" />
        </div>
        <div>
          <p className="text-primary text-xs font-bold tracking-wider uppercase">
            ✈️ Trip Planning Mode Active
          </p>
          <p className="text-foreground text-sm font-semibold">
            Showing courts, tournaments, and players for{" "}
            <span className="decoration-primary underline">
              {browsingLocationLabel}
            </span>
          </p>
        </div>
      </div>
      <Button
        className="cursor-pointer gap-1.5 rounded-lg text-xs font-semibold transition-transform duration-150 ease-out active:scale-97"
        onClick={onReset}
        size="sm"
        variant="outline"
      >
        <RotateCcw className="size-3.5" />
        Reset to My Location ({homeLocationLabel})
      </Button>
    </div>
  );
}

function DashboardHeader({
  accountTier,
  effectiveLocationLabel,
  homeCourtName,
  homeLocationLabel,
  isPickerOpen,
  onTogglePicker,
  skillLevel,
  userName,
}: {
  accountTier: string;
  effectiveLocationLabel: string;
  homeCourtName: string;
  homeLocationLabel: string;
  isPickerOpen: boolean;
  onTogglePicker: () => void;
  skillLevel: string | null;
  userName: string;
}) {
  return (
    <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="bg-primary/15 border-primary/30 text-primary rounded-full border px-3 py-0.5 text-xs font-bold tracking-wider uppercase">
            Player Hub
          </span>
          <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-xs font-medium">
            Tier:{" "}
            <strong className="text-foreground capitalize">
              {accountTier}
            </strong>
          </span>
          {skillLevel && (
            <span className="bg-brand-yellow/15 border-brand-yellow/30 dark:text-brand-yellow flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold text-amber-500">
              <Award className="size-3" />
              {skillLevel}
            </span>
          )}
        </div>

        <h1 className="text-foreground text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
          Welcome, {userName}!
        </h1>

        <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm">
          <span className="text-foreground flex items-center gap-1.5 font-medium">
            <MapPin className="text-primary size-4 shrink-0" />
            Home: {homeCourtName} ({homeLocationLabel})
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <Globe className="text-muted-foreground size-3.5 shrink-0" />
            Browsing Area:{" "}
            <strong className="text-foreground">
              {effectiveLocationLabel}
            </strong>
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          className="border-border bg-background/60 hover:border-primary/40 cursor-pointer gap-1.5 rounded-lg text-xs font-semibold backdrop-blur-xs transition-transform duration-150 ease-out active:scale-97"
          onClick={onTogglePicker}
          size="sm"
          variant="outline"
        >
          <Compass className="text-primary size-3.5" />
          {isPickerOpen
            ? "Close Destination Picker"
            : "Plan a Trip / Change City"}
        </Button>
        <Link
          className={cn(
            buttonVariants({ size: "sm" }),
            "bg-primary hover:bg-primary/90 cursor-pointer gap-1.5 rounded-lg font-bold shadow-xs transition-transform duration-150 ease-out active:scale-97"
          )}
          to="/u/studio"
        >
          <UploadCloud className="size-4" />
          Record Match
        </Link>
      </div>
    </div>
  );
}

function TripPlanningPicker({
  citySearchQuery,
  isBrowsing,
  isOpen,
  isSearchingPlaces,
  onResetLocation,
  onSearchChange,
  onSelectDestination,
  placeSuggestions,
}: {
  citySearchQuery: string;
  isBrowsing: boolean;
  isOpen: boolean;
  isSearchingPlaces: boolean;
  onResetLocation: () => void;
  onSearchChange: (q: string) => void;
  onSelectDestination: (dest: {
    city?: string;
    label?: string;
    lat: number;
    lng: number;
    stateCode?: string;
  }) => void;
  placeSuggestions: CourtSuggestion[];
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="border-border/60 animate-in fade-in slide-in-from-top-2 mt-6 space-y-4 border-t pt-6 duration-200">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-foreground flex items-center gap-1.5 text-sm font-bold">
            <Navigation className="text-primary size-4" />
            Travel & Trip Planning
          </h3>
          <p className="text-muted-foreground text-xs">
            Check out courts, upcoming brackets, and local players anywhere in
            the US before you travel.
          </p>
        </div>
        {isBrowsing && (
          <button
            className="text-primary cursor-pointer text-xs font-semibold hover:underline"
            onClick={onResetLocation}
            type="button"
          >
            Reset to Current Location
          </button>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="text-muted-foreground pointer-events-none absolute top-2.5 left-3 size-4" />
        <input
          aria-label="Search destination city, state, or park"
          autoComplete="off"
          className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-xl border pr-3 pl-9 text-xs font-medium outline-none focus-visible:ring-1 pointer-coarse:text-base"
          enterKeyHint="search"
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search city, state, or park (e.g. New York, Dallas, Crestwood)…"
          type="text"
          value={citySearchQuery}
        />
        {isSearchingPlaces && (
          <Loader2 className="text-primary absolute top-2.5 right-3 size-4 animate-spin" />
        )}
      </div>

      {citySearchQuery.trim().length >= 3 && placeSuggestions.length > 0 && (
        <div className="border-border bg-popover text-popover-foreground divide-border/40 max-h-48 max-w-md divide-y overflow-y-auto overscroll-contain rounded-xl border shadow-lg">
          {placeSuggestions.map((suggestion) => (
            <button
              className="hover:bg-muted/70 flex w-full cursor-pointer items-center justify-between gap-2 px-3.5 py-2.5 text-left text-xs transition-colors"
              key={suggestion.placeId ?? suggestion.formattedAddress}
              onClick={() =>
                onSelectDestination({
                  city: suggestion.city,
                  label: `${suggestion.addressLabel} (${suggestion.city}, ${suggestion.stateCode})`,
                  lat: suggestion.latitude,
                  lng: suggestion.longitude,
                  stateCode: suggestion.stateCode,
                })
              }
              type="button"
            >
              <div className="min-w-0">
                <p className="text-foreground truncate font-bold">
                  {suggestion.addressLabel}
                </p>
                <p className="text-muted-foreground truncate text-[11px]">
                  {suggestion.formattedAddress}
                </p>
              </div>
              <span className="text-primary bg-primary/10 shrink-0 rounded px-2 py-0.5 text-[10px] font-bold">
                Explore
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
          Popular Pickleball Hotspots
        </p>
        <div className="flex flex-wrap gap-2">
          {POPULAR_DESTINATIONS.map((dest) => (
            <button
              className="border-border/80 bg-background hover:border-primary/50 hover:bg-primary/5 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
              key={dest.label}
              onClick={() => onSelectDestination(dest)}
              type="button"
            >
              <span>{dest.icon}</span>
              <span>{dest.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const actionTiles = [
  {
    chip: "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground",
    icon: Video,
    label: "Record Match",
    to: "/u/studio",
  },
  {
    chip: "bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white",
    icon: MapPin,
    label: "Find Courts",
    to: "/trending",
  },
  {
    chip: "bg-amber-500/10 text-amber-500 group-hover:bg-amber-500 group-hover:text-white",
    icon: Trophy,
    label: "Tournaments",
    to: "/events",
  },
  {
    chip: "bg-indigo-500/10 text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white",
    icon: Users,
    label: "Players",
    to: "/players",
  },
] as const;

function ActionStrip() {
  return (
    <section
      aria-label="Quick actions"
      className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0"
    >
      {actionTiles.map(({ chip, icon: Icon, label, to }) => (
        <Link
          className="group border-border/80 bg-card/60 hover:border-primary/50 hover:bg-card focus-visible:ring-ring/50 flex min-w-32 cursor-pointer flex-col items-center gap-2.5 rounded-xl border p-4 transition-[background-color,border-color,transform] duration-150 focus-visible:ring-2 focus-visible:outline-none active:scale-[0.98]"
          key={to}
          to={to}
        >
          <span
            className={`grid size-10 place-items-center rounded-lg transition-colors ${chip}`}
          >
            <Icon className="size-5" />
          </span>
          <span className="text-foreground text-xs font-semibold">{label}</span>
        </Link>
      ))}
    </section>
  );
}

function TournamentsSection({
  events,
}: {
  events: ReturnType<typeof useEvents> extends {
    data?: { events?: infer E };
  }
    ? NonNullable<E>
    : never;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="text-primary size-5" />
          <h2 className="text-foreground text-lg font-bold tracking-tight">
            Upcoming Tournaments
          </h2>
        </div>
        <Link
          className="text-primary text-xs font-semibold hover:underline"
          to="/events"
        >
          View all brackets →
        </Link>
      </div>

      {events.length > 0 ? (
        <div className="space-y-3">
          {events.map((event) => (
            <div
              className="border-border/80 bg-card hover:border-primary/40 flex items-center justify-between gap-3 rounded-xl border p-4 shadow-xs transition-colors"
              key={event.id}
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="bg-primary/10 text-primary rounded px-2 py-0.5 text-[10px] font-bold capitalize">
                    {event.eventType || "Tournament"}
                  </span>
                  {"bracketType" in event &&
                  typeof event.bracketType === "string" ? (
                    <span className="bg-muted text-muted-foreground rounded px-2 py-0.5 text-[10px] font-medium capitalize">
                      {(event.bracketType as string).replace("_", " ")}
                    </span>
                  ) : null}
                </div>
                <p className="text-foreground truncate text-sm font-bold">
                  {event.name}
                </p>
                <p className="text-muted-foreground text-xs">
                  Starts:{" "}
                  {new Date(event.startsAt).toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "short",
                  })}
                </p>
              </div>
              <Link
                className={cn(
                  buttonVariants({ size: "sm", variant: "outline" }),
                  "cursor-pointer rounded-lg text-xs font-semibold transition-transform duration-150 ease-out active:scale-97"
                )}
                params={{ id: event.id }}
                to="/events/$id"
              >
                View Bracket
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="border-border/60 bg-muted/20 space-y-2 rounded-xl border p-6 text-center">
          <Trophy className="text-muted-foreground mx-auto size-6" />
          <p className="text-muted-foreground text-xs font-medium">
            No active tournaments scheduled in this radius right now.
          </p>
          <Link
            className={cn(
              buttonVariants({ size: "sm", variant: "ghost" }),
              "text-primary text-xs"
            )}
            to="/events"
          >
            Browse State Events
          </Link>
        </div>
      )}
    </section>
  );
}

function PlayersSection({
  onConnect,
  players,
}: {
  onConnect: (id: string, name: string) => void;
  players: ReturnType<typeof usePlayers> extends {
    data?: { players?: infer P };
  }
    ? NonNullable<P>
    : never;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="text-primary size-5" />
          <h2 className="text-foreground text-lg font-bold tracking-tight">
            Players in Your Area
          </h2>
        </div>
        <Link
          className="text-primary text-xs font-semibold hover:underline"
          to="/players"
        >
          Explore directory →
        </Link>
      </div>

      {players.length > 0 ? (
        <div className="space-y-3">
          {players.map((player) => (
            <div
              className="border-border/80 bg-card hover:border-primary/40 flex items-center justify-between gap-3 rounded-xl border p-3.5 shadow-xs transition-colors"
              key={player.id}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="bg-primary/10 border-primary/20 text-primary flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border text-sm font-bold">
                  {player.image ? (
                    <img
                      alt={player.name}
                      className="size-full rounded-full object-cover"
                      height={40}
                      src={player.image}
                      width={40}
                    />
                  ) : (
                    player.name?.slice(0, 2).toUpperCase() || "PB"
                  )}
                </div>
                <div className="min-w-0 space-y-0.5">
                  <p className="text-foreground truncate text-sm font-bold">
                    {player.name}
                  </p>
                  <div className="text-muted-foreground flex items-center gap-2 text-xs">
                    {player.skillLevel && (
                      <span className="text-primary font-semibold capitalize">
                        {player.skillLevel}
                      </span>
                    )}
                    <span className="truncate">
                      {[player.homeCity, player.homeState]
                        .filter(Boolean)
                        .join(", ") || "Local Player"}
                    </span>
                  </div>
                </div>
              </div>

              <Button
                className="shrink-0 cursor-pointer gap-1 rounded-lg text-xs font-semibold transition-transform duration-150 ease-out active:scale-97"
                onClick={() => onConnect(player.id, player.name)}
                size="sm"
                variant="outline"
              >
                <UserPlus className="text-primary size-3.5" />
                Connect
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="border-border/60 bg-muted/20 space-y-2 rounded-xl border p-6 text-center">
          <Users className="text-muted-foreground mx-auto size-6" />
          <p className="text-muted-foreground text-xs font-medium">
            No other players registered nearby yet.
          </p>
          <Link
            className={cn(
              buttonVariants({ size: "sm", variant: "ghost" }),
              "text-primary text-xs"
            )}
            to="/players"
          >
            Browse All Players
          </Link>
        </div>
      )}
    </section>
  );
}

function FriendsSection({
  friends,
}: {
  friends: ReturnType<typeof useFriends> extends {
    data?: { friends?: infer F };
  }
    ? NonNullable<F>
    : never;
}) {
  if (friends.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="text-primary size-5" />
          <h2 className="text-foreground text-lg font-bold tracking-tight">
            Your Pickleball Friends ({friends.length})
          </h2>
        </div>
        <Link
          className="text-primary text-xs font-semibold hover:underline"
          to="/u/messages"
        >
          Open chat →
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {friends.map((friend) => (
          <div
            className="border-border/70 bg-card flex items-center justify-between gap-3 rounded-xl border p-3 shadow-xs"
            key={friend.id}
          >
            <div className="min-w-0">
              <p className="text-foreground truncate text-xs font-bold">
                {friend.name}
              </p>
              <p className="text-muted-foreground truncate text-[11px]">
                @{friend.username || "player"}
              </p>
            </div>
            <Link
              aria-label={`Message ${friend.name}`}
              className={cn(
                buttonVariants({ size: "icon-sm", variant: "ghost" }),
                "cursor-pointer rounded-lg transition-transform duration-150 ease-out active:scale-97"
              )}
              to="/u/messages"
            >
              <MessageSquare className="text-primary size-4" />
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

function OrganizationCard({
  org,
  role,
}: {
  org: {
    bio?: string | null;
    city?: string | null;
    id: string;
    isOfficial?: boolean;
    logoUrl?: string | null;
    name: string;
    slug: string;
    state?: string | null;
  };
  role: string;
}) {
  return (
    <div className="border-border/80 bg-card hover:border-primary/40 flex flex-col justify-between rounded-xl border p-5 shadow-xs transition-[border-color,box-shadow] hover:shadow-md">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-1.5">
              {org.isOfficial && (
                <span className="bg-primary/15 text-primary inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">
                  <ShieldCheck className="text-primary size-3" />
                  Official Org
                </span>
              )}
              <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px] font-medium uppercase">
                {role}
              </span>
            </div>
            <h3 className="text-foreground truncate text-base font-bold">
              {org.name}
            </h3>
            <p className="text-muted-foreground truncate text-xs">
              {[org.city, org.state].filter(Boolean).join(", ") || "Nationwide"}
            </p>
          </div>
        </div>
        {org.bio && (
          <p className="text-muted-foreground line-clamp-2 text-xs">
            {org.bio}
          </p>
        )}
      </div>

      <div className="border-border/40 mt-4 flex items-center gap-2 border-t pt-4">
        <Link
          className={cn(
            buttonVariants({ size: "sm" }),
            "bg-primary text-primary-foreground flex-1 gap-1.5 rounded-lg text-xs font-semibold"
          )}
          params={{ slug: org.slug }}
          to="/u/organizer/organizations/$slug"
        >
          <span>Manage & Host</span>
          <ArrowRight className="size-3" />
        </Link>
        <Link
          aria-label={`View ${org.name} public page`}
          className={cn(
            buttonVariants({ size: "sm", variant: "outline" }),
            "cursor-pointer rounded-lg transition-transform duration-150 ease-out active:scale-97"
          )}
          params={{ slug: org.slug }}
          to="/events/hosts/$slug"
        >
          <ExternalLink className="text-muted-foreground size-3" />
        </Link>
      </div>
    </div>
  );
}

interface OrganizationItem {
  organization: {
    bio?: string | null;
    city?: string | null;
    id: string;
    isOfficial?: boolean;
    logoUrl?: string | null;
    name: string;
    slug: string;
    state?: string | null;
  };
  role: string;
}

function EmptyOrganizationsCard() {
  return (
    <div className="border-border bg-muted/10 space-y-2 rounded-xl border border-dashed p-6 text-center">
      <Building2 className="text-muted-foreground mx-auto size-6" />
      <p className="text-foreground text-sm font-semibold">
        No organizations registered yet
      </p>
      <p className="text-muted-foreground mx-auto max-w-sm text-xs">
        Create your club or organization (like Official RallyCasts) to host
        tournaments, seed brackets, and assign court live streams.
      </p>
      <Link
        className={cn(
          buttonVariants({ size: "sm" }),
          "mt-2 cursor-pointer rounded-lg text-xs font-semibold transition-transform duration-150 ease-out active:scale-97"
        )}
        to="/events/hosts/new"
      >
        <Plus className="mr-1 size-3.5" />
        Register Organization
      </Link>
    </div>
  );
}

function OrganizationsSection({
  isLoading,
  myOrgs,
}: {
  isLoading: boolean;
  myOrgs: OrganizationItem[];
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="text-primary size-5" />
          <h2 className="text-foreground text-lg font-bold tracking-tight">
            My Organizations & Clubs
          </h2>
          {myOrgs.length > 0 && (
            <span className="bg-primary/10 text-primary rounded-md px-2 py-0.5 text-[10px] font-bold">
              {myOrgs.length} active
            </span>
          )}
        </div>
        <Link
          className={cn(
            buttonVariants({ size: "sm", variant: "outline" }),
            "cursor-pointer rounded-lg text-xs font-semibold transition-transform duration-150 ease-out active:scale-97"
          )}
          to="/events/hosts/new"
        >
          <Plus className="size-3.5" />
          Create Organization
        </Link>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="border-border/60 bg-muted/40 h-32 animate-pulse rounded-xl border" />
        </div>
      )}

      {!isLoading && myOrgs.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {myOrgs.map(({ organization: org, role }) => (
            <OrganizationCard key={org.id} org={org} role={role} />
          ))}
        </div>
      )}

      {!isLoading && myOrgs.length === 0 && <EmptyOrganizationsCard />}
    </section>
  );
}
