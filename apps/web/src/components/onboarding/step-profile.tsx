import { debounce } from "@tanstack/pacer";
import { useStore } from "@tanstack/react-form";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Loader2,
  Sparkles,
  User,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import { withForm } from "@/lib/hooks/onboarding-form";
import { parseDateOfBirth } from "@/lib/onboarding-profile";

import { DateOfBirthPicker } from "./dob-picker";
import { wizardFormOpts } from "./shared-form";

const PRESET_AVATARS = [
  {
    emoji: "🎾",
    end: "#10b981",
    name: "The Dink Master",
    start: "#a3e635",
  },
  {
    emoji: "🏆",
    end: "#d946ef",
    name: "Tournament Champ",
    start: "#8b5cf6",
  },
  {
    emoji: "😎",
    end: "#06b6d4",
    name: "Baseline Cool",
    start: "#3b82f6",
  },
  {
    emoji: "⚡",
    end: "#ef4444",
    name: "The Erne",
    start: "#f59e0b",
  },
  {
    emoji: "👟",
    end: "#e11d48",
    name: "Fast Feet",
    start: "#fda4af",
  },
  {
    emoji: "🥇",
    end: "#d97706",
    name: "Golden Pickle",
    start: "#fbbf24",
  },
  {
    emoji: "🍳",
    end: "#f97316",
    name: "Kitchen Fire",
    start: "#fbbf24",
  },
  {
    emoji: "🎯",
    end: "#0284c7",
    name: "Third Shot Drop",
    start: "#38bdf8",
  },
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

export const StepProfile = withForm({
  ...wizardFormOpts,
  props: {
    setStep: (() => null) as (step: number) => void,
    step: 0,
  },
  render: function render({ form, setStep }) {
    const { data: session } = authClient.useSession();
    const [usernameError, setUsernameError] = useState<string | null>(null);
    const [usernameSuccess, setUsernameSuccess] = useState(false);
    const [usernameSource, setUsernameSource] = useState<
      "bloom_filter" | "database" | "current_user" | null
    >(null);
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const [nameError, setNameError] = useState<string | null>(null);
    const [dobError, setDobError] = useState<string | null>(null);

    const profileValues = useStore(form.store, (state) => state.values.profile);
    const usernameValue = profileValues.username || "";
    const nameValue = profileValues.name || "";
    const dobValue = profileValues.dob || "";
    const imageValue = profileValues.image || "";

    // Sync session data into form defaults on mount
    useEffect(() => {
      if (session?.user) {
        if (session.user.name && !form.getFieldValue("profile.name")) {
          form.setFieldValue("profile.name", session.user.name);
        }
        if (session.user.username && !form.getFieldValue("profile.username")) {
          form.setFieldValue("profile.username", session.user.username);
        }
        if (session.user.image && !form.getFieldValue("profile.image")) {
          form.setFieldValue("profile.image", session.user.image);
        }
      }
    }, [session?.user, form]);

    // Debounced username availability check using TanStack Pacer
    const debouncedCheck = useMemo(
      () =>
        debounce(
          async (username: string) => {
            setIsCheckingUsername(true);
            setUsernameError(null);
            try {
              const res = await apiClient.api.v1.profile["check-username"].$get(
                {
                  query: { username },
                }
              );
              if (res.ok) {
                const data = (await res.json()) as {
                  available: boolean;
                  isCurrent?: boolean;
                  source?: "bloom_filter" | "database" | "current_user";
                };
                if (data.available) {
                  setUsernameSuccess(true);
                  setUsernameSource(data.source ?? "database");
                  setUsernameError(null);
                } else {
                  setUsernameSuccess(false);
                  setUsernameSource(null);
                  setUsernameError("Username is already taken");
                }
              } else {
                setUsernameSuccess(false);
                setUsernameSource(null);
                setUsernameError("Failed to verify username");
              }
            } catch {
              setUsernameSuccess(false);
              setUsernameSource(null);
              setUsernameError("Failed to verify username");
            } finally {
              setIsCheckingUsername(false);
            }
          },
          { wait: 350 }
        ),
      []
    );

    useEffect(() => {
      const cleanUsername = usernameValue.trim().toLowerCase();
      if (!cleanUsername || cleanUsername.length < 3) {
        setUsernameError(null);
        setUsernameSuccess(false);
        setUsernameSource(null);
        return;
      }

      const validChars = /^[a-zA-Z0-9_]+$/u.test(cleanUsername);
      if (!validChars) {
        setUsernameError(
          "Username can only contain letters, numbers, and underscores"
        );
        setUsernameSuccess(false);
        setUsernameSource(null);
        return;
      }

      if (
        session?.user?.username &&
        session.user.username.toLowerCase() === cleanUsername
      ) {
        setUsernameError(null);
        setUsernameSuccess(true);
        setUsernameSource("current_user");
        return;
      }

      debouncedCheck(cleanUsername);
    }, [usernameValue, session?.user?.username, debouncedCheck]);

    const parsedDob = useMemo(
      () => (dobValue ? parseDateOfBirth(dobValue) : null),
      [dobValue]
    );

    const handleContinue = () => {
      let hasError = false;

      // Validate name
      if (!nameValue.trim() || nameValue.trim().length < 2) {
        setNameError("Full name must be at least 2 characters");
        hasError = true;
      } else {
        setNameError(null);
      }

      // Validate username
      if (!usernameValue.trim() || usernameValue.trim().length < 3) {
        setUsernameError("Username must be at least 3 characters");
        hasError = true;
      } else if (!/^[a-zA-Z0-9_]+$/u.test(usernameValue.trim())) {
        setUsernameError(
          "Username can only contain letters, numbers, and underscores"
        );
        hasError = true;
      } else if (!usernameSuccess && !isCheckingUsername) {
        setUsernameError("Please choose an available username");
        hasError = true;
      }

      // Validate DOB
      if (!dobValue) {
        setDobError("Date of birth is required");
        hasError = true;
      } else if (!parsedDob) {
        setDobError("Please enter a valid date of birth (MM/DD/YYYY)");
        hasError = true;
      } else if (parsedDob.age < 13) {
        setDobError("Players must be at least 13 years old to join RallyCasts");
        hasError = true;
      } else if (parsedDob.age > 120) {
        setDobError("Please enter a valid date of birth");
        hasError = true;
      } else {
        setDobError(null);
      }

      if (hasError) {
        toast.error("Please complete all required fields correctly.");
        return;
      }

      setStep(1);
    };

    return (
      <form.FormGroup name="profile" onGroupSubmit={handleContinue}>
        {(formGroup) => (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              formGroup.handleSubmit();
            }}
          >
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-bold tracking-tight">
                  Who are you on the courts?
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Pick your avatar and handle so other players can find,
                  challenge, and team up with you.
                </p>
              </div>

              {/* Player Card Live Preview */}
              <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-linear-to-r from-primary/10 via-primary/5 to-background p-4 shadow-xs">
                <div className="flex items-center gap-3.5">
                  <div className="size-14 rounded-full border-2 border-primary/40 p-0.5 shrink-0 bg-background shadow-inner flex items-center justify-center overflow-hidden">
                    {imageValue ? (
                      <img
                        alt="Avatar preview"
                        className="size-full rounded-full object-cover"
                        src={imageValue}
                      />
                    ) : (
                      <span className="text-2xl select-none">🎾</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold truncate">
                        {nameValue || "Your Name"}
                      </p>
                      <span className="inline-flex items-center rounded-full bg-brand-yellow/15 border border-brand-yellow/30 px-2 py-0.2 text-[10px] font-semibold text-brand-yellow">
                        Player
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      @{usernameValue || "handle"}
                      {parsedDob ? ` • Age ${parsedDob.age}` : ""}
                    </p>
                  </div>
                </div>
              </div>

              {/* Avatar Selector */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Pick your court avatar
                  </span>
                  {imageValue && (
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground underline transition-colors cursor-pointer"
                      onClick={() => form.setFieldValue("profile.image", "")}
                      type="button"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {PRESET_AVATARS.map((preset) => {
                    const svgDataUrl = generateEmojiAvatar(
                      preset.emoji,
                      preset.start,
                      preset.end
                    );
                    const isSelected = imageValue === svgDataUrl;
                    let avatarCardClass =
                      "border-border/70 bg-card/60 hover:border-primary/50 hover:bg-muted/30";
                    if (isSelected) {
                      avatarCardClass =
                        "border-primary bg-primary/10 shadow-xs ring-2 ring-primary/40 scale-[1.02]";
                    }

                    return (
                      <button
                        key={preset.emoji}
                        className={`group relative flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-all cursor-pointer ${avatarCardClass}`}
                        onClick={() => {
                          form.setFieldValue("profile.image", svgDataUrl);
                        }}
                        title={preset.name}
                        type="button"
                      >
                        <div
                          className="size-10 sm:size-11 rounded-full flex items-center justify-center text-lg sm:text-xl shadow-xs transition-transform group-hover:scale-105"
                          style={{
                            background: `linear-gradient(135deg, ${preset.start}, ${preset.end})`,
                          }}
                        >
                          <span className="select-none">{preset.emoji}</span>
                        </div>
                        <span className="text-[10px] font-medium text-center truncate max-w-full text-muted-foreground group-hover:text-foreground">
                          {preset.name}
                        </span>
                        {isSelected && (
                          <div className="absolute top-1 right-1 rounded-full bg-primary text-primary-foreground p-0.5 shadow-xs">
                            <Check className="size-2.5 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Full Name Input */}
              <form.AppField name="profile.name">
                {(field) => (
                  <field.FormInput
                    error={nameError ?? undefined}
                    label="Full Name"
                    placeholder="e.g. Cameron Stewart"
                    required={true}
                  />
                )}
              </form.AppField>

              {/* Username Input with Rich Live Bloom Filter & DB Feedback */}
              <div className="space-y-1.5">
                <form.AppField name="profile.username">
                  {(field) => (
                    <field.FormInput
                      error={usernameError ?? undefined}
                      hint="Allowed: letters, numbers, and underscores (3-30 characters)."
                      label="Username (@handle)"
                      placeholder="e.g. cgstewart"
                      required={true}
                    />
                  )}
                </form.AppField>

                {/* Status indicator badges */}
                <div className="pt-0.5">
                  {renderUsernameStatus({
                    isCheckingUsername,
                    usernameError,
                    usernameSource,
                    usernameSuccess,
                    usernameValue,
                  })}
                </div>
              </div>

              {/* Date of Birth Picker */}
              <DateOfBirthPicker
                error={dobError ?? undefined}
                onChange={(val) => {
                  form.setFieldValue("profile.dob", val);
                  if (dobError) {
                    setDobError(null);
                  }
                }}
                required={true}
                value={dobValue}
              />

              {/* Action Button */}
              <div className="flex justify-end pt-2">
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-xs transition-all hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                  onClick={handleContinue}
                  type="button"
                >
                  Continue to Location
                  <Check className="size-4 stroke-[2.5]" />
                </button>
              </div>
            </div>
          </form>
        )}
      </form.FormGroup>
    );
  },
});

function renderUsernameStatus({
  isCheckingUsername,
  usernameError,
  usernameSource,
  usernameSuccess,
  usernameValue,
}: {
  isCheckingUsername: boolean;
  usernameError: string | null;
  usernameSource: "bloom_filter" | "database" | "current_user" | null;
  usernameSuccess: boolean;
  usernameValue: string;
}) {
  if (isCheckingUsername) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground animate-pulse">
        <Loader2 className="size-3.5 animate-spin" />
        <span>Checking availability...</span>
      </div>
    );
  }

  if (usernameSuccess && usernameSource === "bloom_filter") {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-xs text-emerald-400 font-medium">
        <Sparkles className="size-3 text-emerald-400 shrink-0" />
        <span>@{usernameValue} is available (verified via bloom filter)</span>
      </div>
    );
  }

  if (usernameSuccess && usernameSource === "current_user") {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 border border-primary/25 px-2 py-0.5 text-xs text-primary font-medium">
        <User className="size-3 text-primary shrink-0" />
        <span>@{usernameValue} (your current account handle)</span>
      </div>
    );
  }

  if (usernameSuccess && !usernameError) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-xs text-emerald-400 font-medium">
        <CheckCircle2 className="size-3 text-emerald-400 shrink-0" />
        <span>@{usernameValue} is available</span>
      </div>
    );
  }

  if (usernameError) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-md bg-destructive/10 border border-destructive/25 px-2 py-0.5 text-xs text-destructive font-medium">
        <AlertCircle className="size-3 text-destructive shrink-0" />
        <span>{usernameError}</span>
      </div>
    );
  }

  return null;
}
