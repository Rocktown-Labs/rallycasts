import { Card, CardContent } from "@rallycaststv/ui/components/card";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  Check,
  MapPin,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import type { WizardValues } from "@/components/onboarding/shared-form";
import {
  wizardFormOpts,
  wizardSchema,
} from "@/components/onboarding/shared-form";
import { StepGame } from "@/components/onboarding/step-game";
import { StepLocation } from "@/components/onboarding/step-location";
import { StepProfile } from "@/components/onboarding/step-profile";
import { StepRoles } from "@/components/onboarding/step-roles";
import { authClient } from "@/lib/auth-client";
import { useOnboarding } from "@/lib/hooks";
import { useAppForm } from "@/lib/hooks/onboarding-form";
import { LOCATION_STORAGE_KEY } from "@/lib/hooks/use-geolocation";
import { parseDateOfBirth } from "@/lib/onboarding-profile";

const STEPS = [
  { description: "Handle & avatar", icon: User, label: "Profile" },
  { description: "Home venue", icon: MapPin, label: "Location" },
  { description: "Rating & style", icon: Activity, label: "Game" },
  { description: "Platform roles", icon: ShieldCheck, label: "Roles" },
];

function sleep(ms: number): Promise<void> {
  // oxlint-disable-next-line promise/avoid-new -- standalone delay helper for onboarding completion animation
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}

function OnboardingPage() {
  const navigate = useNavigate();
  const onboarding = useOnboarding();
  const [step, setStep] = useState(0);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizingCity, setFinalizingCity] = useState("");

  const form = useAppForm({
    ...wizardFormOpts,
    onSubmit: async ({ value }) => {
      const v = value as WizardValues;
      const targetArea = v.location.homeCity
        ? `${v.location.homeCity}, ${v.location.homeState}`
        : "your area";
      setFinalizingCity(targetArea);
      setIsFinalizing(true);
      try {
        // Update user name/image/username via Better Auth
        await authClient.updateUser({
          image: v.profile.image || null,
          name: v.profile.name,
          username: v.profile.username,
        });

        // Build bio from available data
        const bioParts: string[] = [];
        if (v.game.bio) {
          bioParts.push(v.game.bio);
        }
        const bio = bioParts.join(" ") || undefined;

        // Calculate real age from parsed DOB
        const parsedDob = v.profile.dob
          ? parseDateOfBirth(v.profile.dob)
          : null;
        const calculatedAge = parsedDob?.age ?? 0;

        // Submit onboarding profile
        await onboarding.mutateAsync({
          accountTier: v.roles.accountTier,
          age: calculatedAge,
          bio,
          homeCity: v.location.homeCity,
          homeCourtName: v.location.homeCourtName,
          homeLatitude: v.location.homeLatitude,
          homeLongitude: v.location.homeLongitude,
          homeState: v.location.homeState,
          isCaster: v.roles.isCaster,
          isOrganizer: v.roles.isOrganizer,
          isPlayer: v.roles.isPlayer,
          onboardingStatus: "complete",
          radarPlaceId: v.location.radarPlaceId,
          skillLevel: v.game.skillLevel,
        });

        // Persist the user's home location so all pages instantly know where they play
        if (
          typeof v.location.homeLatitude === "number" &&
          typeof v.location.homeLongitude === "number"
        ) {
          try {
            const loc = {
              city: v.location.homeCity || undefined,
              label: [v.location.homeCity, v.location.homeState]
                .filter(Boolean)
                .join(", "),
              lat: v.location.homeLatitude,
              lng: v.location.homeLongitude,
              stateCode: v.location.homeState || undefined,
            };
            window.localStorage.setItem(
              LOCATION_STORAGE_KEY,
              JSON.stringify(loc)
            );
          } catch {
            // Ignore storage write error
          }
        }

        // Brief pause to allow the background geocache & embeddings to spin up
        await sleep(1500);
        toast.success("Welcome to RallyCasts! Your feed is ready.");
        navigate({ to: "/u/me" });
      } catch (error) {
        setIsFinalizing(false);
        const message =
          error instanceof Error
            ? error.message
            : "Failed to complete onboarding";
        toast.error(message);
      }
    },
    validators: {
      onSubmit: wizardSchema,
    },
  });

  const handleStepClick = (idx: number) => {
    if (idx < step) {
      setStep(idx);
    }
  };

  const progressPercent = Math.round(((step + 1) / STEPS.length) * 100);

  return (
    <div className="relative mx-auto max-w-3xl space-y-8 px-4 py-8">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <div className="size-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute size-72 rounded-full bg-brand-yellow/5 blur-2xl" />
      </div>

      {/* Header */}
      <div className="space-y-2 text-center md:text-left">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 border border-primary/30 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
          <span>🎾 RallyCasts Setup</span>
          <span className="text-primary/60">•</span>
          <span>Takes 60 seconds</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          Build the pickleball feed you wish already existed.
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm max-w-2xl">
          RallyCasts is video-first, local-first, and player-first. Personalize
          your courts, tournament brackets, clips, and local community.
        </p>
      </div>

      {/* Progress Bar & Steps Bar */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">
            Step {step + 1} of {STEPS.length}: {STEPS[step]?.label}
          </span>
          <span className="font-mono text-primary font-bold">
            {progressPercent}% Complete
          </span>
        </div>

        {/* Progress Bar Line */}
        <div className="h-1.5 w-full rounded-full bg-border/60 overflow-hidden">
          <div
            className="h-full bg-linear-to-r from-primary to-brand-yellow transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Interactive Step Nodes */}
        <div className="grid grid-cols-4 gap-2">
          {STEPS.map((item, index) => {
            const isCompleted = index < step;
            const isActive = index === step;
            const Icon = item.icon;

            let nodeClass =
              "bg-muted/40 border-border/80 text-muted-foreground";
            if (isCompleted) {
              nodeClass =
                "bg-primary border-primary text-primary-foreground shadow-xs";
            } else if (isActive) {
              nodeClass =
                "bg-background border-primary text-primary ring-4 ring-primary/20 scale-[1.03]";
            }

            return (
              <button
                className={`flex flex-col items-center group transition-all text-center ${
                  index < step ? "cursor-pointer" : "cursor-default"
                }`}
                disabled={index > step}
                key={item.label}
                onClick={() => handleStepClick(index)}
                type="button"
              >
                <div
                  className={`size-9 sm:size-10 rounded-xl flex items-center justify-center border-2 text-xs font-bold transition-all ${nodeClass}`}
                >
                  {isCompleted ? (
                    <Check className="size-4 stroke-[3]" />
                  ) : (
                    <Icon className="size-4" />
                  )}
                </div>
                <span
                  className={`mt-1.5 text-[11px] font-semibold truncate max-w-[70px] sm:max-w-none ${getStepLabelColor(
                    isActive,
                    isCompleted
                  )}`}
                >
                  {item.label}
                </span>
                <span className="hidden sm:block text-[10px] text-muted-foreground truncate">
                  {item.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Card with Step Content */}
      <Card className="rounded-2xl border border-border/80 shadow-xl bg-card/90 backdrop-blur-md overflow-hidden">
        <CardContent className="p-6 sm:p-8">
          {isFinalizing ? (
            <div className="py-12 px-4 text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
              <div className="relative mx-auto size-20">
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                <div className="relative size-20 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shadow-lg shadow-primary/10">
                  <Sparkles className="size-9 text-primary animate-spin [animation-duration:4s]" />
                </div>
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-xl font-bold tracking-tight text-foreground">
                  Personalizing your pickleball hub...
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Discovering & geocaching courts within 50 miles of{" "}
                  <span className="font-semibold text-foreground">
                    {finalizingCity}
                  </span>
                  , indexing vector search embeddings, and building your feed.
                </p>
              </div>
              <div className="max-w-xs mx-auto space-y-2">
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary animate-pulse w-full" />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Setting up your Player Hub...
                </p>
              </div>
            </div>
          ) : (
            <>
              {step === 0 && (
                <StepProfile form={form} setStep={setStep} step={0} />
              )}
              {step === 1 && (
                <StepLocation form={form} setStep={setStep} step={1} />
              )}
              {step === 2 && (
                <StepGame form={form} setStep={setStep} step={2} />
              )}
              {step === 3 && (
                <StepRoles
                  form={form}
                  onFinish={() => form.handleSubmit()}
                  setStep={setStep}
                  step={3}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute("/_auth/onboarding")({
  component: OnboardingPage,
});

function getStepLabelColor(isActive: boolean, isCompleted: boolean): string {
  if (isActive) {
    return "text-primary font-bold";
  }
  if (isCompleted) {
    return "text-foreground";
  }
  return "text-muted-foreground";
}
