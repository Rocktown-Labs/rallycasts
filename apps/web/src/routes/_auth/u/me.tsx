import { Button, buttonVariants } from "@rallycaststv/ui/components/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rallycaststv/ui/components/card";
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
  Sparkles,
  Trophy,
  UploadCloud,
  UserPlus,
  Users,
  Video,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

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
    <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-linear-to-b from-card via-card/90 to-card/60 p-6 sm:p-8 shadow-md">
      <div className="pointer-events-none absolute -right-16 -top-16 size-72 rounded-full bg-primary/10 blur-3xl" />

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
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 animate-in fade-in duration-300">
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

      <ActionTiles />

      <PlacesAroundMeSection
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

function PlacesAroundMeSection({
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
  venues: ReturnType<typeof useTrending> extends {
    data?: { venues?: infer V };
  }
    ? NonNullable<V>
    : [];
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Flame className="size-5 text-primary" />
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Places Around Me (Within 50 Miles)
          </h2>
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
            {venues.length} venues found
          </span>
        </div>
        <Link
          className={cn(
            buttonVariants({ size: "sm", variant: "outline" }),
            "rounded-lg text-xs gap-1 font-semibold"
          )}
          to="/trending"
        >
          <span>View Interactive Map</span>
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <VenuesGrid
        effectiveLocationLabel={effectiveLocationLabel}
        homeCourtName={homeCourtName}
        isLoading={isLoading}
        onOpenCityPicker={onOpenCityPicker}
        venues={venues}
      />
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
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/10 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary p-2 text-primary-foreground">
          <Compass className="size-5 animate-pulse" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-primary">
            ✈️ Trip Planning Mode Active
          </p>
          <p className="text-sm font-semibold text-foreground">
            Showing courts, tournaments, and players for{" "}
            <span className="underline decoration-primary">
              {browsingLocationLabel}
            </span>
          </p>
        </div>
      </div>
      <Button
        className="rounded-lg gap-1.5 text-xs font-semibold cursor-pointer"
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
          <span className="rounded-full bg-primary/15 border border-primary/30 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-primary">
            Player Hub
          </span>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            Tier:{" "}
            <strong className="text-foreground capitalize">
              {accountTier}
            </strong>
          </span>
          {skillLevel && (
            <span className="rounded-full bg-brand-yellow/15 border border-brand-yellow/30 px-2.5 py-0.5 text-xs font-semibold text-amber-500 dark:text-brand-yellow flex items-center gap-1">
              <Award className="size-3" />
              {skillLevel}
            </span>
          )}
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          Welcome, {userName}!
        </h1>

        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs sm:text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <MapPin className="size-4 text-primary shrink-0" />
            Home: {homeCourtName} ({homeLocationLabel})
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <Globe className="size-3.5 text-muted-foreground shrink-0" />
            Browsing Area:{" "}
            <strong className="text-foreground">
              {effectiveLocationLabel}
            </strong>
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          className="rounded-xl border-border bg-background/60 backdrop-blur-xs gap-1.5 text-xs font-semibold cursor-pointer hover:border-primary/40"
          onClick={onTogglePicker}
          size="sm"
          variant="outline"
        >
          <Compass className="size-3.5 text-primary" />
          {isPickerOpen
            ? "Close Destination Picker"
            : "Plan a Trip / Change City"}
        </Button>
        <Link to="/u/studio">
          <Button
            className="rounded-xl gap-1.5 bg-primary text-primary-foreground font-bold shadow-xs hover:bg-primary/90 cursor-pointer"
            size="sm"
          >
            <UploadCloud className="size-4" />
            Record Match
          </Button>
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
    <div className="mt-6 border-t border-border/60 pt-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <Navigation className="size-4 text-primary" />
            Travel & Trip Planning
          </h3>
          <p className="text-xs text-muted-foreground">
            Check out courts, upcoming brackets, and local players anywhere in
            the US before you travel.
          </p>
        </div>
        {isBrowsing && (
          <button
            className="text-xs text-primary hover:underline font-semibold cursor-pointer"
            onClick={onResetLocation}
            type="button"
          >
            Reset to Current Location
          </button>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
        <input
          aria-label="Search destination city, state, or park"
          className="h-9 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-xs font-medium placeholder:text-muted-foreground outline-none focus-visible:border-primary"
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search city, state, or park (e.g. New York, Dallas, Crestwood)..."
          type="text"
          value={citySearchQuery}
        />
        {isSearchingPlaces && (
          <Loader2 className="absolute right-3 top-2.5 size-4 animate-spin text-primary" />
        )}
      </div>

      {citySearchQuery.trim().length >= 3 && placeSuggestions.length > 0 && (
        <div className="rounded-xl border border-border bg-popover text-popover-foreground shadow-lg divide-y divide-border/40 max-h-48 overflow-y-auto max-w-md">
          {placeSuggestions.map((suggestion) => (
            <button
              className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-muted/70 flex items-center justify-between gap-2 cursor-pointer transition-colors"
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
                <p className="font-bold text-foreground truncate">
                  {suggestion.addressLabel}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {suggestion.formattedAddress}
                </p>
              </div>
              <span className="text-[10px] font-bold text-primary shrink-0 rounded bg-primary/10 px-2 py-0.5">
                Explore
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Popular Pickleball Hotspots
        </p>
        <div className="flex flex-wrap gap-2">
          {POPULAR_DESTINATIONS.map((dest) => (
            <button
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-background px-3 py-1.5 text-xs font-medium hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer"
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

function ActionTiles() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Link className="group" to="/u/studio">
        <Card className="h-full rounded-xl border border-border/80 bg-card/60 transition-all hover:border-primary/50 hover:bg-card hover:shadow-md cursor-pointer">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between">
              <div className="rounded-lg bg-primary/10 p-2.5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Video className="size-5" />
              </div>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                Studio
              </span>
            </div>
            <CardTitle className="pt-2 text-base font-bold group-hover:text-primary transition-colors">
              Record & Upload
            </CardTitle>
            <CardDescription className="text-xs">
              Upload raw match footage, tag players, and get AI highlight reels.
            </CardDescription>
          </CardHeader>
        </Card>
      </Link>

      <Link className="group" to="/trending">
        <Card className="h-full rounded-xl border border-border/80 bg-card/60 transition-all hover:border-primary/50 hover:bg-card hover:shadow-md cursor-pointer">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between">
              <div className="rounded-lg bg-emerald-500/10 p-2.5 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                <MapPin className="size-5" />
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                50 Miles
              </span>
            </div>
            <CardTitle className="pt-2 text-base font-bold group-hover:text-emerald-500 transition-colors">
              Find Local Courts
            </CardTitle>
            <CardDescription className="text-xs">
              Explore dedicated pickleball parks, court counts, lighting, and
              maps.
            </CardDescription>
          </CardHeader>
        </Card>
      </Link>

      <Link className="group" to="/events">
        <Card className="h-full rounded-xl border border-border/80 bg-card/60 transition-all hover:border-primary/50 hover:bg-card hover:shadow-md cursor-pointer">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between">
              <div className="rounded-lg bg-amber-500/10 p-2.5 text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                <Trophy className="size-5" />
              </div>
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-500">
                Events
              </span>
            </div>
            <CardTitle className="pt-2 text-base font-bold group-hover:text-amber-500 transition-colors">
              Tournaments & Play
            </CardTitle>
            <CardDescription className="text-xs">
              Register for open play sessions, round robins, and tournament
              brackets.
            </CardDescription>
          </CardHeader>
        </Card>
      </Link>

      <Link className="group" to="/players">
        <Card className="h-full rounded-xl border border-border/80 bg-card/60 transition-all hover:border-primary/50 hover:bg-card hover:shadow-md cursor-pointer">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between">
              <div className="rounded-lg bg-indigo-500/10 p-2.5 text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                <Users className="size-5" />
              </div>
              <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-500">
                Community
              </span>
            </div>
            <CardTitle className="pt-2 text-base font-bold group-hover:text-indigo-500 transition-colors">
              Discover Players
            </CardTitle>
            <CardDescription className="text-xs">
              Connect with local players matched to your skill rating and court.
            </CardDescription>
          </CardHeader>
        </Card>
      </Link>
    </div>
  );
}

interface VenuesGridProps {
  effectiveLocationLabel: string;
  homeCourtName: string;
  isLoading: boolean;
  onOpenCityPicker: () => void;
  venues: {
    address?: string | null;
    addressLine1?: string | null;
    city?: string | null;
    courtCount?: number | null;
    distanceMiles?: number | null;
    externalUrl?: string;
    id: string;
    name: string;
    rating?: number | null;
    state?: string | null;
  }[];
}

function VenuesGrid({
  effectiveLocationLabel,
  homeCourtName,
  isLoading,
  onOpenCityPicker,
  venues,
}: VenuesGridProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((idx) => (
          <div
            className="h-44 animate-pulse rounded-xl border border-border/60 bg-muted/40"
            key={idx}
          />
        ))}
      </div>
    );
  }

  if (venues.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-3 bg-muted/10">
        <MapPin className="size-8 text-muted-foreground mx-auto" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">
            No venues found within 50 miles of {effectiveLocationLabel}
          </p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Try switching destination cities with the Trip Planner or searching
            nearby municipalities.
          </p>
        </div>
        <Button
          className="rounded-lg text-xs font-semibold"
          onClick={onOpenCityPicker}
          size="sm"
          variant="outline"
        >
          Search Another City
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {venues.slice(0, 6).map((venue) => {
        const isHomeCourt =
          Boolean(homeCourtName && homeCourtName !== "Local Court") &&
          venue.name.toLowerCase().includes(homeCourtName.toLowerCase());
        const venueAddress =
          ("addressLine1" in venue &&
            typeof venue.addressLine1 === "string" &&
            venue.addressLine1) ||
          ("address" in venue &&
            typeof venue.address === "string" &&
            venue.address) ||
          venue.name;
        const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
          venueAddress
        )}`;

        return (
          <div
            className={cn(
              "relative flex flex-col justify-between rounded-xl border bg-card p-5 shadow-xs transition-all hover:border-primary/40 hover:shadow-md",
              isHomeCourt
                ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                : "border-border/80"
            )}
            key={venue.id}
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  {isHomeCourt && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary uppercase tracking-wider mb-1">
                      <Sparkles className="size-3 text-brand-yellow" />
                      Your Home Court
                    </span>
                  )}
                  <h3 className="font-bold text-base text-foreground truncate">
                    {venue.name}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {[venue.city, venue.state].filter(Boolean).join(", ")}
                  </p>
                </div>
                {venue.distanceMiles !== undefined &&
                venue.distanceMiles !== null ? (
                  <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-foreground">
                    {venue.distanceMiles.toFixed(
                      venue.distanceMiles < 10 ? 1 : 0
                    )}{" "}
                    mi
                  </span>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-muted-foreground">
                <span className="rounded bg-muted/60 px-2 py-0.5 font-medium">
                  🎾 {venue.courtCount ?? 6} Courts
                </span>
                {venue.rating && (
                  <span className="rounded bg-amber-500/10 px-2 py-0.5 font-semibold text-amber-500">
                    ⭐ {venue.rating.toFixed(1)}
                  </span>
                )}
                <span className="rounded bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-600 dark:text-emerald-400">
                  Pickleball Ready
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-border/40 mt-4">
              <a
                className={cn(
                  buttonVariants({ size: "sm", variant: "outline" }),
                  "flex-1 text-xs gap-1.5 rounded-lg"
                )}
                href={mapsUrl}
                rel="noopener"
                target="_blank"
              >
                <Navigation className="size-3 text-primary" />
                Directions
              </a>
              {"externalUrl" in venue &&
              typeof venue.externalUrl === "string" &&
              venue.externalUrl ? (
                <a
                  className={cn(
                    buttonVariants({ size: "sm", variant: "ghost" }),
                    "text-xs px-2.5 rounded-lg"
                  )}
                  href={venue.externalUrl}
                  rel="noopener"
                  target="_blank"
                  title="Open external place link"
                >
                  <ExternalLink className="size-3.5 text-muted-foreground" />
                </a>
              ) : (
                <Link
                  className={cn(
                    buttonVariants({ size: "sm", variant: "ghost" }),
                    "text-xs px-2.5 rounded-lg"
                  )}
                  params={{ id: venue.id }}
                  to="/venues/$id"
                >
                  <ArrowRight className="size-3.5 text-primary" />
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
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
          <Calendar className="size-5 text-primary" />
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Upcoming Tournaments
          </h2>
        </div>
        <Link
          className="text-xs font-semibold text-primary hover:underline"
          to="/events"
        >
          View all brackets →
        </Link>
      </div>

      {events.length > 0 ? (
        <div className="space-y-3">
          {events.map((event) => (
            <div
              className="flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-card p-4 shadow-xs transition-all hover:border-primary/40"
              key={event.id}
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary capitalize">
                    {event.eventType || "Tournament"}
                  </span>
                  {"bracketType" in event &&
                  typeof event.bracketType === "string" ? (
                    <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground capitalize">
                      {(event.bracketType as string).replace("_", " ")}
                    </span>
                  ) : null}
                </div>
                <p className="font-bold text-sm text-foreground truncate">
                  {event.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Starts:{" "}
                  {new Date(event.startsAt).toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "short",
                  })}
                </p>
              </div>
              <Link params={{ id: event.id }} to="/events/$id">
                <Button
                  className="rounded-lg text-xs shrink-0 cursor-pointer font-semibold"
                  size="sm"
                  variant="outline"
                >
                  View Bracket
                </Button>
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border/60 bg-muted/20 p-6 text-center space-y-2">
          <Trophy className="size-6 text-muted-foreground mx-auto" />
          <p className="text-xs font-medium text-muted-foreground">
            No active tournaments scheduled in this radius right now.
          </p>
          <Link to="/events">
            <Button className="text-xs text-primary" size="sm" variant="ghost">
              Browse State Events
            </Button>
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
          <Users className="size-5 text-primary" />
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Players in Your Area
          </h2>
        </div>
        <Link
          className="text-xs font-semibold text-primary hover:underline"
          to="/players"
        >
          Explore directory →
        </Link>
      </div>

      {players.length > 0 ? (
        <div className="space-y-3">
          {players.map((player) => (
            <div
              className="flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-card p-3.5 shadow-xs transition-all hover:border-primary/40"
              key={player.id}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-sm shrink-0 overflow-hidden">
                  {player.image ? (
                    <img
                      alt={player.name}
                      className="size-full rounded-full object-cover"
                      src={player.image}
                    />
                  ) : (
                    player.name?.slice(0, 2).toUpperCase() || "PB"
                  )}
                </div>
                <div className="min-w-0 space-y-0.5">
                  <p className="font-bold text-sm text-foreground truncate">
                    {player.name}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {player.skillLevel && (
                      <span className="font-semibold text-primary capitalize">
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
                className="rounded-lg text-xs gap-1 shrink-0 cursor-pointer font-semibold"
                onClick={() => onConnect(player.id, player.name)}
                size="sm"
                variant="outline"
              >
                <UserPlus className="size-3.5 text-primary" />
                Connect
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border/60 bg-muted/20 p-6 text-center space-y-2">
          <Users className="size-6 text-muted-foreground mx-auto" />
          <p className="text-xs font-medium text-muted-foreground">
            No other players registered nearby yet.
          </p>
          <Link to="/players">
            <Button className="text-xs text-primary" size="sm" variant="ghost">
              Browse All Players
            </Button>
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
          <Activity className="size-5 text-primary" />
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Your Pickleball Friends ({friends.length})
          </h2>
        </div>
        <Link
          className="text-xs font-semibold text-primary hover:underline"
          to="/u/messages"
        >
          Open chat →
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {friends.map((friend) => (
          <div
            className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card p-3 shadow-xs"
            key={friend.id}
          >
            <div className="min-w-0">
              <p className="font-bold text-xs text-foreground truncate">
                {friend.name}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                @{friend.username || "player"}
              </p>
            </div>
            <Link to="/u/messages">
              <Button className="rounded-lg" size="icon-sm" variant="ghost">
                <MessageSquare className="size-4 text-primary" />
              </Button>
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
    <div className="flex flex-col justify-between rounded-xl border border-border/80 bg-card p-5 shadow-xs transition-all hover:border-primary/40 hover:shadow-md">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              {org.isOfficial && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary uppercase tracking-wider">
                  <ShieldCheck className="size-3 text-primary" />
                  Official Org
                </span>
              )}
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground uppercase">
                {role}
              </span>
            </div>
            <h3 className="font-bold text-base text-foreground truncate">
              {org.name}
            </h3>
            <p className="text-xs text-muted-foreground truncate">
              {[org.city, org.state].filter(Boolean).join(", ") || "Nationwide"}
            </p>
          </div>
        </div>
        {org.bio && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {org.bio}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 pt-4 border-t border-border/40 mt-4">
        <Link
          className={cn(
            buttonVariants({ size: "sm" }),
            "flex-1 text-xs gap-1.5 rounded-lg bg-primary text-primary-foreground font-semibold"
          )}
          params={{ slug: org.slug }}
          to="/organizers/$slug/manage"
        >
          <span>Manage & Host</span>
          <ArrowRight className="size-3" />
        </Link>
        <Link
          className={cn(
            buttonVariants({ size: "sm", variant: "outline" }),
            "text-xs px-2.5 rounded-lg"
          )}
          params={{ slug: org.slug }}
          to="/organizers/$slug"
        >
          <ExternalLink className="size-3 text-muted-foreground" />
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
    <div className="rounded-xl border border-dashed border-border p-6 text-center space-y-2 bg-muted/10">
      <Building2 className="size-6 text-muted-foreground mx-auto" />
      <p className="text-sm font-semibold text-foreground">
        No organizations registered yet
      </p>
      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
        Create your club or organization (like Official RallyCasts) to host
        tournaments, seed brackets, and assign court live streams.
      </p>
      <Link to="/events/hosts/new">
        <Button className="mt-2 text-xs font-semibold" size="sm">
          <Plus className="size-3.5 mr-1" />
          Register Organization
        </Button>
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
          <Building2 className="size-5 text-primary" />
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            My Organizations & Clubs
          </h2>
          {myOrgs.length > 0 && (
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
              {myOrgs.length} active
            </span>
          )}
        </div>
        <Link to="/events/hosts/new">
          <Button
            className="rounded-lg text-xs gap-1.5 font-semibold cursor-pointer"
            size="sm"
            variant="outline"
          >
            <Plus className="size-3.5" />
            Create Organization
          </Button>
        </Link>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-32 animate-pulse rounded-xl border border-border/60 bg-muted/40" />
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
