import { Check, Sparkles } from "lucide-react";

import { withForm } from "@/lib/hooks/onboarding-form";

import { wizardFormOpts } from "./shared-form";

const SKILL_OPTIONS = [
  {
    badge: "DUPR ≤ 2.5",
    description:
      "Learning kitchen rules, scoring fundamentals, and groundstroke control.",
    icon: "🌱",
    label: "Beginner",
    value: "beginner" as const,
  },
  {
    badge: "DUPR 3.0 - 3.5",
    description:
      "Consistent dinking, developing third-shot drop, and directional control.",
    icon: "🎯",
    label: "Intermediate",
    value: "intermediate" as const,
  },
  {
    badge: "DUPR 4.0 - 4.5",
    description:
      "Fast hands at the NVZ, shot stacking, reset volleys, and strategic aggression.",
    icon: "⚡",
    label: "Advanced",
    value: "advanced" as const,
  },
  {
    badge: "DUPR 5.0+",
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
  render: function render({ form, setStep }) {
    const skillValue = form.getFieldValue("game.skillLevel") || "intermediate";
    const bioValue = form.getFieldValue("game.bio") || "";

    const addBioPrompt = (chip: string) => {
      const current = bioValue.trim();
      if (!current) {
        form.setFieldValue("game.bio", chip);
      } else if (!current.includes(chip)) {
        form.setFieldValue("game.bio", `${current} • ${chip}`);
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
                <p className="text-xs sm:text-sm text-muted-foreground">
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
                      className="ml-1 font-bold text-destructive"
                    >
                      *
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    You can update this anytime
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {SKILL_OPTIONS.map((option) => {
                    const isSelected = skillValue === option.value;
                    return (
                      <button
                        className={`group relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all cursor-pointer ${
                          isSelected
                            ? "border-primary bg-primary/10 shadow-xs ring-2 ring-primary/40 scale-[1.01]"
                            : "border-border/70 bg-card/60 hover:border-primary/50 hover:bg-muted/30"
                        }`}
                        key={option.value}
                        onClick={() =>
                          form.setFieldValue("game.skillLevel", option.value)
                        }
                        type="button"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-lg select-none">
                                {option.icon}
                              </span>
                              <span className="text-sm font-bold text-foreground">
                                {option.label}
                              </span>
                            </div>
                            <span className="rounded-full bg-brand-yellow/15 border border-brand-yellow/30 px-2 py-0.5 text-[10px] font-bold text-brand-yellow">
                              {option.badge}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {option.description}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-primary">
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
                    Player bio & notes
                  </label>
                  <span className="text-xs text-muted-foreground">
                    {bioValue.length}/500
                  </span>
                </div>

                {/* Quick Add Chips */}
                <div className="space-y-1.5">
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Sparkles className="size-3 text-brand-yellow" />
                    <span>Quick tap to add to your bio:</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {BIO_PROMPTS.map((prompt) => (
                      <button
                        className="rounded-lg border border-border/80 bg-background/60 px-2.5 py-1 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
                        key={prompt}
                        onClick={() => addBioPrompt(prompt)}
                        type="button"
                      >
                        + {prompt}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  aria-label="Player Bio"
                  className="min-h-24 w-full rounded-xl border border-input bg-background/50 px-3.5 py-2.5 text-xs sm:text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring"
                  id="bio-input"
                  maxLength={500}
                  onChange={(e) =>
                    form.setFieldValue("game.bio", e.target.value)
                  }
                  placeholder="Tell players about your paddle setup, availability, preferred courts, or doubles synergy..."
                  value={bioValue}
                />
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-input bg-background/50 px-5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer"
                  onClick={() => setStep(1)}
                  type="button"
                >
                  Back
                </button>
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-xs transition-all hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
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
  },
});
