/* eslint-disable complexity -- the profile editor form predates the limit; split pending */
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bot,
  Check,
  CheckCircle,
  Copy,
  LoaderCircle,
  MapPin,
  Plus,
  Save,
  Search,
  Settings,
  Sparkles,
  Trash2,
  User,
  X,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import LinkedAccounts from "@/components/auth/linked-accounts";
import { ProfilePreview } from "@/components/profile/profile-preview";
import { apiClient } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
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
      <div className="text-muted-foreground animate-pulse p-4 text-center text-xs">
        Searching venues...
      </div>
    );
  } else if (suggestions.length === 0) {
    dropdownContent = (
      <div className="text-muted-foreground p-3 text-center text-xs">
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
            className="hover:bg-muted border-border/50 flex w-full items-center gap-2 border-b px-4 py-2.5 text-left text-sm last:border-0"
          >
            <MapPin className="text-primary size-4 shrink-0" />
            <div>
              <span className="block text-xs font-semibold sm:text-sm">
                {addr.addressLabel || addr.formattedAddress.split(",")[0]}
              </span>
              <span className="text-muted-foreground block text-[11px]">
                {addr.formattedAddress}
              </span>
            </div>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="animate-in fade-in mx-auto max-w-4xl space-y-8 duration-300">
      {showHeader ? (
        <div className="border-border/60 flex items-center gap-3 border-b pb-5">
          <Settings className="text-primary size-8" />
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
            <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Public Profile Card */}
        <Card className="border-border bg-card/40 overflow-hidden rounded-xl border shadow-sm backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <User className="text-primary size-5" /> Public Profile
            </CardTitle>
            <CardDescription className="text-xs">
              Manage your display name, unique handle, and short biography.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-border/40 flex items-center gap-4 border-b pb-4">
              <div className="bg-muted border-border flex size-16 items-center justify-center overflow-hidden rounded-full border text-lg font-bold">
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
                <p className="text-muted-foreground text-xs">
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
                  className="bg-muted/20 border-border/80 rounded-md"
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
                  className="bg-muted/20 border-border/80 rounded-md"
                />
                {isCheckingUsername && (
                  <p className="text-muted-foreground mt-1 animate-pulse px-2 text-xs">
                    Checking availability...
                  </p>
                )}
                {usernameError && (
                  <p className="text-destructive mt-1 px-2 text-xs">
                    {usernameError}
                  </p>
                )}
                {usernameSuccess &&
                  form.username !== (user?.username || user?.displayUsername) &&
                  !usernameError && (
                    <p className="mt-1 flex items-center gap-1 px-2 text-xs text-emerald-600">
                      <CheckCircle className="size-3" /> Available
                    </p>
                  )}
                <p className="text-muted-foreground px-2 text-[10px]">
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
                className="border-border/80 bg-muted/20 focus-visible:ring-ring focus-visible:border-primary min-h-24 w-full rounded-xl border px-3 py-2 text-sm transition-all outline-none focus-visible:ring-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* 2. Home Court & Location Card */}
        <Card className="border-border bg-card/40 overflow-hidden rounded-xl border shadow-sm backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <MapPin className="text-primary size-5" /> Home Court & Location
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
                <Search className="text-muted-foreground absolute top-3 left-3 size-4" />
                <Input
                  id="venue-places-search"
                  placeholder="Type court name or location, e.g. Crestwood Park..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  className="bg-muted/20 border-border/80 rounded-md pl-9"
                />
              </div>

              {/* suggestions list */}
              {showDropdown &&
                (searchQuery.length >= 3 || isSearchingPlaces) && (
                  <div className="bg-popover border-border absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border shadow-lg">
                    {dropdownContent}
                  </div>
                )}
            </div>

            {/* Selected court display */}
            {form.homeCourtName && (
              <div className="border-primary/20 bg-primary/5 flex items-start gap-3 rounded-xl border p-4">
                <CheckCircle className="text-primary mt-0.5 size-5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-primary text-xs font-semibold tracking-wider uppercase">
                    Pinned Home Venue
                  </p>
                  <p className="text-sm font-bold">{form.homeCourtName}</p>
                  <p className="text-muted-foreground text-xs">
                    {form.homeCity}, {form.homeState} (ID:{" "}
                    {form.radarPlaceId || "custom"})
                  </p>
                </div>
              </div>
            )}

            {/* Manual City/State override if they want */}
            <div className="border-border/40 grid gap-4 border-t pt-2 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="settings-city">Override Home City</Label>
                <Input
                  id="settings-city"
                  placeholder="e.g. Austin"
                  value={form.homeCity}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, homeCity: e.target.value }))
                  }
                  className="bg-muted/20 border-border/80 rounded-md"
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
                  className="bg-muted/20 border-border/80 rounded-md"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/40 overflow-hidden rounded-xl border shadow-sm backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <Sparkles className="text-primary size-5" /> Rating
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
                  <span className="text-muted-foreground mt-1 block text-xs">
                    {description}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 3. Community Roles Card */}
        <Card className="border-border bg-card/40 overflow-hidden rounded-xl border shadow-sm backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <Sparkles className="text-primary size-5" /> Community Roles
            </CardTitle>
            <CardDescription className="text-xs">
              Select which parts of the pickleball community you participate in.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Player role */}
            <div className="border-border/40 bg-muted/5 flex items-start gap-3 rounded-lg border p-4">
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
                  className="cursor-pointer font-semibold"
                >
                  Player profile
                </Label>
                <p className="text-muted-foreground text-xs">
                  You play games, request recordings, track your local ratings,
                  and challenge players.
                </p>
              </div>
            </div>

            {/* Organizer role */}
            <div className="border-border/40 bg-muted/5 flex items-start gap-3 rounded-lg border p-4">
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
                  className="cursor-pointer font-semibold"
                >
                  Organizer tools
                </Label>
                <p className="text-muted-foreground text-xs">
                  You manage leagues, venues, host tournaments, publish
                  brackets, and request professional recording coverage.
                </p>
              </div>
            </div>

            {/* Caster role */}
            <div className="border-border/40 bg-muted/5 flex items-start gap-3 rounded-lg border p-4">
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
                  className="cursor-pointer font-semibold"
                >
                  Caster tools
                </Label>
                <p className="text-muted-foreground text-xs">
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
            className="bg-primary text-brand-yellow hover:bg-primary/95 gap-2 rounded-md px-6 font-bold"
          >
            <Save className="size-4" />
            {updateProfile.isPending ? "Saving..." : submitLabel}
          </Button>
        </div>
      </form>

      <AgentKeysCard />
    </div>
  );
}

interface AgentApiKey {
  createdAt?: Date | string | null;
  enabled?: boolean;
  id: string;
  name?: string | null;
  start?: string | null;
}

function AgentKeysCard() {
  const [keyName, setKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [hasCopied, setHasCopied] = useState(false);
  const queryClient = useQueryClient();

  const { data: keysData, isLoading } = useQuery({
    queryFn: async () => {
      const response = await authClient.apiKey.list();
      return (response.data ?? []) as AgentApiKey[];
    },
    queryKey: ["agent-api-keys"],
  });

  const createKey = useMutation({
    mutationFn: async (name: string) => {
      const response = await authClient.apiKey.create({
        expiresIn: null,
        name,
      });
      const key = response.data?.key ?? null;
      if (!key) {
        throw new Error("Could not create the key");
      }
      return key;
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Could not create the key."
      );
    },
    onSuccess: (key) => {
      setCreatedKey(key);
      setKeyName("");
      void queryClient.invalidateQueries({ queryKey: ["agent-api-keys"] });
    },
  });

  const revokeKey = useMutation({
    mutationFn: async (keyId: string) => {
      await authClient.apiKey.delete({ keyId });
    },
    onError: () => {
      toast.error("Could not revoke the key.");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["agent-api-keys"] });
      toast.success("Key revoked.");
    },
  });

  const copyKey = async () => {
    if (!createdKey) {
      return;
    }
    await navigator.clipboard.writeText(createdKey);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2500);
  };

  let keysList: ReactNode = (
    <p className="text-muted-foreground text-xs">Loading keys...</p>
  );
  if (!isLoading) {
    keysList =
      (keysData ?? []).length === 0 ? (
        <p className="text-muted-foreground text-xs">
          No agent keys yet. Create one to give your AI agent access.
        </p>
      ) : (
        <ul className="divide-border divide-y">
          {(keysData ?? []).map((key) => (
            <li
              className="flex items-center justify-between gap-3 py-2.5"
              key={key.id}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {key.name ?? "Unnamed key"}
                </p>
                <p className="text-muted-foreground text-[11px]">
                  {key.start ? `${key.start}...` : ""}{" "}
                  {key.createdAt
                    ? `created ${new Date(key.createdAt).toLocaleDateString()}`
                    : ""}
                  {key.enabled === false ? " (disabled)" : ""}
                </p>
              </div>
              <Button
                className="rounded-lg"
                disabled={revokeKey.isPending}
                onClick={() => revokeKey.mutate(key.id)}
                size="sm"
                type="button"
                variant="outline"
              >
                <Trash2 className="size-3.5" />
                Revoke
              </Button>
            </li>
          ))}
        </ul>
      );
  }

  return (
    <Card className="border-border bg-card/40 overflow-hidden rounded-xl border shadow-sm backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-bold">
          <Bot className="text-primary size-5" /> Agent keys
        </CardTitle>
        <CardDescription className="text-xs">
          Hand a key to your AI agent so it can upload videos and clips on your
          behalf. A key can do anything your account can do: keep it private and
          revoke it when you stop using it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {createdKey ? (
          <div className="border-primary/40 bg-primary/5 flex flex-wrap items-center gap-3 rounded-lg border p-3">
            <p className="min-w-0 flex-1 truncate font-mono text-xs">
              {createdKey}
            </p>
            <Button
              className="rounded-lg"
              onClick={() => void copyKey()}
              size="sm"
              type="button"
            >
              {hasCopied ? (
                <Check className="size-3.5" />
              ) : (
                <Copy className="size-3.5" />
              )}
              {hasCopied ? "Copied" : "Copy"}
            </Button>
            <Button
              className="rounded-lg"
              onClick={() => setCreatedKey(null)}
              size="sm"
              type="button"
              variant="outline"
            >
              <X className="size-3.5" />
              Done
            </Button>
            <p className="text-muted-foreground w-full text-[11px]">
              Shown once. Store it now; RallyCasts only keeps a hash.
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-end gap-2">
          <label
            className="flex-1 text-xs font-semibold"
            htmlFor="agent-key-name"
          >
            Key name
            <Input
              className="mt-1.5 h-10 w-full rounded-lg font-normal"
              id="agent-key-name"
              maxLength={60}
              onChange={(event) => setKeyName(event.target.value)}
              placeholder="My upload agent"
              value={keyName}
            />
          </label>
          <Button
            className="rounded-lg"
            disabled={keyName.trim().length < 2 || createKey.isPending}
            onClick={() => createKey.mutate(keyName.trim())}
            type="button"
          >
            {createKey.isPending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Create key
          </Button>
        </div>

        {keysList}
      </CardContent>
    </Card>
  );
}

function SettingsPage() {
  const { data } = useProfile();

  return (
    <main className="mx-auto max-w-5xl space-y-8">
      <div className="border-border/60 flex items-center gap-3 border-b pb-5">
        <Settings className="text-primary size-8" />
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Your public profile, home court, roles, and linked accounts.
          </p>
        </div>
      </div>

      <ProfilePreview data={data} />

      <ProfileEditorPage
        showHeader
        submitLabel="Save Profile"
        subtitle="Update the public profile players see, including your name, handle, bio, home court, rating, and roles."
        title="Edit Profile"
      />

      <LinkedAccounts />
    </main>
  );
}
