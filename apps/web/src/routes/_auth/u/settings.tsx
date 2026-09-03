/* eslint-disable complexity */
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
import { debounce } from "@tanstack/pacer";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle,
  MapPin,
  Save,
  Search,
  Settings,
  Sparkles,
  User,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
import { mapGooglePlaceToCourtSuggestion } from "@/lib/google-places";
import type { CourtSuggestion } from "@/lib/google-places";
import { usePlaceSearch, useProfile, useUpdateProfile } from "@/lib/hooks";
import type { ProfilePayload } from "@/lib/hooks";

export const Route = createFileRoute("/_auth/u/settings")({
  component: SettingsPage,
});

type SkillLevel = NonNullable<ProfilePayload["skillLevel"]>;

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
    skillLevel?: "advanced" | "beginner" | "intermediate" | "pro" | null;
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
    skillLevel: "intermediate" as SkillLevel,
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
    defaults.skillLevel = p.skillLevel || "intermediate";
  }

  return defaults;
};

export function ProfileEditorPage({
  showHeader = true,
  submitLabel = "Save Settings",
  title = "Settings",
  subtitle = "Configure your personal details, public profile, home court, and roles.",
}: {
  showHeader?: boolean;
  subtitle?: string;
  submitLabel?: string;
  title?: string;
}) {
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
    skillLevel: "intermediate" as
      | "advanced"
      | "beginner"
      | "intermediate"
      | "pro",
    username: "",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameSuccess, setUsernameSuccess] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const { data: placeSearchData, isFetching: isSearchingPlaces } =
    usePlaceSearch(searchQuery);
  const suggestions = useMemo(
    () => (placeSearchData?.places ?? []).map(mapGooglePlaceToCourtSuggestion),
    [placeSearchData?.places]
  );

  // Debounced username check using TanStack Pacer
  const debouncedCheck = useMemo(
    () =>
      debounce(
        async (username: string) => {
          setIsCheckingUsername(true);
          setUsernameError(null);
          try {
            const res = await apiClient.api.v1.profile["check-username"].$get({
              query: { username },
            });
            if (res.ok) {
              const data = await res.json();
              if (data.available) {
                setUsernameSuccess(true);
              } else {
                setUsernameSuccess(false);
                setUsernameError("Username is already taken");
              }
            } else {
              setUsernameSuccess(false);
              setUsernameError("Failed to check username");
            }
          } catch {
            setUsernameSuccess(false);
            setUsernameError("Failed to check username");
          } finally {
            setIsCheckingUsername(false);
          }
        },
        { wait: 400 }
      ),
    []
  );

  useEffect(() => {
    const cleanUsername = form.username?.trim();
    const currentUsername = user?.username || user?.displayUsername;
    if (!cleanUsername || cleanUsername.length < 3) {
      setUsernameError(null);
      setUsernameSuccess(false);
      return;
    }

    if (currentUsername === cleanUsername) {
      setUsernameError(null);
      setUsernameSuccess(true);
      return;
    }

    debouncedCheck(cleanUsername);
  }, [form.username, user?.username, user?.displayUsername, debouncedCheck]);

  // Initialize form when profileData loads
  useEffect(() => {
    if (profileData) {
      setForm(getProfileFormDefaults(profileData));
    }
  }, [profileData]);

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

    // Full Name validation
    if (!form.name.trim()) {
      toast.error("Full Name is required");
      return;
    }

    // Username validation
    const usernameRegex = /^[a-zA-Z0-9_]+$/u;
    if (form.username && !usernameRegex.test(form.username)) {
      toast.error(
        "Username can only contain letters, numbers, and underscores"
      );
      return;
    }

    if (form.username && form.username.length < 3) {
      toast.error("Username must be at least 3 characters");
      return;
    }

    const currentUsername = user?.username || user?.displayUsername;
    if (
      form.username &&
      form.username.trim() !== currentUsername &&
      !usernameSuccess
    ) {
      toast.error("Please resolve username availability before saving");
      return;
    }

    const payload: ProfilePayload = {
      bio: form.bio,
      homeCity: form.homeCity || undefined,
      homeCourtName: form.homeCourtName || undefined,
      homeState: form.homeState || undefined,
      isCaster: form.isCaster,
      isOrganizer: form.isOrganizer,
      isPlayer: form.isPlayer,
      name: form.name.trim(),
      radarPlaceId: form.radarPlaceId || undefined,
      skillLevel: form.skillLevel,
    };

    if (form.username.trim()) {
      payload.username = form.username.trim();
    }

    if (form.homeLatitude !== 0) {
      payload.homeLatitude = form.homeLatitude;
    }
    if (form.homeLongitude !== 0) {
      payload.homeLongitude = form.homeLongitude;
    }

    updateProfile.mutate(payload, {
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
      {showHeader ? (
        <div className="flex items-center gap-3 border-b border-border/60 pb-5">
          <Settings className="size-8 text-primary" />
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          </div>
        </div>
      ) : null}

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
                  className="rounded-md bg-muted/20 border-border/80"
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
                  className="rounded-md bg-muted/20 border-border/80"
                />
                {isCheckingUsername && (
                  <p className="text-xs text-muted-foreground px-2 animate-pulse mt-1">
                    Checking availability...
                  </p>
                )}
                {usernameError && (
                  <p className="text-xs text-destructive px-2 mt-1">
                    {usernameError}
                  </p>
                )}
                {usernameSuccess &&
                  form.username !== (user?.username || user?.displayUsername) &&
                  !usernameError && (
                    <p className="text-xs text-emerald-600 flex items-center gap-1 px-2 mt-1">
                      <CheckCircle className="size-3" /> Available
                    </p>
                  )}
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
                  className="pl-9 rounded-md bg-muted/20 border-border/80"
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
                  className="rounded-md bg-muted/20 border-border/80"
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
                  className="rounded-md bg-muted/20 border-border/80"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card/40 backdrop-blur-sm rounded-xl overflow-hidden shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="size-5 text-primary" /> Rating
            </CardTitle>
            <CardDescription className="text-xs">
              Pick the closest DUPR-style range for matchmaking and challenge
              context.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["beginner", "Beginner", "2.5 and below"],
                ["intermediate", "Intermediate", "3.0 - 3.5"],
                ["advanced", "Advanced", "4.0 - 4.5"],
                ["pro", "Pro", "5.0+"],
              ].map(([value, label, description]) => (
                <button
                  className={`rounded-lg border p-4 text-left transition-colors ${
                    form.skillLevel === value
                      ? "border-primary bg-primary/10"
                      : "border-border bg-muted/5 hover:border-primary/40"
                  }`}
                  key={value}
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      skillLevel: value as
                        | "advanced"
                        | "beginner"
                        | "intermediate"
                        | "pro",
                    }))
                  }
                  type="button"
                >
                  <span className="block text-sm font-bold">{label}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {description}
                  </span>
                </button>
              ))}
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
            className="bg-primary text-brand-yellow font-bold hover:bg-primary/95 rounded-md px-6 gap-2"
          >
            <Save className="size-4" />
            {updateProfile.isPending ? "Saving..." : submitLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}

function SettingsPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3 border-b border-border/60 pb-5">
        <Settings className="size-8 text-primary" />
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Account preferences live here. Edit your public player profile from
            Profile.
          </p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-lg">Public profile</CardTitle>
            <CardDescription>
              Name, handle, bio, home court, rating, and roles.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/u/profile">
              <Button className="rounded-lg">Edit profile</Button>
            </Link>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-lg">Account settings</CardTitle>
            <CardDescription>
              More notification, privacy, billing, and login controls will live
              here as they come online.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="rounded-lg" disabled variant="outline">
              Coming soon
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
