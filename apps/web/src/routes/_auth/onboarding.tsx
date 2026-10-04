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
        <div className="bg-primary/10 size-96 rounded-full blur-3xl" />
        <div className="bg-brand-yellow/5 absolute size-72 rounded-full blur-2xl" />
      </div>

      {/* Header */}
      <div className="space-y-2 text-center md:text-left">
        <div className="bg-primary/15 border-primary/30 text-primary inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold tracking-wider uppercase">
          <span>🎾 RallyCasts Setup</span>
          <span className="text-primary/60">•</span>
          <span>Takes 60 seconds</span>
        </div>
        <h1 className="text-foreground text-3xl font-extrabold tracking-tight sm:text-4xl">
          Build the pickleball feed you wish already existed.
        </h1>
        <p className="text-muted-foreground max-w-2xl text-xs sm:text-sm">
          RallyCasts is video-first, local-first, and player-first. Personalize
          your courts, tournament brackets, clips, and local community.
        </p>
      </div>

      {/* Progress Bar & Steps Bar */}
      <div className="space-y-4">
        <div className="text-muted-foreground flex items-center justify-between text-xs">
          <span className="text-foreground font-semibold">
            Step {step + 1} of {STEPS.length}: {STEPS[step]?.label}
          </span>
          <span className="text-primary font-mono font-bold">
            {progressPercent}% Complete
          </span>
        </div>

        {/* Progress Bar Line */}
        <div className="bg-border/60 h-1.5 w-full overflow-hidden rounded-full">
          <div
            className="from-primary to-brand-yellow h-full bg-linear-to-r transition-all duration-300 ease-out"
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
                className={`group flex flex-col items-center text-center transition-all ${
                  index < step ? "cursor-pointer" : "cursor-default"
                }`}
                disabled={index > step}
                key={item.label}
                onClick={() => handleStepClick(index)}
                type="button"
              >
                <div
                  className={`flex size-9 items-center justify-center rounded-xl border-2 text-xs font-bold transition-all sm:size-10 ${nodeClass}`}
                >
                  {isCompleted ? (
                    <Check className="size-4 stroke-[3]" />
                  ) : (
                    <Icon className="size-4" />
                  )}
                </div>
                <span
                  className={`mt-1.5 max-w-[70px] truncate text-[11px] font-semibold sm:max-w-none ${getStepLabelColor(
                    isActive,
                    isCompleted
                  )}`}
                >
                  {item.label}
                </span>
                <span className="text-muted-foreground hidden truncate text-[10px] sm:block">
                  {item.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Card with Step Content */}
      <Card className="border-border/80 bg-card/90 overflow-hidden rounded-2xl border shadow-xl backdrop-blur-md">
        <CardContent className="p-6 sm:p-8">
          {isFinalizing ? (
            <div className="animate-in fade-in zoom-in-95 space-y-6 px-4 py-12 text-center duration-500">
              <div className="relative mx-auto size-20">
                <div className="bg-primary/20 absolute inset-0 animate-ping rounded-full" />
                <div className="bg-primary/10 border-primary/30 text-primary shadow-primary/10 relative flex size-20 items-center justify-center rounded-2xl border shadow-lg">
                  <Sparkles className="text-primary size-9 animate-spin [animation-duration:4s]" />
                </div>
              </div>
              <div className="mx-auto max-w-md space-y-2">
                <h3 className="text-foreground text-xl font-bold tracking-tight">
                  Personalizing your pickleball hub...
                </h3>
                <p className="text-muted-foreground text-xs sm:text-sm">
                  Discovering & geocaching courts within 50 miles of{" "}
                  <span className="text-foreground font-semibold">
                    {finalizingCity}
                  </span>
                  , indexing vector search embeddings, and building your feed.
                </p>
              </div>
              <div className="mx-auto max-w-xs space-y-2">
                <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                  <div className="bg-primary h-full w-full animate-pulse" />
                </div>
                <p className="text-muted-foreground text-[11px]">
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
