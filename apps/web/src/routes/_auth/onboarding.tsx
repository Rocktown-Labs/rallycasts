import { Card, CardContent } from "@rallycaststv/ui/components/card";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check } from "lucide-react";
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

const STEPS = [
  { label: "Profile" },
  { label: "Location" },
  { label: "Game" },
  { label: "Roles" },
];

function OnboardingPage() {
  const navigate = useNavigate();
  const onboarding = useOnboarding();
  const [step, setStep] = useState(0);

  const form = useAppForm({
    ...wizardFormOpts,
    onSubmit: async ({ value }) => {
      const v = value as WizardValues;
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

        // Submit onboarding profile
        await onboarding.mutateAsync({
          accountTier: v.roles.accountTier,
          // Age parsing from DOB can be added here when needed
          age: 0,
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

        toast.success("Welcome to RallyCasts!");
        navigate({ to: "/u/me" });
      } catch (error) {
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
        <div className="grid grid-cols-4 gap-2 text-center">
          {STEPS.map((item, index) => {
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
                className="flex flex-col items-center group cursor-pointer focus:outline-none disabled:cursor-not-allowed"
                disabled={index >= step}
                key={item.label}
                onClick={() => handleStepClick(index)}
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
          {step === 0 && <StepProfile form={form} setStep={setStep} step={0} />}
          {step === 1 && (
            <StepLocation form={form} setStep={setStep} step={1} />
          )}
          {step === 2 && <StepGame form={form} setStep={setStep} step={2} />}
          {step === 3 && (
            <StepRoles
              form={form}
              onFinish={() => form.handleSubmit()}
              setStep={setStep}
              step={3}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute("/_auth/onboarding")({
  component: OnboardingPage,
});
