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
  ChevronLeft,
  ChevronRight,
  Search,
  Users,
  Calendar,
  X,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { z } from "zod";

import { authClient } from "@/lib/auth-client";
import { useOnboarding, useProfile } from "@/lib/hooks";
import type { ProfilePayload } from "@/lib/hooks";

// Definition for Radar address suggestions
interface RadarAddress {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  addressLabel?: string;
  city?: string;
  stateCode?: string;
  countryCode?: string;
  placeId?: string;
  addressId?: string;
}

// Popular pickleball locations across the country as a fallback mock database
const mockCourts: RadarAddress[] = [
  {
    addressLabel: "Austin Tennis & Pickleball Center",
    city: "Austin",
    countryCode: "US",
    formattedAddress: "Austin Tennis & Pickleball Center, Austin, TX",
    latitude: 30.3582,
    longitude: -97.6853,
    placeId: "mock_place_austin_atpc",
    stateCode: "TX",
  },
  {
    addressLabel: "Millennium Park Pickleball Courts",
    city: "Chicago",
    countryCode: "US",
    formattedAddress: "Millennium Park Pickleball Courts, Chicago, IL",
    latitude: 41.8827,
    longitude: -87.6227,
    placeId: "mock_place_chicago_millennium",
    stateCode: "IL",
  },
  {
    addressLabel: "Little Lytle Park Pickleball",
    city: "Cincinnati",
    countryCode: "US",
    formattedAddress: "Little Lytle Park Pickleball, Cincinnati, OH",
    latitude: 39.0988,
    longitude: -84.5072,
    placeId: "mock_place_cincy_lytle",
    stateCode: "OH",
  },
  {
    addressLabel: "Bobby Riggs Racket & Paddle",
    city: "San Diego",
    countryCode: "US",
    formattedAddress: "Bobby Riggs Racket & Paddle, San Diego, CA",
    latitude: 33.0415,
    longitude: -117.2687,
    placeId: "mock_place_sd_riggs",
    stateCode: "CA",
  },
  {
    addressLabel: "Chicken N Pickle",
    city: "Kansas City",
    countryCode: "US",
    formattedAddress: "Chicken N Pickle, Kansas City, MO",
    latitude: 39.1438,
    longitude: -94.5772,
    placeId: "mock_place_kc_chicken",
    stateCode: "MO",
  },
  {
    addressLabel: "Central Park Courts",
    city: "New York",
    countryCode: "US",
    formattedAddress: "Central Park Courts, New York, NY",
    latitude: 40.7851,
    longitude: -73.9683,
    placeId: "mock_place_ny_central",
    stateCode: "NY",
  },
  {
    addressLabel: "Pioneer Park Courts",
    city: "Salt Lake City",
    countryCode: "US",
    formattedAddress: "Pioneer Park Courts, Salt Lake City, UT",
    latitude: 40.7618,
    longitude: -111.9016,
    placeId: "mock_place_slc_pioneer",
    stateCode: "UT",
  },
  {
    addressLabel: "Plaza Park Pickleball",
    city: "Las Vegas",
    countryCode: "US",
    formattedAddress: "Plaza Park Pickleball, Las Vegas, NV",
    latitude: 36.1699,
    longitude: -115.1398,
    placeId: "mock_place_lv_plaza",
    stateCode: "NV",
  },
  {
    addressLabel: "El Dorado Park Pickleball Courts",
    city: "Long Beach",
    countryCode: "US",
    formattedAddress: "El Dorado Park Pickleball Courts, Long Beach, CA",
    latitude: 33.8183,
    longitude: -118.0864,
    placeId: "mock_place_lb_eldorado",
    stateCode: "CA",
  },
  {
    addressLabel: "Water Front Park Pickleball",
    city: "Seattle",
    countryCode: "US",
    formattedAddress: "Water Front Park Pickleball, Seattle, WA",
    latitude: 47.6062,
    longitude: -122.3321,
    placeId: "mock_place_sea_waterfront",
    stateCode: "WA",
  },
];

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

const ageSchema = z
  .number()
  .int("Age must be a whole number")
  .min(5, "Age must be at least 5")
  .max(115, "Age must be at most 115");

function getDateParts(
  input: string,
  clean: string
): { month: number; day: number; year: number } | null {
  if (clean.length === 6) {
    const month = Number.parseInt(clean.slice(0, 2), 10);
    const day = Number.parseInt(clean.slice(2, 4), 10);
    const yy = Number.parseInt(clean.slice(4, 6), 10);
    const year = yy > 26 ? 1900 + yy : 2000 + yy;
    return { day, month, year };
  }

  if (clean.length === 8) {
    const possibleYear = Number.parseInt(clean.slice(0, 4), 10);
    if (possibleYear >= 1900 && possibleYear <= 2100) {
      const month = Number.parseInt(clean.slice(4, 6), 10);
      const day = Number.parseInt(clean.slice(6, 8), 10);
      return { day, month, year: possibleYear };
    }
    const month = Number.parseInt(clean.slice(0, 2), 10);
    const day = Number.parseInt(clean.slice(2, 4), 10);
    const year = Number.parseInt(clean.slice(4, 8), 10);
    return { day, month, year };
  }

  const parts = input.split(/[/\-.]/u);
  if (parts.length !== 3) {
    return null;
  }
  const [p0, p1, yStr] = parts;
  if (!p0 || !p1 || !yStr) {
    return null;
  }

  const firstNum = Number.parseInt(p0, 10);
  if (firstNum >= 1900 && firstNum <= 2100) {
    const month = Number.parseInt(p1, 10);
    const day = Number.parseInt(yStr, 10);
    return { day, month, year: firstNum };
  }

  const month = Number.parseInt(p0, 10);
  const day = Number.parseInt(p1, 10);
  let year = 0;
  if (yStr.length === 2) {
    const yy = Number.parseInt(yStr, 10);
    year = yy > 26 ? 1900 + yy : 2000 + yy;
  } else if (yStr.length === 4) {
    year = Number.parseInt(yStr, 10);
  } else {
    return null;
  }

  return { day, month, year };
}

// Parses Date of Birth from text input (MMDDYY, MMDDYYYY, or MM/DD/YYYY formats)
function parseDOB(input: string): { age: number; formatted: string } | null {
  const clean = input.replaceAll(/\D/gu, "");
  const parts = getDateParts(input, clean);
  if (!parts) {
    return null;
  }
  const { month, day, year } = parts;

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const dateObj = new Date(year, month - 1, day);
  if (dateObj.getMonth() !== month - 1 || dateObj.getDate() !== day) {
    return null;
  }

  const today = new Date();
  let computedAge = today.getFullYear() - year;
  const m = today.getMonth() - (month - 1);
  if (m < 0 || (m === 0 && today.getDate() < day)) {
    computedAge -= 1;
  }

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const formatted = `${months[month - 1]} ${day}, ${year}`;

  return { age: computedAge, formatted };
}

function getAgeValidation(
  dobVal: string,
  parsedDOB: ReturnType<typeof parseDOB>
) {
  if (dobVal === "") {
    return { ageErrorText: null, isAgeValid: false };
  }
  if (!parsedDOB) {
    return {
      ageErrorText:
        "Please enter a valid date of birth (MM/DD/YYYY or MMDDYY).",
      isAgeValid: false,
    };
  }
  const ageResult = ageSchema.safeParse(parsedDOB.age);
  if (ageResult.success) {
    return { ageErrorText: null, isAgeValid: true };
  }
  return {
    ageErrorText: ageResult.error.issues[0]?.message || "Invalid age",
    isAgeValid: false,
  };
}

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
  const parsedDOB = parseDOB(dobVal);

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

  const { isAgeValid, ageErrorText } = getAgeValidation(dobVal, parsedDOB);

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
    isAgeValid &&
    !!parsedDOB &&
    nameResult.success;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Create your player profile
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          RallyCasts is a social pickleball community. Let's start with your
          profile details.
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
              <Check className="size-3" /> Validated: {parsedDOB.formatted}{" "}
              (Age: {parsedDOB.age})
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Enter your date of birth. This will determine your age group.
            </p>
          )}
          {ageErrorText && (
            <p className="text-xs text-destructive font-medium">
              {ageErrorText}
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
  goals: string[];
  setGoals: React.Dispatch<React.SetStateAction<string[]>>;
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
    desc: "Compete in leagues and local bracket play.",
    icon: <Trophy className="size-4" />,
    id: "tournaments",
    label: "Find Tournaments",
  },
  {
    desc: "Meet other local pickleballers matching your level.",
    icon: <Users className="size-4" />,
    id: "players",
    label: "Find Players",
  },
  {
    desc: "Browse open play, clinics, and social meetups.",
    icon: <Calendar className="size-4" />,
    id: "events",
    label: "Discover Events",
  },
  {
    desc: "Locate court facilities wherever you travel.",
    icon: <MapPin className="size-4" />,
    id: "parks",
    label: "Find Parks & Courts",
  },
];

const FREQ_OPTIONS = [
  { id: "daily", label: "⚡ Everyday" },
  { id: "weekly", label: "🎾 2-3 times a week" },
  { id: "few_times_month", label: "🗓️ Once a week" },
  { id: "occasionally", label: "☕ Occasionally / Just starting" },
];

function GoalsStep({
  goals,
  setGoals,
  frequency,
  setFrequency,
  isPlayer,
  setIsPlayer,
  isOrganizer,
  setIsOrganizer,
  onContinue,
  onBack,
}: GoalsStepProps) {
  const toggleGoal = (id: string) => {
    setGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const isRoleValid = isPlayer || isOrganizer;
  const isGoalsValid = goals.length > 0;
  const isFreqValid = frequency !== "";
  const canContinue = isRoleValid && isGoalsValid && isFreqValid;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          What gets you on the court?
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Tell us about your pickleball routine so we can curate the ultimate
          feed for you.
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
                  Find matches, join open plays, and track your rating.
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
                  Host tournaments, organize leagues, and manage pickleball
                  parks.
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
                    Rally Free Organizer
                  </span>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Create up to 2 active events</li>
                    <li>Invite up to 32 players per event</li>
                    <li>Basic park court info pages</li>
                  </ul>
                </div>
                <div>
                  <span className="font-bold text-yellow-600 dark:text-yellow-500 block mb-0.5">
                    Rally Premium Organizer
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
            What are you looking for?{" "}
            <span className="text-destructive">*</span>
          </Label>
          <div className="grid gap-3 sm:grid-cols-2">
            {INTERESTS_OPTIONS.map((opt) => {
              const isSelected = goals.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggleGoal(opt.id)}
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
            How often do you hit the courts?{" "}
            <span className="text-destructive">*</span>
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

function HomeCourtStep({
  payload,
  setPayload,
  onContinue,
  onBack,
}: CourtStepProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 400);
  const [suggestions, setSuggestions] = useState<RadarAddress[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Custom manual court inputs
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualCity, setManualCity] = useState("");
  const [manualState, setManualState] = useState("");

  const radarKey = import.meta.env.VITE_RADAR_PUBLISHABLE_KEY || "";

  useEffect(() => {
    if (debouncedQuery.length < 3) {
      setSuggestions([]);
      return;
    }

    let active = true;
    setIsLoading(true);

    const fetchRadarSuggestions = async () => {
      if (!radarKey) {
        // Fallback to local mock search when key is not defined
        const term = debouncedQuery.toLowerCase();
        const matches = mockCourts.filter(
          (c) =>
            c.formattedAddress.toLowerCase().includes(term) ||
            c.addressLabel?.toLowerCase().includes(term)
        );
        if (active) {
          setSuggestions(matches);
          setIsLoading(false);
        }
        return;
      }

      try {
        const res = await fetch(
          `https://api.radar.io/v1/search/autocomplete?query=${encodeURIComponent(
            debouncedQuery
          )}&limit=6`,
          {
            headers: {
              Authorization: radarKey,
            },
          }
        );
        const data = await res.json();
        if (active && data.addresses) {
          setSuggestions(data.addresses);
        }
      } catch {
        // Fallback to mock search on error
        const term = debouncedQuery.toLowerCase();
        const matches = mockCourts.filter(
          (c) =>
            c.formattedAddress.toLowerCase().includes(term) ||
            c.addressLabel?.toLowerCase().includes(term)
        );
        if (active) {
          setSuggestions(matches);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    fetchRadarSuggestions();

    return () => {
      active = false;
    };
  }, [debouncedQuery, radarKey]);

  const selectAddress = (addr: RadarAddress) => {
    setPayload((prev) => ({
      ...prev,
      homeCity: addr.city || "Unknown",
      homeCourtName: addr.addressLabel || addr.formattedAddress,
      homeLatitude: addr.latitude,
      homeLongitude: addr.longitude,
      homeState: addr.stateCode || addr.state || "US",
      radarAddressId: addr.addressId || "",
      radarPlaceId: addr.placeId || "",
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
      // Default backup coords
      homeLatitude: 37.7749,
      homeLongitude: -122.4194,
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
        Searching Radar index...
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
            key={addr.placeId || idx}
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
          Select your home court
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          RallyCasts will use this to show tournaments, local events, and nearby
          players first.
        </p>
      </div>

      <div className="space-y-5">
        <div className="relative">
          <Label htmlFor="court-search" className="mb-2 block">
            Search for pickleball courts, parks or addresses{" "}
            <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input
              id="court-search"
              placeholder="Search by venue name, e.g. Millennium Park"
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
                    Coordinates: {payload.homeLatitude.toFixed(4)}° N,{" "}
                    {payload.homeLongitude.toFixed(4)}° W
                  </span>
                )}
              </div>
              <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-semibold">
                {payload.radarAddressId === "manual"
                  ? "Custom Entry"
                  : "Radar Verified"}
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
          Select your pickleball skill level
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          RallyCasts connects players of similar levels. Select your rating
          range to get accurate matches.
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
          Do you want caster tools?
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Casters record, stream, or commentate on matches and can earn payouts
          on RallyCasts.
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
          <h4 className="font-bold text-sm">I want to cast</h4>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed max-w-[200px]">
            Enable streaming dashboard, client booking schedules, and earn
            payout tools.
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
          <h4 className="font-bold text-sm">Maybe later</h4>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed max-w-[200px]">
            Keep my dashboard focused on the standard player matching and court
            feeds.
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
          Choose your subscription plan
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Start for free or unlock the premium tier to power up your social
          pickleball experience.
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
              <h3 className="text-xl font-bold">Rally Free</h3>
              <span className="text-xs font-semibold px-2 py-0.5 bg-muted text-muted-foreground rounded-full">
                Active
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Perfect for casual players looking to discover and connect
              locally.
            </p>
            <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <Check className="size-3.5 text-primary shrink-0" /> Find local
                courts & parks
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-3.5 text-primary shrink-0" /> Match with
                players of your skill
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-3.5 text-primary shrink-0" /> Join local
                open play sessions
              </li>
            </ul>
          </div>
          <Button className="w-full mt-6 rounded-md" variant="outline">
            Choose Free
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
                Rally Premium <Sparkles className="size-4 text-yellow-500" />
              </h3>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              For serious players, league coordinators, and casters.
            </p>
            <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
              <li className="flex items-center gap-2 text-foreground font-medium">
                <Check className="size-3.5 text-yellow-500 shrink-0" /> Priority
                discovery placement
              </li>
              <li className="flex items-center gap-2 text-foreground font-medium">
                <Check className="size-3.5 text-yellow-500 shrink-0" /> Rich
                player & court analytics
              </li>
              <li className="flex items-center gap-2 text-foreground font-medium">
                <Check className="size-3.5 text-yellow-500 shrink-0" /> Custom
                event creator tools
              </li>
              <li className="flex items-center gap-2 text-foreground font-medium">
                <Check className="size-3.5 text-yellow-500 shrink-0" /> Earning
                commission tools
              </li>
            </ul>
          </div>
          <Button className="w-full mt-6 rounded-md bg-yellow-500 hover:bg-yellow-600 text-black font-semibold border-0">
            Upgrade to Premium
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

// ---------------------------------------------------------------------
// MAIN PAGE COMPONENT
// ---------------------------------------------------------------------
const steps = [
  { label: "Profile" },
  { label: "Interests" },
  { label: "Home Court" },
  { label: "Skill Level" },
  { label: "Caster" },
  { label: "Plan" },
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

  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameSuccess, setUsernameSuccess] = useState<boolean>(false);

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
      const p = profileData.profile;
      setPayload((prev) => ({
        ...prev,
        accountTier: p.accountTier ?? "free",
        age: p.age ?? undefined,
        homeCity: p.homeCity ?? "",
        homeCourtName: p.homeCourtName ?? "",
        homeLatitude: p.homeLatitude ?? undefined,
        homeLongitude: p.homeLongitude ?? undefined,
        homeState: p.homeState ?? "",
        isCaster: p.isCaster ?? false,
        isOrganizer: p.isOrganizer ?? false,
        isPlayer: p.isPlayer ?? true,
        radarAddressId: p.radarAddressId ?? "",
        radarPlaceId: p.radarPlaceId ?? "",
        skillLevel: p.skillLevel ?? undefined,
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

  // Compile interests/goals & play frequency into a bio summaries
  const handleGoalsSubmit = () => {
    const activeGoals = goals
      .map((g) => {
        const option = INTERESTS_OPTIONS.find((o) => o.id === g);
        return option ? option.label : "";
      })
      .filter(Boolean)
      .join(", ");

    const freqOption = FREQ_OPTIONS.find((f) => f.id === frequency);
    const freqLabel = freqOption ? freqOption.label : "";

    const userBio = `Goals: Looking for ${activeGoals.toLowerCase()}. Plays ${freqLabel.toLowerCase()}.`;

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
          RallyCasts onboarding
        </p>
        <h1 className="mt-2 text-3xl md:text-4xl font-extrabold tracking-tight">
          Tune your feed to the courts you care about.
        </h1>
        <p className="text-muted-foreground text-sm max-w-2xl mt-2">
          Tell us where you play and what you're looking for to tailor your
          match notifications, local events feed, and court recommendations.
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
              goals={goals}
              setGoals={setGoals}
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
