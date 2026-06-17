import { Button } from "@rallycaststv/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rallycaststv/ui/components/card";
import { Checkbox } from "@rallycaststv/ui/components/checkbox";
import { Input } from "@rallycaststv/ui/components/input";
import { Label } from "@rallycaststv/ui/components/label";
import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle,
  MapPin,
  Save,
  Search,
  Settings,
  Sparkles,
  User,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
import { useProfile, useUpdateProfile } from "@/lib/hooks";
import { readApiJson } from "@/lib/hooks/api";

export const Route = createFileRoute("/_auth/u/settings")({
  component: SettingsPage,
});

// Simple debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

interface GooglePlaceSuggestion {
  address: string;
  latitude: number;
  longitude: number;
  name: string;
  placeId: string;
}

interface CourtSuggestion {
  addressLabel: string;
  city: string;
  countryCode: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  placeId?: string;
  source: "google_places";
  stateCode: string;
}

const parsePlaceCityState = (address: string) => {
  const parts = address.split(",").map((s) => s.trim());
  if (parts.length >= 3) {
    const stateZip = parts.at(-2)?.split(" ") || [];
    const [state] = stateZip;
    const city = parts.at(-3) || "Unknown";
    return { city, state: state || "US" };
  }
  return { city: "Unknown", state: "US" };
};

const mapGooglePlaceToCourtSuggestion = (
  place: GooglePlaceSuggestion
): CourtSuggestion => {
  const location = parsePlaceCityState(place.address);
  return {
    addressLabel: place.name,
    city: location.city,
    countryCode: "US",
    formattedAddress: place.address,
    latitude: place.latitude,
    longitude: place.longitude,
    placeId: place.placeId,
    source: "google_places" as const,
    stateCode: location.state,
  };
};

interface ProfileData {
  profile?: {
    bio?: string | null;
    homeCity?: string | null;
    homeCourtName?: string | null;
    homeLatitude?: number | null;
    homeLongitude?: number | null;
    homeState?: string | null;
    isCaster?: boolean;
    isOrganizer?: boolean;
    isPlayer?: boolean;
    radarPlaceId?: string | null;
  } | null;
  user?: {
    displayUsername?: string | null;
    name?: string | null;
    username?: string | null;
  } | null;
}

const getProfileFormDefaults = (data: ProfileData | undefined) => {
  const defaults = {
    bio: "",
    homeCity: "",
    homeCourtName: "",
    homeLatitude: 0,
    homeLongitude: 0,
    homeState: "",
    isCaster: false,
    isOrganizer: false,
    isPlayer: true,
    name: "",
    radarPlaceId: "",
    username: "",
  };

  if (!data) {
    return defaults;
  }

  const u = data.user;
  const p = data.profile;

  if (u) {
    defaults.name = u.name || "";
    defaults.username = u.username || u.displayUsername || "";
  }

  if (p) {
    defaults.bio = p.bio || "";
    defaults.homeCity = p.homeCity || "";
    defaults.homeCourtName = p.homeCourtName || "";
    defaults.homeLatitude = p.homeLatitude || 0;
    defaults.homeLongitude = p.homeLongitude || 0;
    defaults.homeState = p.homeState || "";
    defaults.isCaster = !!p.isCaster;
    defaults.isOrganizer = !!p.isOrganizer;
    defaults.isPlayer = p.isPlayer !== false;
    defaults.radarPlaceId = p.radarPlaceId || "";
  }

  return defaults;
};

function SettingsPage() {
  const { data: profileData, refetch } = useProfile();
  const updateProfile = useUpdateProfile();

  const user = profileData?.user;

  const [form, setForm] = useState({
    bio: "",
    homeCity: "",
    homeCourtName: "",
    homeLatitude: 0,
    homeLongitude: 0,
    homeState: "",
    isCaster: false,
    isOrganizer: false,
    isPlayer: true,
    name: "",
    radarPlaceId: "",
    username: "",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<CourtSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);

  const debouncedQuery = useDebounce(searchQuery, 400);

  // Initialize form when profileData loads
  useEffect(() => {
    if (profileData) {
      setForm(getProfileFormDefaults(profileData));
    }
  }, [profileData]);

  // Load Google Places suggestions
  useEffect(() => {
    if (debouncedQuery.length < 3) {
      setSuggestions([]);
      return;
    }

    let active = true;
    setIsSearchingPlaces(true);

    const fetchGoogleSuggestions = async () => {
      try {
        const result = await readApiJson<{ places: GooglePlaceSuggestion[] }>(
          apiClient.api.places.search.$get({
            query: {
              q: debouncedQuery,
            },
          }) as Promise<{
            json: () => Promise<{ places: GooglePlaceSuggestion[] }>;
            ok: boolean;
            status: number;
            statusText: string;
          }>
        );
        if (active) {
          setSuggestions(result.places.map(mapGooglePlaceToCourtSuggestion));
        }
      } catch (error) {
        console.error("Error fetching places suggestions", error);
      } finally {
        if (active) {
          setIsSearchingPlaces(false);
        }
      }
    };

    fetchGoogleSuggestions();

    return () => {
      active = false;
    };
  }, [debouncedQuery]);

  const selectAddress = (addr: CourtSuggestion) => {
    setForm((prev) => ({
      ...prev,
      homeCity: addr.city || "Unknown",
      homeCourtName: addr.addressLabel || addr.formattedAddress || "Unknown",
      homeLatitude: addr.latitude,
      homeLongitude: addr.longitude,
      homeState: addr.stateCode || "US",
      radarPlaceId: addr.placeId ?? "",
    }));
    setSearchQuery("");
    setShowDropdown(false);
    toast.success(`Home venue updated to: ${addr.addressLabel}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Username validation
    const usernameRegex = /^[a-zA-Z0-9_]+$/u;
    if (form.username && !usernameRegex.test(form.username)) {
      toast.error(
        "Username can only contain letters, numbers, and underscores"
      );
      return;
    }

    updateProfile.mutate(form, {
      onError: (err: unknown) => {
        const message =
          err instanceof Error ? err.message : "Failed to update profile";
        toast.error(message);
      },
      onSuccess: () => {
        toast.success("Profile updated successfully!");
        refetch();
      },
    });
  };

  let dropdownContent = null;
  if (isSearchingPlaces) {
    dropdownContent = (
      <div className="p-4 text-xs text-muted-foreground text-center animate-pulse">
        Searching venues...
      </div>
    );
  } else if (suggestions.length === 0) {
    dropdownContent = (
      <div className="p-3 text-xs text-muted-foreground text-center">
        No matches found.
      </div>
    );
  } else {
    dropdownContent = (
      <div className="py-1">
        {suggestions.map((addr, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => selectAddress(addr)}
            className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-center gap-2 border-b border-border/50 last:border-0"
          >
            <MapPin className="size-4 text-primary shrink-0" />
            <div>
              <span className="font-semibold block text-xs sm:text-sm">
                {addr.addressLabel || addr.formattedAddress.split(",")[0]}
              </span>
              <span className="text-[11px] text-muted-foreground block">
                {addr.formattedAddress}
              </span>
            </div>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border/60 pb-5">
        <Settings className="size-8 text-primary" />
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure your personal details, public profile, home court, and
            roles.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Public Profile Card */}
        <Card className="border border-border bg-card/40 backdrop-blur-sm rounded-xl overflow-hidden shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <User className="size-5 text-primary" /> Public Profile
            </CardTitle>
            <CardDescription className="text-xs">
              Manage your display name, unique handle, and short biography.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 border-b border-border/40 pb-4">
              <div className="size-16 rounded-full bg-muted flex items-center justify-center text-lg font-bold overflow-hidden border border-border">
                {user?.image ? (
                  <img
                    alt="Avatar"
                    className="size-full object-cover"
                    src={user.image}
                  />
                ) : (
                  user?.name?.at(0) || "@"
                )}
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {user?.name || "RallyCasts User"}
                </p>
                <p className="text-xs text-muted-foreground">
                  @{user?.username || "player"}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="settings-name">Full Name</Label>
                <Input
                  id="settings-name"
                  placeholder="e.g. John Doe"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="rounded-full bg-muted/20 border-border/80"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="settings-username">Username (@handle)</Label>
                <Input
                  id="settings-username"
                  placeholder="e.g. johndoe_dink"
                  value={form.username}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, username: e.target.value }))
                  }
                  className="rounded-full bg-muted/20 border-border/80"
                />
                <p className="text-[10px] text-muted-foreground px-2">
                  Allowed characters: letters, numbers, underscores. Must be
                  unique.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="settings-bio">Bio</Label>
              <textarea
                aria-label="Bio"
                id="settings-bio"
                placeholder="Tell the community about yourself, your play style, and local sessions..."
                value={form.bio}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, bio: e.target.value }))
                }
                className="min-h-24 w-full rounded-xl border border-border/80 bg-muted/20 px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-primary transition-all"
              />
            </div>
          </CardContent>
        </Card>

        {/* 2. Home Court & Location Card */}
        <Card className="border border-border bg-card/40 backdrop-blur-sm rounded-xl overflow-hidden shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <MapPin className="size-5 text-primary" /> Home Court & Location
            </CardTitle>
            <CardDescription className="text-xs">
              Search Google Places to find and pin your primary court location.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Search google places */}
            <div className="relative space-y-2">
              <Label htmlFor="venue-places-search">
                Search Home Court (Google Places)
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input
                  id="venue-places-search"
                  placeholder="Type court name or location, e.g. Crestwood Park..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  className="pl-9 rounded-full bg-muted/20 border-border/80"
                />
              </div>

              {/* suggestions list */}
              {showDropdown &&
                (searchQuery.length >= 3 || isSearchingPlaces) && (
                  <div className="absolute z-20 w-full mt-1 bg-popover border border-border rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {dropdownContent}
                  </div>
                )}
            </div>

            {/* Selected court display */}
            {form.homeCourtName && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
                <CheckCircle className="size-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase text-primary tracking-wider">
                    Pinned Home Venue
                  </p>
                  <p className="text-sm font-bold">{form.homeCourtName}</p>
                  <p className="text-xs text-muted-foreground">
                    {form.homeCity}, {form.homeState} (ID:{" "}
                    {form.radarPlaceId || "custom"})
                  </p>
                </div>
              </div>
            )}

            {/* Manual City/State override if they want */}
            <div className="grid gap-4 md:grid-cols-2 pt-2 border-t border-border/40">
              <div className="space-y-2">
                <Label htmlFor="settings-city">Override Home City</Label>
                <Input
                  id="settings-city"
                  placeholder="e.g. Austin"
                  value={form.homeCity}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, homeCity: e.target.value }))
                  }
                  className="rounded-full bg-muted/20 border-border/80"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="settings-state">Override Home State</Label>
                <Input
                  id="settings-state"
                  placeholder="e.g. TX"
                  value={form.homeState}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, homeState: e.target.value }))
                  }
                  className="rounded-full bg-muted/20 border-border/80"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Community Roles Card */}
        <Card className="border border-border bg-card/40 backdrop-blur-sm rounded-xl overflow-hidden shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="size-5 text-primary" /> Community Roles
            </CardTitle>
            <CardDescription className="text-xs">
              Select which parts of the pickleball community you participate in.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Player role */}
            <div className="flex items-start gap-3 rounded-lg border border-border/40 bg-muted/5 p-4">
              <Checkbox
                id="role-player"
                checked={form.isPlayer}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, isPlayer: !!checked }))
                }
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="role-player"
                  className="font-semibold cursor-pointer"
                >
                  Player profile
                </Label>
                <p className="text-xs text-muted-foreground">
                  You play games, request recordings, track your local ratings,
                  and challenge players.
                </p>
              </div>
            </div>

            {/* Organizer role */}
            <div className="flex items-start gap-3 rounded-lg border border-border/40 bg-muted/5 p-4">
              <Checkbox
                id="role-organizer"
                checked={form.isOrganizer}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, isOrganizer: !!checked }))
                }
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="role-organizer"
                  className="font-semibold cursor-pointer"
                >
                  Organizer tools
                </Label>
                <p className="text-xs text-muted-foreground">
                  You manage leagues, venues, host tournaments, publish
                  brackets, and request professional recording coverage.
                </p>
              </div>
            </div>

            {/* Caster role */}
            <div className="flex items-start gap-3 rounded-lg border border-border/40 bg-muted/5 p-4">
              <Checkbox
                id="role-caster"
                checked={form.isCaster}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, isCaster: !!checked }))
                }
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="role-caster"
                  className="font-semibold cursor-pointer"
                >
                  Caster tools
                </Label>
                <p className="text-xs text-muted-foreground">
                  You stream, record commentary, analyze matches, and publish
                  featured content on the platform.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="submit"
            disabled={updateProfile.isPending}
            className="bg-primary text-brand-yellow font-bold hover:bg-primary/95 rounded-full px-6 gap-2"
          >
            <Save className="size-4" />
            {updateProfile.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}
