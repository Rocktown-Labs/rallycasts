import { useStore } from "@tanstack/react-form";
import { Check, Sparkles } from "lucide-react";

import { withForm } from "@/lib/hooks/onboarding-form";

import { wizardFormOpts } from "./shared-form";

const SKILL_OPTIONS = [
  {
    badge: "Self-rated ≤ 2.5",
    badgeColor: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
    description:
      "Learning kitchen rules, scoring fundamentals, and basic groundstroke control.",
    icon: "🌱",
    label: "Beginner",
    value: "beginner" as const,
  },
  {
    badge: "Self-rated 3.0 - 3.5",
    badgeColor: "bg-sky-500/15 border-sky-500/30 text-sky-400",
    description:
      "Consistent dinking, developing third-shot drop, and directional control.",
    icon: "🎯",
    label: "Intermediate",
    value: "intermediate" as const,
  },
  {
    badge: "Self-rated 4.0 - 4.5",
    badgeColor: "bg-amber-500/15 border-amber-500/30 text-amber-400",
    description:
      "Fast hands at the NVZ, shot stacking, reset volleys, and strategic aggression.",
    icon: "⚡",
    label: "Advanced",
    value: "advanced" as const,
  },
  {
    badge: "Self-rated 5.0+",
    badgeColor: "bg-purple-500/15 border-purple-500/30 text-purple-400",
    description:
      "Tournament competitor, master of firefights, deception, and high-level play.",
    icon: "🏆",
    label: "Pro / Open",
    value: "pro" as const,
  },
];

const BIO_PROMPTS = [
  "🎾 Right-handed",
  "⚡ Left-handed",
  "🤝 Doubles specialist",
  "⚔️ Singles grinder",
  "🍳 Kitchen firefight lover",
  "🌅 Early morning player",
  "🏆 Looking for tournament partners",
];

export const StepGame = withForm({
  ...wizardFormOpts,
  props: {
    setStep: (() => null) as (step: number) => void,
    step: 2,
  },
  render: (props) => <StepGameForm {...props} />,
});

const StepGameForm = (props: React.ComponentProps<typeof StepGame>) => {
  const { form, setStep } = props;
  // Reactive subscription to game form values ensures instant re-rendering on selection
  const gameValues = useStore(form.store, (state) => state.values.game);
  const skillValue = gameValues.skillLevel || "intermediate";
  const bioValue = gameValues.bio || "";

  const toggleBioPrompt = (chip: string) => {
    const current = bioValue.trim();
    if (current.includes(chip)) {
      // Remove chip if already selected
      const cleaned = current
        .replaceAll(new RegExp(`(?:^|\\s*•\\s*)${escapeRegex(chip)}`, "gu"), "")
        .replaceAll(new RegExp(`${escapeRegex(chip)}(?:\\s*•\\s*|$)`, "gu"), "")
        .trim();
      form.setFieldValue("game.bio", cleaned);
    } else if (current.length > 0) {
      form.setFieldValue("game.bio", `${current} • ${chip}`);
    } else {
      form.setFieldValue("game.bio", chip);
    }
  };

  const handleContinue = () => {
    setStep(3);
  };

  return (
    <form.FormGroup name="game" onGroupSubmit={handleContinue}>
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
                Tell us about your game
              </h2>
              <p className="text-muted-foreground text-xs sm:text-sm">
                We use your rating and style to match you with players at your
                level and surface relevant match casts.
              </p>
            </div>

            {/* Rating / Skill Level */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Player rating / skill level
                  <span
                    aria-hidden="true"
                    className="text-destructive ml-1 font-bold"
                  >
                    *
                  </span>
                </span>
                <span className="text-muted-foreground text-xs">
                  You can update this anytime
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {SKILL_OPTIONS.map((option) => {
                  const isSelected = skillValue === option.value;
                  let cardClass =
                    "border-border/70 bg-card/60 hover:border-primary/50 hover:bg-muted/30";
                  if (isSelected) {
                    cardClass =
                      "border-primary bg-primary/10 shadow-xs ring-2 ring-primary/40 scale-[1.01]";
                  }

                  return (
                    <button
                      className={`group relative flex cursor-pointer flex-col justify-between rounded-xl border p-4 text-left transition-all ${cardClass}`}
                      key={option.value}
                      onClick={() =>
                        form.setFieldValue("game.skillLevel", option.value)
                      }
                      type="button"
                    >
                      <div>
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg select-none">
                              {option.icon}
                            </span>
                            <span className="text-foreground text-sm font-bold">
                              {option.label}
                            </span>
                          </div>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${option.badgeColor}`}
                          >
                            {option.badge}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-xs leading-relaxed">
                          {option.description}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="text-primary mt-3 flex items-center gap-1.5 text-xs font-semibold">
                          <Check className="size-3.5 stroke-[3]" />
                          <span>Selected</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bio & Quick Tap Pills */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium" htmlFor="bio-input">
                  Player bio & style notes
                </label>
                <span className="text-muted-foreground font-mono text-xs">
                  {bioValue.length}/500
                </span>
              </div>

              {/* Quick Add / Toggle Chips */}
              <div className="space-y-1.5">
                <p className="text-muted-foreground flex items-center gap-1 text-[11px]">
                  <Sparkles className="text-brand-yellow size-3" />
                  <span>Quick tap to toggle style tags:</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {BIO_PROMPTS.map((prompt) => {
                    const isActive = bioValue.includes(prompt);
                    let chipClass =
                      "border-border/80 bg-background/60 text-muted-foreground hover:border-primary/50 hover:text-foreground hover:bg-accent";
                    if (isActive) {
                      chipClass =
                        "border-primary bg-primary/15 text-primary font-semibold shadow-2xs";
                    }

                    return (
                      <button
                        className={`flex cursor-pointer items-center gap-1 rounded-lg border px-2.5 py-1 text-xs transition-colors ${chipClass}`}
                        key={prompt}
                        onClick={() => toggleBioPrompt(prompt)}
                        type="button"
                      >
                        {isActive ? (
                          <Check className="size-3 stroke-[3]" />
                        ) : (
                          <span>+</span>
                        )}
                        <span>{prompt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <textarea
                aria-label="Player Bio"
                className="border-input bg-background/50 placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring min-h-24 w-full rounded-xl border px-3.5 py-2.5 text-xs transition-colors outline-none focus-visible:ring-1 sm:text-sm"
                id="bio-input"
                maxLength={500}
                onChange={(e) => form.setFieldValue("game.bio", e.target.value)}
                placeholder="Tell players about your paddle setup, availability, preferred courts, or doubles synergy..."
                value={bioValue}
              />
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                className="border-input bg-background/50 hover:bg-accent hover:text-accent-foreground inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border px-5 text-sm font-medium transition-colors"
                onClick={() => setStep(1)}
                type="button"
              >
                Back
              </button>
              <button
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl px-6 text-sm font-bold shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99]"
                onClick={handleContinue}
                type="button"
              >
                Continue to Roles
                <Check className="size-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </form>
      )}
    </form.FormGroup>
  );
};

function escapeRegex(string: string): string {
  return string.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
