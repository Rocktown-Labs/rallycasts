import { env } from "@rallycaststv/env/web";
import { Button } from "@rallycaststv/ui/components/button";
import { Card, CardContent } from "@rallycaststv/ui/components/card";
import { Input } from "@rallycaststv/ui/components/input";
import { Label } from "@rallycaststv/ui/components/label";
import { useNavigate, createFileRoute } from "@tanstack/react-router";
import {
  Camera,
  Check,
  MapPin,
  Sparkles,
  Trophy,
  User,
  Video,
  ChevronLeft,
  ChevronRight,
  Search,
  Users,
  Calendar,
  X,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { z } from "zod";

import { apiClient } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import { useOnboarding, useProfile } from "@/lib/hooks";
import type { ProfilePayload } from "@/lib/hooks";
import { readApiJson } from "@/lib/hooks/api";
import {
  buildOnboardingBio,
  getDateOfBirthValidation,
  parseDateOfBirth,
} from "@/lib/onboarding-profile";
import { initializeRadar, Radar } from "@/lib/radar";

interface CourtSuggestion {
  addressLabel: string;
  city: string;
  countryCode: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  placeId?: string;
  source: "google_places" | "radar";
  stateCode: string;
}

interface GooglePlaceSuggestion {
  address: string;
  latitude: number;
  longitude: number;
  name: string;
  placeId: string;
}

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

// ---------------------------------------------------------------------
// STEP 1: Account / Profile Step (Username & Age)
// ---------------------------------------------------------------------
const PRESET_AVATARS = [
  { emoji: "🎾", end: "#10b981", start: "#a3e635" },
  { emoji: "🏆", end: "#d946ef", start: "#8b5cf6" },
  { emoji: "😎", end: "#06b6d4", start: "#3b82f6" },
  { emoji: "⚡", end: "#ef4444", start: "#f59e0b" },
  { emoji: "👟", end: "#e11d48", start: "#fda4af" },
  { emoji: "🥇", end: "#d97706", start: "#fbbf24" },
];

function generateEmojiAvatar(
  emoji: string,
  startColor: string,
  endColor: string
): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <defs>
      <linearGradient id="grad-${emoji}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${startColor}" />
        <stop offset="100%" stop-color="${endColor}" />
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="50" fill="url(#grad-${emoji})" />
    <text x="50" y="58" font-size="48" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle" dominant-baseline="central">${emoji}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

interface AccountStepProps {
  usernameVal: string;
  setUsernameVal: (val: string) => void;
  nameVal: string;
  setNameVal: (val: string) => void;
  imageVal: string;
  setImageVal: (val: string) => void;
  dobVal: string;
  setDobVal: (val: string) => void;
  isCheckingUsername: boolean;
  usernameError: string | null;
  usernameSuccess: boolean;
  onContinue: (parsedAge: number) => void;
}

const nameSchema = z
  .string()
  .min(2, "Full name must be at least 2 characters")
  .max(50, "Full name must be at most 50 characters");

const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters")
  .regex(
    /^[a-zA-Z0-9_]+$/u,
    "Username can only contain letters, numbers, and underscores"
  );

interface PresetAvatarsSelectorProps {
  imageVal: string;
  setImageVal: (val: string) => void;
  setImageError: (val: string | null) => void;
}

function PresetAvatarsSelector({
  imageVal,
  setImageVal,
  setImageError,
}: PresetAvatarsSelectorProps) {
  return (
    <div className="grid grid-cols-6 gap-2 max-w-xs">
      {PRESET_AVATARS.map((preset) => {
        const svgDataUrl = generateEmojiAvatar(
          preset.emoji,
          preset.start,
          preset.end
        );
        const isSelected = imageVal === svgDataUrl;
        return (
          <button
            key={preset.emoji}
            type="button"
            onClick={() => {
              setImageVal(svgDataUrl);
              setImageError(null);
            }}
            className={`aspect-square rounded-full flex items-center justify-center text-xl transition-all relative border-2 hover:scale-105 cursor-pointer ${
              isSelected
                ? "border-primary ring-2 ring-primary/20 scale-105"
                : "border-transparent hover:border-border"
            }`}
            style={{
              background: `linear-gradient(135deg, ${preset.start}, ${preset.end})`,
            }}
            title={`Select ${preset.emoji} avatar`}
          >
            <span className="select-none">{preset.emoji}</span>
            {isSelected && (
              <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5 border border-background">
                <Check className="size-2.5 stroke-[3]" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

interface ProfilePhotoPickerProps {
  imageVal: string;
  setImageVal: (val: string) => void;
  imageError: string | null;
  setImageError: (val: string | null) => void;
}

function ProfilePhotoPicker({
  imageVal,
  setImageVal,
  imageError,
  setImageError,
}: ProfilePhotoPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setImageError("Image must be smaller than 2MB");
        return;
      }
      setImageError(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setImageVal(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 pb-2">
      <div className="relative group shrink-0">
        <div className="size-20 rounded-full overflow-hidden border-2 border-border bg-muted flex items-center justify-center shadow-inner relative">
          {imageVal ? (
            <img
              src={imageVal}
              alt="Profile Preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="size-8 text-muted-foreground" />
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer animate-in fade-in duration-200"
            title="Upload custom photo"
          >
            <Camera className="size-5 text-white" />
          </button>
        </div>
        {imageVal && (
          <button
            type="button"
            onClick={() => {
              setImageVal("");
              setImageError(null);
            }}
            className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full p-1 shadow-md cursor-pointer border border-background animate-in zoom-in duration-200"
            title="Remove image"
          >
            <X className="size-3" />
          </button>
        )}
      </div>

      <div className="space-y-1.5 flex-1 w-full text-center sm:text-left">
        <Label className="text-sm font-semibold">Profile Photo</Label>
        <p className="text-xs text-muted-foreground">
          Upload a photo or select a pickleball-themed avatar.
        </p>
        <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-md gap-1.5 h-8 text-xs cursor-pointer"
          >
            <Camera className="size-3.5" /> Upload Photo
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Upload profile photo"
          />
        </div>
        {imageError && (
          <p className="text-xs text-destructive font-medium mt-1">
            {imageError}
          </p>
        )}
      </div>
    </div>
  );
}

function AccountInfoStep({
  usernameVal,
  setUsernameVal,
  nameVal,
  setNameVal,
  imageVal,
  setImageVal,
  dobVal,
  setDobVal,
  isCheckingUsername,
  usernameError,
  usernameSuccess,
  onContinue,
}: AccountStepProps) {
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const usernameResult = usernameSchema.safeParse(usernameVal);
  const nameResult = nameSchema.safeParse(nameVal);
  const parsedDOB = parseDateOfBirth(dobVal);

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val) {
      const parts = val.split("-");
      if (parts.length === 3) {
        const [year, month, day] = parts;
        setDobVal(`${month}/${day}/${year}`);
      }
    }
  };

  const { isValid: isDobValid, errorText: dobErrorText } =
    getDateOfBirthValidation(dobVal, parsedDOB);

  const localUsernameError =
    !usernameResult.success && usernameVal !== ""
      ? usernameResult.error.issues[0]?.message
      : null;

  const localNameError =
    !nameResult.success && nameVal !== ""
      ? nameResult.error.issues[0]?.message
      : null;

  const canContinue =
    usernameSuccess &&
    !isCheckingUsername &&
    isDobValid &&
    !!parsedDOB &&
    nameResult.success;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Build your RallyCasts identity
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Claim a handle, add a real birthday, and make your player card feel
          like someone people would actually invite to a game.
        </p>
      </div>

      <div className="space-y-5 max-w-md">
        <ProfilePhotoPicker
          imageVal={imageVal}
          setImageVal={setImageVal}
          imageError={imageError}
          setImageError={setImageError}
        />

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground font-medium">
            Pick a themed avatar
          </Label>
          <PresetAvatarsSelector
            imageVal={imageVal}
            setImageVal={setImageVal}
            setImageError={setImageError}
          />
        </div>

        {/* Full Name Input */}
        <div className="space-y-2">
          <Label htmlFor="fullName">
            Full Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="fullName"
            placeholder="e.g. John Doe"
            value={nameVal}
            onChange={(e) => setNameVal(e.target.value)}
          />
          {localNameError && (
            <p className="text-xs text-destructive">{localNameError}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="username">
            Username <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="username"
              placeholder="e.g. dinkmaster"
              value={usernameVal}
              onChange={(e) =>
                setUsernameVal(e.target.value.trim().toLowerCase())
              }
              className="pr-10"
            />
            {isCheckingUsername && (
              <div className="absolute right-3 top-2.5 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            )}
          </div>
          {(localUsernameError || usernameError) && (
            <p className="text-xs text-destructive">
              {localUsernameError || usernameError}
            </p>
          )}
          {usernameSuccess && usernameVal && (
            <p className="text-xs text-emerald-500 font-medium flex items-center gap-1">
              <Check className="size-3" /> Username is available
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="dob">
            Date of Birth <span className="text-destructive">*</span>
          </Label>
          <div className="relative flex items-center">
            <Input
              id="dob"
              type="text"
              placeholder="MM/DD/YYYY or MMDDYY (e.g. 040191)"
              value={dobVal}
              onChange={(e) => setDobVal(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => dateInputRef.current?.showPicker()}
              className="absolute right-3 text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none"
              title="Open calendar picker"
            >
              <Calendar className="size-4" />
            </button>
            <input
              ref={dateInputRef}
              type="date"
              tabIndex={-1}
              aria-hidden="true"
              className="sr-only absolute right-0 top-0 w-0 h-0 opacity-0 pointer-events-none"
              onChange={handlePickerChange}
            />
          </div>
          {parsedDOB ? (
            <p className="text-xs text-emerald-500 font-medium flex items-center gap-1">
              <Check className="size-3" /> Age group set from{" "}
              {parsedDOB.formatted}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              We only save your age. Your birthday helps us place you in the
              right player and event context.
            </p>
          )}
          {dobErrorText && (
            <p className="text-xs text-destructive font-medium">
              {dobErrorText}
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-border mt-8">
        <Button
          onClick={() => parsedDOB && onContinue(parsedDOB.age)}
          disabled={!canContinue}
          className="rounded-md gap-2"
        >
          Continue <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// STEP 2: Interests & Goals Step
// ---------------------------------------------------------------------
interface GoalsStepProps {
  availability: string[];
  contentFormats: string[];
  goals: string[];
  playStyle: string;
  setAvailability: React.Dispatch<React.SetStateAction<string[]>>;
  setContentFormats: React.Dispatch<React.SetStateAction<string[]>>;
  setGoals: React.Dispatch<React.SetStateAction<string[]>>;
  setPlayStyle: (val: string) => void;
  frequency: string;
  setFrequency: (val: string) => void;
  isPlayer: boolean;
  setIsPlayer: (val: boolean) => void;
  isOrganizer: boolean;
  setIsOrganizer: (val: boolean) => void;
  onContinue: () => void;
  onBack: () => void;
}

const INTERESTS_OPTIONS = [
  {
    desc: "League nights, brackets, DUPR-ready competition.",
    icon: <Trophy className="size-4" />,
    id: "tournaments",
    label: "Compete",
  },
  {
    desc: "Find partners and foursomes around your level.",
    icon: <Users className="size-4" />,
    id: "players",
    label: "Meet Players",
  },
  {
    desc: "Open play, clinics, socials, and pop-up sessions.",
    icon: <Calendar className="size-4" />,
    id: "events",
    label: "Find Play",
  },
  {
    desc: "See active courts and what is happening there.",
    icon: <MapPin className="size-4" />,
    id: "parks",
    label: "Track Courts",
  },
  {
    desc: "Watch highlights, resets, hands battles, and local clips.",
    icon: <Video className="size-4" />,
    id: "watch",
    label: "Watch Clips",
  },
  {
    desc: "Post matches, request recordings, and build a player reel.",
    icon: <Camera className="size-4" />,
    id: "share",
    label: "Share Video",
  },
];

const FREQ_OPTIONS = [
  { id: "daily", label: "Every day" },
  { id: "weekly", label: "2-3 times a week" },
  { id: "few_times_month", label: "Once a week" },
  { id: "occasionally", label: "Getting started" },
];

const PLAY_STYLE_OPTIONS = [
  { id: "social", label: "Social", value: "Social" },
  { id: "competitive", label: "Competitive", value: "Competitive" },
  { id: "training", label: "Drill-focused", value: "Drill-focused" },
  { id: "creator", label: "Video-first", value: "Video-first" },
];

const AVAILABILITY_OPTIONS = [
  { id: "weekday_mornings", label: "Weekday mornings" },
  { id: "weeknights", label: "Weeknights" },
  { id: "saturday_mornings", label: "Saturday mornings" },
  { id: "sunday_afternoons", label: "Sunday afternoons" },
];

const CONTENT_FORMAT_OPTIONS = [
  { id: "highlights", label: "Match highlights" },
  { id: "nearby_heat", label: "Local park heat" },
  { id: "drills", label: "Drills and tips" },
  { id: "events", label: "Events worth joining" },
];

const toggleSelection = (
  value: string,
  setValues: React.Dispatch<React.SetStateAction<string[]>>
) => {
  setValues((prev) =>
    prev.includes(value)
      ? prev.filter((item) => item !== value)
      : [...prev, value]
  );
};

function GoalsStep({
  availability,
  contentFormats,
  goals,
  playStyle,
  setAvailability,
  setContentFormats,
  setGoals,
  setPlayStyle,
  frequency,
  setFrequency,
  isPlayer,
  setIsPlayer,
  isOrganizer,
  setIsOrganizer,
  onContinue,
  onBack,
}: GoalsStepProps) {
  const isRoleValid = isPlayer || isOrganizer;
  const isGoalsValid = goals.length > 0;
  const isFreqValid = frequency !== "";
  const canContinue =
    isRoleValid &&
    isGoalsValid &&
    isFreqValid &&
    playStyle !== "" &&
    availability.length > 0 &&
    contentFormats.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Tune your pickleball signal
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          RallyCasts should feel local from the first scroll. Tell us what makes
          a session worth showing up for.
        </p>
      </div>

      <div className="space-y-6">
        {/* Role Selection */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">
            How will you use RallyCasts?{" "}
            <span className="text-destructive">*</span>
          </Label>
          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setIsPlayer(!isPlayer)}
              className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-all hover:bg-muted/40 ${
                isPlayer
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border"
              }`}
            >
              <div className="mt-1 flex size-5 shrink-0 items-center justify-center rounded border border-primary/50 text-primary bg-background">
                {isPlayer && <Check className="size-3.5 stroke-[3]" />}
              </div>
              <div>
                <span className="font-semibold block text-sm">Player</span>
                <span className="text-xs text-muted-foreground mt-0.5 block">
                  Find players, watch local clips, and build your player graph.
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setIsOrganizer(!isOrganizer)}
              className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-all hover:bg-muted/40 ${
                isOrganizer
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border"
              }`}
            >
              <div className="mt-1 flex size-5 shrink-0 items-center justify-center rounded border border-primary/50 text-primary bg-background">
                {isOrganizer && <Check className="size-3.5 stroke-[3]" />}
              </div>
              <div>
                <span className="font-semibold block text-sm">Organizer</span>
                <span className="text-xs text-muted-foreground mt-0.5 block">
                  Run ladders, promote events, and make your courts easier to
                  find.
                </span>
              </div>
            </button>
          </div>
          {isOrganizer && (
            <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4 space-y-3 mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-1.5 text-yellow-600 dark:text-yellow-500 font-bold text-xs sm:text-sm">
                <Sparkles className="size-4 shrink-0" />
                <span>Organizer Tools (Free & Premium Options)</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 text-xs leading-relaxed text-muted-foreground">
                <div className="sm:border-r sm:border-border/50 sm:pr-3">
                  <span className="font-bold text-foreground block mb-0.5">
                    Organizer starter
                  </span>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Create up to 2 active events</li>
                    <li>Invite up to 32 players per event</li>
                    <li>Basic park court info pages</li>
                  </ul>
                </div>
                <div>
                  <span className="font-bold text-yellow-600 dark:text-yellow-500 block mb-0.5">
                    Organizer growth
                  </span>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Unlimited events, leagues & tournaments</li>
                    <li>Automated brackets & match scheduling</li>
                    <li>Custom ticketing, payouts & CSV exports</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Interests Selection */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">
            What do you want RallyCasts to find for you?{" "}
            <span className="text-destructive">*</span>
          </Label>
          <div className="grid gap-3 sm:grid-cols-2">
            {INTERESTS_OPTIONS.map((opt) => {
              const isSelected = goals.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggleSelection(opt.id, setGoals)}
                  className={`flex items-start gap-3 rounded-lg border p-3.5 text-left transition-all hover:bg-muted/40 ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border"
                  }`}
                >
                  <div
                    className={`mt-0.5 p-1.5 rounded-md ${isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}
                  >
                    {opt.icon}
                  </div>
                  <div>
                    <span className="font-semibold block text-xs sm:text-sm">
                      {opt.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground block mt-0.5">
                      {opt.desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Play Frequency */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">
            How often do you play? <span className="text-destructive">*</span>
          </Label>
          <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
            {FREQ_OPTIONS.map((opt) => {
              const isSelected = frequency === opt.id;
              return (
                <Button
                  key={opt.id}
                  variant={isSelected ? "default" : "outline"}
                  onClick={() => setFrequency(opt.id)}
                  type="button"
                  className="w-full text-xs py-5 px-3 whitespace-normal h-auto rounded-lg text-center"
                >
                  {opt.label}
                </Button>
              );
            })}
          </div>
        </div>
        <div className="space-y-3">
          <Label className="text-base font-semibold">
            Pick your court energy <span className="text-destructive">*</span>
          </Label>
          <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
            {PLAY_STYLE_OPTIONS.map((opt) => {
              const isSelected = playStyle === opt.value;
              return (
                <Button
                  key={opt.id}
                  variant={isSelected ? "default" : "outline"}
                  onClick={() => setPlayStyle(opt.value)}
                  type="button"
                  className="w-full text-xs py-4 px-3 whitespace-normal h-auto rounded-lg text-center"
                >
                  {opt.label}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-base font-semibold">
            When are you usually free?{" "}
            <span className="text-destructive">*</span>
          </Label>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {AVAILABILITY_OPTIONS.map((opt) => {
              const isSelected = availability.includes(opt.label);
              return (
                <Button
                  key={opt.id}
                  variant={isSelected ? "default" : "outline"}
                  onClick={() => toggleSelection(opt.label, setAvailability)}
                  type="button"
                  className="w-full text-xs py-4 px-3 whitespace-normal h-auto rounded-lg text-center"
                >
                  {opt.label}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-base font-semibold">
            What belongs in your video feed?{" "}
            <span className="text-destructive">*</span>
          </Label>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {CONTENT_FORMAT_OPTIONS.map((opt) => {
              const isSelected = contentFormats.includes(opt.label);
              return (
                <Button
                  key={opt.id}
                  variant={isSelected ? "default" : "outline"}
                  onClick={() => toggleSelection(opt.label, setContentFormats)}
                  type="button"
                  className="w-full text-xs py-4 px-3 whitespace-normal h-auto rounded-lg text-center"
                >
                  {opt.label}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t border-border mt-8">
        <Button variant="outline" onClick={onBack} className="rounded-md gap-2">
          <ChevronLeft className="size-4" /> Back
        </Button>
        <Button
          onClick={onContinue}
          disabled={!canContinue}
          className="rounded-md gap-2"
        >
          Continue <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// STEP 3: Home Court / Location Selection Step
// ---------------------------------------------------------------------
interface CourtStepProps {
  payload: ProfilePayload;
  setPayload: React.Dispatch<React.SetStateAction<ProfilePayload>>;
  onContinue: () => void;
  onBack: () => void;
}

function CourtSVG() {
  return (
    <svg
      viewBox="0 0 400 200"
      className="w-full h-40 bg-emerald-950 rounded-lg border border-emerald-700 relative overflow-hidden shadow-inner"
    >
      {/* Pickleball Court drawing */}
      <rect
        x="20"
        y="15"
        width="360"
        height="170"
        fill="none"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="3"
      />
      {/* Kitchen Left */}
      <rect
        x="135"
        y="15"
        width="65"
        height="170"
        fill="rgba(16, 185, 129, 0.1)"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="2"
      />
      {/* Kitchen Right */}
      <rect
        x="200"
        y="15"
        width="65"
        height="170"
        fill="rgba(16, 185, 129, 0.1)"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="2"
      />
      {/* Net line */}
      <line
        x1="200"
        y1="10"
        x2="200"
        y2="190"
        stroke="rgba(255,255,255,0.8)"
        strokeWidth="3"
      />
      <line
        x1="200"
        y1="10"
        x2="200"
        y2="190"
        stroke="#1f2937"
        strokeWidth="1.5"
        strokeDasharray="3"
      />
      {/* Center line Left */}
      <line
        x1="20"
        y1="100"
        x2="135"
        y2="100"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="2"
      />
      {/* Center line Right */}
      <line
        x1="265"
        y1="100"
        x2="380"
        y2="100"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="2"
      />

      {/* Decorative paddle and balls */}
      <circle
        cx="200"
        cy="100"
        r="20"
        fill="rgba(16, 185, 129, 0.2)"
        stroke="#10b981"
        strokeWidth="2"
        className="animate-pulse"
      />
      <circle cx="200" cy="100" r="5" fill="#eab308" />
    </svg>
  );
}

const parsePlaceCityState = (address: string) => {
  const parts = address.split(",").map((part) => part.trim());
  const stateZip = parts.at(-2) ?? "";
  const state = stateZip.match(/\b[A-Z]{2}\b/u)?.[0] ?? stateZip;
  const city = parts.length > 2 ? (parts.at(-3) ?? "") : "";

  return { city, state };
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
    source: "google_places",
    stateCode: location.state,
  };
};

const getCourtSourceLabel = (payload: ProfilePayload) => {
  if (payload.radarAddressId === "manual") {
    return "Custom Entry";
  }

  if (payload.radarAddressId === "google_places") {
    return "Google Places";
  }

  if (payload.radarAddressId === "radar") {
    return "Radar";
  }

  return "Verified";
};

const formatCoordinate = (
  value: number | undefined,
  positiveSuffix: string,
  negativeSuffix: string
) => {
  if (value === undefined) {
    return "";
  }

  return `${Math.abs(value).toFixed(4)}° ${
    value >= 0 ? positiveSuffix : negativeSuffix
  }`;
};

function HomeCourtStep({
  payload,
  setPayload,
  onContinue,
  onBack,
}: CourtStepProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 400);
  const [suggestions, setSuggestions] = useState<CourtSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Custom manual court inputs
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualCity, setManualCity] = useState("");
  const [manualState, setManualState] = useState("");

  // User's approximate location for biasing autocomplete results
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const radarKey = env.VITE_RADAR_PUBLISHABLE_KEY ?? "";

  // Get approximate location on mount to bias search results
  useEffect(() => {
    let cancelled = false;
    const getApproximateLocation = async () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            if (cancelled) {
              return;
            }
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          },
          async () => {
            // Fallback to Radar IP geolocation
            try {
              const result = await Radar.ipGeocode();
              if (
                result.address?.latitude &&
                result.address?.longitude &&
                !cancelled
              ) {
                setUserLocation({
                  lat: result.address.latitude,
                  lng: result.address.longitude,
                });
              }
            } catch {
              // IP geolocation failed, will use IP bias by default
            }
          },
          { maximumAge: 300_000, timeout: 5000 }
        );
      } else {
        // Fallback to Radar IP geolocation
        try {
          const result = await Radar.ipGeocode();
          if (
            result.address?.latitude &&
            result.address?.longitude &&
            !cancelled
          ) {
            setUserLocation({
              lat: result.address.latitude,
              lng: result.address.longitude,
            });
          }
        } catch {
          // IP geolocation failed
        }
      }
    };
    getApproximateLocation();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (debouncedQuery.length < 3) {
      setSuggestions([]);
      return;
    }

    let active = true;
    setIsLoading(true);

    const fetchGoogleSuggestions = async () => {
      const result = await readApiJson<{ places: GooglePlaceSuggestion[] }>(
        apiClient.api.places.search.$get({
          query: {
            q: debouncedQuery,
            ...(userLocation
              ? {
                  lat: String(userLocation.lat),
                  lng: String(userLocation.lng),
                }
              : {}),
          },
        })
      );

      return result.places.map(mapGooglePlaceToCourtSuggestion);
    };

    const fetchRadarSuggestions = async (): Promise<CourtSuggestion[]> => {
      if (!radarKey) {
        return [];
      }

      const params: Parameters<typeof Radar.autocomplete>[0] = {
        limit: 8,
        query: debouncedQuery,
      };
      if (userLocation) {
        params.near = {
          latitude: userLocation.lat,
          longitude: userLocation.lng,
        };
      }
      const result = await Radar.autocomplete(params);
      return (result.addresses ?? []).map((addr) => ({
        addressLabel: addr.addressLabel ?? addr.placeLabel ?? "",
        city: addr.city ?? "",
        countryCode: addr.countryCode ?? "US",
        formattedAddress: addr.formattedAddress ?? "",
        latitude: addr.latitude,
        longitude: addr.longitude,
        source: "radar" as const,
        stateCode: addr.stateCode ?? "",
      }));
    };

    const fetchCourtSuggestions = async () => {
      try {
        const googleSuggestions = await fetchGoogleSuggestions();
        if (active) {
          setSuggestions(googleSuggestions);
        }
      } catch {
        try {
          const radarSuggestions = await fetchRadarSuggestions();
          if (active) {
            setSuggestions(radarSuggestions);
          }
        } catch {
          if (active) {
            setSuggestions([]);
          }
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    fetchCourtSuggestions();

    return () => {
      active = false;
    };
  }, [debouncedQuery, radarKey, userLocation]);

  const selectAddress = (addr: CourtSuggestion) => {
    setPayload((prev) => ({
      ...prev,
      homeCity: addr.city || "Unknown",
      homeCourtName: addr.addressLabel || addr.formattedAddress || "Unknown",
      homeLatitude: addr.latitude,
      homeLongitude: addr.longitude,
      homeState: addr.stateCode || "US",
      radarAddressId: addr.source,
      radarPlaceId: addr.placeId ?? "",
    }));
    setSearchQuery("");
    setShowDropdown(false);
    setIsAddingManual(false);
  };

  const handleManualSubmit = () => {
    if (!manualName || !manualCity || !manualState) {
      return;
    }
    setPayload((prev) => ({
      ...prev,
      homeCity: manualCity,
      homeCourtName: manualName,
      homeLatitude: undefined,
      homeLongitude: undefined,
      homeState: manualState.toUpperCase(),
      radarAddressId: "manual",
      radarPlaceId: "manual",
    }));
    setIsAddingManual(false);
  };

  const hasSelectedCourt = !!(payload.homeCity && payload.homeCourtName);

  let dropdownContent = null;
  if (isLoading) {
    dropdownContent = (
      <div className="p-4 text-xs text-muted-foreground text-center animate-pulse">
        Searching courts...
      </div>
    );
  } else if (suggestions.length === 0) {
    dropdownContent = (
      <div className="p-3 text-xs text-muted-foreground text-center">
        No matches found.{" "}
        <button
          type="button"
          onClick={() => {
            setIsAddingManual(true);
            setShowDropdown(false);
          }}
          className="text-primary font-semibold underline hover:text-primary/95 ml-1"
        >
          Enter court manually
        </button>
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
            className="w-full text-left px-4 py-2 text-sm hover:bg-muted/80 flex items-center gap-2 border-b border-border last:border-0"
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Anchor your local feed
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Your home court powers nearby clips, active park heat, player
          suggestions, and the events you are most likely to care about.
        </p>
      </div>

      <div className="space-y-5">
        <div className="relative">
          <Label htmlFor="court-search" className="mb-2 block">
            Search for the court, park, club, or rec center you play most{" "}
            <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input
              id="court-search"
              placeholder="Search by venue name, e.g. Crestwood Pickleball Park"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              className="pl-9"
            />
          </div>

          {showDropdown && (searchQuery.length >= 3 || isLoading) && (
            <div className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
              {dropdownContent}
            </div>
          )}
        </div>

        {/* Manual Court Entry Form */}
        {isAddingManual && (
          <div className="border border-border p-4 rounded-lg bg-muted/20 space-y-4 max-w-md">
            <h4 className="font-semibold text-sm">Add custom court details</h4>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="manual-name" className="text-xs">
                  Court / Park Name
                </Label>
                <Input
                  id="manual-name"
                  placeholder="e.g. Riverside Pickleball Courts"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="manual-city" className="text-xs">
                    City
                  </Label>
                  <Input
                    id="manual-city"
                    placeholder="e.g. Austin"
                    value={manualCity}
                    onChange={(e) => setManualCity(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="manual-state" className="text-xs">
                    State / Province
                  </Label>
                  <Input
                    id="manual-state"
                    placeholder="e.g. TX"
                    value={manualState}
                    onChange={(e) => setManualState(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsAddingManual(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleManualSubmit}
                disabled={!manualName || !manualCity || !manualState}
              >
                Save Court
              </Button>
            </div>
          </div>
        )}

        {/* Selection Display / Card */}
        {hasSelectedCourt && (
          <div className="border border-emerald-500/30 bg-emerald-500/5 rounded-lg p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs text-primary font-bold uppercase tracking-wider">
                  Your Selected Court
                </span>
                <h3 className="font-bold text-lg text-foreground mt-1">
                  {payload.homeCourtName}
                </h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <MapPin className="size-4 text-primary shrink-0" />
                  {payload.homeCity}, {payload.homeState} {payload.homeCountry}
                </p>
                {payload.homeLatitude && payload.homeLongitude && (
                  <span className="text-[11px] text-muted-foreground block mt-1">
                    Coordinates:{" "}
                    {formatCoordinate(payload.homeLatitude, "N", "S")},{" "}
                    {formatCoordinate(payload.homeLongitude, "E", "W")}
                  </span>
                )}
              </div>
              <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-semibold">
                {getCourtSourceLabel(payload)}
              </span>
            </div>

            {/* SVG Visualizing the Selected court */}
            <div className="mt-2">
              <CourtSVG />
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between pt-4 border-t border-border mt-8">
        <Button variant="outline" onClick={onBack} className="rounded-md gap-2">
          <ChevronLeft className="size-4" /> Back
        </Button>
        <Button
          onClick={onContinue}
          disabled={!hasSelectedCourt}
          className="rounded-md gap-2"
        >
          Continue <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// STEP 4: Skill Level Selection Step
// ---------------------------------------------------------------------
interface SkillStepProps {
  skillLevel: string | undefined;
  setSkillLevel: (
    val: "beginner" | "intermediate" | "advanced" | "pro"
  ) => void;
  onContinue: () => void;
  onBack: () => void;
}

const SKILL_OPTIONS = [
  {
    desc: "Learning the basic rules, court lines, scoring, and how to hold consistent dinks.",
    key: "beginner",
    label: "Beginner",
    rating: "DUPR 1.0 - 2.99",
  },
  {
    desc: "Plays strategically, utilizes third shot drops, and understands kitchen positioning.",
    key: "intermediate",
    label: "Intermediate",
    rating: "DUPR 3.0 - 3.99",
  },
  {
    desc: "Highly consistent, plays with spin, dictates pace, and competes in local leagues.",
    key: "advanced",
    label: "Advanced",
    rating: "DUPR 4.0 - 4.99",
  },
  {
    desc: "Advanced competitive tournament player. Masters spin, control, and strategy.",
    key: "pro",
    label: "Pro / Open",
    rating: "DUPR 5.0+",
  },
] as const;

function SkillLevelStep({
  skillLevel,
  setSkillLevel,
  onContinue,
  onBack,
}: SkillStepProps) {
  const isSelected = (key: string) => skillLevel === key;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Place yourself on the right courts
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          We use this to recommend players, clips, events, and recorded matches
          that match your speed of play.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {SKILL_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setSkillLevel(opt.key)}
            className={`border rounded-lg p-5 text-left transition-all hover:bg-muted/40 ${
              isSelected(opt.key)
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border bg-card"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-base block">{opt.label}</span>
              <span className="text-[10px] sm:text-xs font-semibold bg-primary/15 text-primary px-2 py-0.5 rounded-full">
                {opt.rating}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              {opt.desc}
            </p>
          </button>
        ))}
      </div>

      <div className="flex justify-between pt-4 border-t border-border mt-8">
        <Button variant="outline" onClick={onBack} className="rounded-md gap-2">
          <ChevronLeft className="size-4" /> Back
        </Button>
        <Button
          onClick={onContinue}
          disabled={!skillLevel}
          className="rounded-md gap-2"
        >
          Continue <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// STEP 5: Caster Tools Step
// ---------------------------------------------------------------------
interface CasterStepProps {
  isCaster: boolean;
  setIsCaster: (val: boolean) => void;
  onContinue: () => void;
  onBack: () => void;
}

function CasterStep({
  isCaster,
  setIsCaster,
  onContinue,
  onBack,
}: CasterStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Make RallyCasts video-first
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Choose whether you want recording and caster tools in your player hub
          from day one.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 max-w-xl mx-auto py-4">
        <button
          type="button"
          onClick={() => setIsCaster(true)}
          className={`flex flex-col items-center justify-center p-6 border rounded-lg text-center transition-all hover:bg-muted/40 ${
            isCaster
              ? "border-primary bg-primary/5 ring-1 ring-primary"
              : "border-border"
          }`}
        >
          <div
            className={`p-3 rounded-full mb-3 ${isCaster ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}
          >
            <Camera className="size-6" />
          </div>
          <h4 className="font-bold text-sm">Turn on creator tools</h4>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed max-w-[200px]">
            Add video requests, match recording, and creator earning surfaces to
            my hub.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setIsCaster(false)}
          className={`flex flex-col items-center justify-center p-6 border rounded-lg text-center transition-all hover:bg-muted/40 ${
            isCaster
              ? "border-border"
              : "border-primary bg-primary/5 ring-1 ring-primary"
          }`}
        >
          <div
            className={`p-3 rounded-full mb-3 ${isCaster ? "bg-muted text-muted-foreground" : "bg-primary/20 text-primary"}`}
          >
            <User className="size-6" />
          </div>
          <h4 className="font-bold text-sm">Player feed only</h4>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed max-w-[200px]">
            Keep my first session focused on courts, players, clips, and events.
          </p>
        </button>
      </div>

      <div className="flex justify-between pt-4 border-t border-border mt-8">
        <Button variant="outline" onClick={onBack} className="rounded-md gap-2">
          <ChevronLeft className="size-4" /> Back
        </Button>
        <Button onClick={onContinue} className="rounded-md gap-2">
          Continue <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// STEP 6: Premium vs. Free Selection Step
// ---------------------------------------------------------------------
interface PlanStepProps {
  finish: (tier: "free" | "premium") => void;
  onBack: () => void;
}

function PlanStep({ finish, onBack }: PlanStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Your court feed is ready
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Pick how you want to enter RallyCasts. You can start free and upgrade
          when you are ready to organize, analyze, or earn from video.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mt-4">
        <button
          className="rounded-lg border border-border p-6 text-left hover:bg-muted/30 transition-all flex flex-col justify-between text-card-foreground bg-card"
          type="button"
          onClick={() => finish("free")}
        >
          <div>
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">Start Free</h3>
              <span className="text-xs font-semibold px-2 py-0.5 bg-muted text-muted-foreground rounded-full">
                Active
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Best for players who want a personalized local video feed today.
            </p>
            <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <Check className="size-3.5 text-primary shrink-0" /> Find local
                home court heat and nearby venues
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-3.5 text-primary shrink-0" /> Match with
                players around your level
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-3.5 text-primary shrink-0" /> Join local
                clips, events, and open play sessions
              </li>
            </ul>
          </div>
          <Button className="w-full mt-6 rounded-md" variant="outline">
            Enter My Feed
          </Button>
        </button>

        <button
          className="rounded-lg border border-yellow-500/40 bg-yellow-500/5 p-6 text-left hover:bg-yellow-500/10 transition-all flex flex-col justify-between relative overflow-hidden"
          type="button"
          onClick={() => finish("premium")}
        >
          <div className="absolute right-0 top-0 bg-yellow-500 text-black font-bold text-[9px] uppercase tracking-wider px-3 py-1 rounded-bl-lg">
            Popular
          </div>
          <div>
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-1.5">
                Premium-ready <Sparkles className="size-4 text-yellow-500" />
              </h3>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              For serious players, organizers, and creators who want richer
              tools.
            </p>
            <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
              <li className="flex items-center gap-2 text-foreground font-medium">
                <Check className="size-3.5 text-yellow-500 shrink-0" /> Priority
                discovery and profile placement
              </li>
              <li className="flex items-center gap-2 text-foreground font-medium">
                <Check className="size-3.5 text-yellow-500 shrink-0" /> Rich
                player, video, and court analytics
              </li>
              <li className="flex items-center gap-2 text-foreground font-medium">
                <Check className="size-3.5 text-yellow-500 shrink-0" /> Custom
                event, ladder, and bracket tools
              </li>
              <li className="flex items-center gap-2 text-foreground font-medium">
                <Check className="size-3.5 text-yellow-500 shrink-0" /> Earning
                recording and earning tools
              </li>
            </ul>
          </div>
          <Button className="w-full mt-6 rounded-md bg-yellow-500 hover:bg-yellow-600 text-black font-semibold border-0">
            Unlock Premium Mode
          </Button>
        </button>
      </div>

      <div className="flex justify-between pt-4 border-t border-border mt-8">
        <Button variant="outline" onClick={onBack} className="rounded-md gap-2">
          <ChevronLeft className="size-4" /> Back
        </Button>
      </div>
    </div>
  );
}

const toProfileRecord = (profile: unknown) =>
  profile && typeof profile === "object"
    ? (profile as Record<string, unknown>)
    : {};

const getProfileString = (
  record: Record<string, unknown>,
  key: string,
  fallback = ""
) => (typeof record[key] === "string" ? record[key] : fallback);

const getProfileNumber = (record: Record<string, unknown>, key: string) =>
  typeof record[key] === "number" ? record[key] : undefined;

const getProfileBoolean = (
  record: Record<string, unknown>,
  key: string,
  fallback: boolean
) => (typeof record[key] === "boolean" ? record[key] : fallback);

const getProfileSkillLevel = (record: Record<string, unknown>) => {
  const value = record.skillLevel;
  return value === "beginner" ||
    value === "intermediate" ||
    value === "advanced" ||
    value === "pro"
    ? value
    : undefined;
};

const normalizeProfilePayload = (profile: unknown): ProfilePayload => {
  const record = toProfileRecord(profile);

  return {
    accountTier: record.accountTier === "premium" ? "premium" : "free",
    age: getProfileNumber(record, "age"),
    homeCity: getProfileString(record, "homeCity"),
    homeCourtName: getProfileString(record, "homeCourtName"),
    homeLatitude: getProfileNumber(record, "homeLatitude"),
    homeLongitude: getProfileNumber(record, "homeLongitude"),
    homeState: getProfileString(record, "homeState"),
    isCaster: getProfileBoolean(record, "isCaster", false),
    isOrganizer: getProfileBoolean(record, "isOrganizer", false),
    isPlayer: getProfileBoolean(record, "isPlayer", true),
    radarAddressId: getProfileString(record, "radarAddressId"),
    radarPlaceId: getProfileString(record, "radarPlaceId"),
    skillLevel: getProfileSkillLevel(record),
  };
};

// ---------------------------------------------------------------------
// MAIN PAGE COMPONENT
// ---------------------------------------------------------------------
const steps = [
  { label: "Identity" },
  { label: "Play DNA" },
  { label: "Home Court" },
  { label: "Level" },
  { label: "Video" },
  { label: "Launch" },
];

function OnboardingPage() {
  const navigate = useNavigate({ from: "/onboarding" });
  const onboarding = useOnboarding();
  const { data: profileData } = useProfile();
  const { data: session } = authClient.useSession();

  const [step, setStep] = useState(0);

  // Payload structure matching the database table columns
  const [payload, setPayload] = useState<ProfilePayload>({
    accountTier: "free",
    age: undefined,
    homeCity: "",
    homeCountry: "US",
    homeCourtName: "",
    homeState: "",
    isCaster: false,
    isOrganizer: false,
    isPlayer: true,
    onboardingStatus: "complete",
    skillLevel: undefined,
  });

  const [usernameVal, setUsernameVal] = useState("");
  const [nameVal, setNameVal] = useState("");
  const [imageVal, setImageVal] = useState("");
  const [dobVal, setDobVal] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [frequency, setFrequency] = useState("");
  const [playStyle, setPlayStyle] = useState("");
  const [availability, setAvailability] = useState<string[]>([]);
  const [contentFormats, setContentFormats] = useState<string[]>([]);

  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameSuccess, setUsernameSuccess] = useState<boolean>(false);

  // Initialize Radar SDK
  useEffect(() => {
    initializeRadar();
  }, []);

  // Sync session and initial profile details
  useEffect(() => {
    if (session?.user) {
      if (session.user.username && !usernameVal) {
        setUsernameVal(session.user.username);
      }
      if (session.user.name && !nameVal) {
        setNameVal(session.user.name);
      }
      if (session.user.image && !imageVal) {
        setImageVal(session.user.image);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user]);

  useEffect(() => {
    if (profileData?.profile) {
      setPayload((prev) => ({
        ...prev,
        ...normalizeProfilePayload(profileData.profile),
      }));
    }
  }, [profileData]);

  // Username validation check
  const checkUsername = async (val: string) => {
    if (val.length < 3) {
      setUsernameError("Username must be at least 3 characters");
      setUsernameSuccess(false);
      return;
    }
    if (val.length > 30) {
      setUsernameError("Username must be at most 30 characters");
      setUsernameSuccess(false);
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/u.test(val)) {
      setUsernameError(
        "Username can only contain letters, numbers, and underscores"
      );
      setUsernameSuccess(false);
      return;
    }

    setIsCheckingUsername(true);
    setUsernameError(null);
    try {
      const res = await authClient.isUsernameAvailable({ username: val });
      if (res.data?.available) {
        setUsernameSuccess(true);
        setUsernameError(null);
      } else {
        setUsernameSuccess(false);
        setUsernameError("Username is already taken");
      }
    } catch {
      setUsernameSuccess(false);
      setUsernameError("Failed to check username availability");
    } finally {
      setIsCheckingUsername(false);
    }
  };

  // Debounced username checking
  useEffect(() => {
    if (!usernameVal) {
      setUsernameError(null);
      setUsernameSuccess(false);
      return;
    }

    if (session?.user?.username && usernameVal === session.user.username) {
      setUsernameError(null);
      setUsernameSuccess(true);
      return;
    }

    const timer = setTimeout(() => {
      checkUsername(usernameVal);
    }, 500);

    return () => clearTimeout(timer);
  }, [usernameVal, session?.user?.username]);

  // Handler for Step 0 Continue (saves profile details and username, stores age in payload)
  const handleSaveUsername = async (parsedAge: number) => {
    if (!usernameSuccess || !usernameVal) {
      return;
    }

    try {
      setIsCheckingUsername(true);
      const { error } = await authClient.updateUser({
        image: imageVal || null,
        name: nameVal,
        username: usernameVal,
      });
      if (error) {
        setUsernameError(error.message || "Failed to save profile details");
      } else {
        setPayload((prev) => ({
          ...prev,
          age: parsedAge,
        }));
        setStep(1);
      }
    } catch {
      setUsernameError("Failed to save profile details");
    } finally {
      setIsCheckingUsername(false);
    }
  };

  // Compile onboarding preferences into the current profile schema.
  const handleGoalsSubmit = () => {
    const activeGoals = goals
      .map((g) => {
        const option = INTERESTS_OPTIONS.find((o) => o.id === g);
        return option ? option.label : "";
      })
      .filter(Boolean)
      .map((label) => label.toLowerCase());

    const freqOption = FREQ_OPTIONS.find((f) => f.id === frequency);
    const freqLabel = freqOption?.label ?? "";

    const userBio = buildOnboardingBio({
      availability,
      contentFormats,
      frequencyLabel: freqLabel,
      goalLabels: activeGoals,
      playStyle,
    });

    setPayload((prev) => ({
      ...prev,
      bio: userBio,
    }));
    setStep(2);
  };

  const finish = (accountTier: "free" | "premium") => {
    onboarding.mutate(
      { ...payload, accountTier, onboardingStatus: "complete" },
      {
        onSuccess: () => {
          navigate({ to: "/trending" });
        },
      }
    );
  };

  const selectSkill = (
    lvl: "beginner" | "intermediate" | "advanced" | "pro"
  ) => {
    setPayload((prev) => ({
      ...prev,
      skillLevel: lvl,
    }));
  };

  const selectCaster = (val: boolean) => {
    setPayload((prev) => ({
      ...prev,
      isCaster: val,
    }));
  };

  const handleBack = () => {
    if (step > 0) {
      setStep((prev) => prev - 1);
    }
  };

  // Check if step indicator click is allowed (clicking back to already visited steps)
  const handleStepClick = (idx: number) => {
    if (idx < step) {
      setStep(idx);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-6">
      <div className="text-center md:text-left">
        <p className="text-sm font-semibold text-primary uppercase tracking-wider">
          RallyCasts setup
        </p>
        <h1 className="mt-2 text-3xl md:text-4xl font-extrabold tracking-tight">
          Build the pickleball feed you wish already existed.
        </h1>
        <p className="text-muted-foreground text-sm max-w-2xl mt-2">
          RallyCasts is video-first, local-first, and player-first. This takes a
          minute, then your courts, clips, players, and events start lining up.
        </p>
      </div>

      {/* Progress Indicators */}
      <div className="relative">
        <div className="absolute top-5 left-0 w-full h-0.5 bg-border -z-10" />
        <div className="grid grid-cols-6 gap-2 text-center">
          {steps.map((item, index) => {
            const isCompleted = index < step;
            const isActive = index === step;
            let circleClass =
              "bg-background border-border text-muted-foreground";
            if (isCompleted) {
              circleClass =
                "bg-primary border-primary text-primary-foreground shadow";
            } else if (isActive) {
              circleClass =
                "bg-background border-primary text-primary ring-4 ring-primary/20 scale-105";
            }
            return (
              <button
                key={item.label}
                onClick={() => handleStepClick(index)}
                disabled={index >= step}
                className="flex flex-col items-center group cursor-pointer focus:outline-none disabled:cursor-not-allowed"
                type="button"
              >
                <div
                  className={`size-10 rounded-full flex items-center justify-center border-2 text-xs font-bold transition-all ${circleClass}`}
                >
                  {isCompleted ? (
                    <Check className="size-4 stroke-[3]" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={`mt-2 text-[10px] sm:text-xs font-medium truncate max-w-[70px] sm:max-w-none ${
                    isActive
                      ? "text-primary font-bold"
                      : "text-muted-foreground group-hover:text-foreground"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Card className="rounded-xl border border-border shadow-md bg-card overflow-hidden">
        <CardContent className="p-6 md:p-8">
          {step === 0 && (
            <AccountInfoStep
              usernameVal={usernameVal}
              setUsernameVal={setUsernameVal}
              nameVal={nameVal}
              setNameVal={setNameVal}
              imageVal={imageVal}
              setImageVal={setImageVal}
              dobVal={dobVal}
              setDobVal={setDobVal}
              isCheckingUsername={isCheckingUsername}
              usernameError={usernameError}
              usernameSuccess={usernameSuccess}
              onContinue={handleSaveUsername}
            />
          )}

          {step === 1 && (
            <GoalsStep
              availability={availability}
              contentFormats={contentFormats}
              goals={goals}
              playStyle={playStyle}
              setAvailability={setAvailability}
              setContentFormats={setContentFormats}
              setGoals={setGoals}
              setPlayStyle={setPlayStyle}
              frequency={frequency}
              setFrequency={setFrequency}
              isPlayer={payload.isPlayer ?? true}
              setIsPlayer={(val) =>
                setPayload((p) => ({ ...p, isPlayer: val }))
              }
              isOrganizer={payload.isOrganizer ?? false}
              setIsOrganizer={(val) =>
                setPayload((p) => ({ ...p, isOrganizer: val }))
              }
              onContinue={handleGoalsSubmit}
              onBack={handleBack}
            />
          )}

          {step === 2 && (
            <HomeCourtStep
              payload={payload}
              setPayload={setPayload}
              onContinue={() => setStep(3)}
              onBack={handleBack}
            />
          )}

          {step === 3 && (
            <SkillLevelStep
              skillLevel={payload.skillLevel}
              setSkillLevel={selectSkill}
              onContinue={() => setStep(4)}
              onBack={handleBack}
            />
          )}

          {step === 4 && (
            <CasterStep
              isCaster={payload.isCaster ?? false}
              setIsCaster={selectCaster}
              onContinue={() => setStep(5)}
              onBack={handleBack}
            />
          )}

          {step === 5 && <PlanStep finish={finish} onBack={handleBack} />}
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute("/_auth/onboarding")({
  component: OnboardingPage,
});
