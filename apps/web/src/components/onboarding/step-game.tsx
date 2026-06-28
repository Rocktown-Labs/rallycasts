import { withForm } from "@/lib/hooks/onboarding-form";

import { wizardFormOpts } from "./shared-form";

const SKILL_OPTIONS = [
  {
    description: "2.5 and below. New to the game or building fundamentals.",
    label: "Beginner",
    value: "beginner" as const,
  },
  {
    description: "3.0 - 3.5. Consistent play, developing strategy.",
    label: "Intermediate",
    value: "intermediate" as const,
  },
  {
    description: "4.0 - 4.5. Strong competitive player.",
    label: "Advanced",
    value: "advanced" as const,
  },
  {
    description: "5.0+. Tournament level. You know what a dink war is.",
    label: "Pro",
    value: "pro" as const,
  },
];

export const StepGame = withForm({
  ...wizardFormOpts,
  props: {
    setStep: (_step: number) => void 0,
    step: 2,
  },
  render: function render({ form, setStep }) {
    const skillValue = form.getFieldValue("game.skillLevel");

    return (
      <form.FormGroup name="game" onGroupSubmit={() => setStep(3)}>
        {(formGroup) => (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              formGroup.handleSubmit();
            }}
          >
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-xl font-bold">Tell us about your game</h2>
                <p className="text-sm text-muted-foreground">
                  This helps us match you with players at your level and surface
                  relevant events.
                </p>
              </div>

              {/* Skill Level */}
              <div className="space-y-3">
                <label className="text-sm font-medium" htmlFor="skill-level">
                  Skill Level
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {SKILL_OPTIONS.map((option) => {
                    const isSelected = skillValue === option.value;
                    return (
                      <button
                        className={`relative rounded-xl border p-4 text-left transition-all hover:border-primary/40 ${
                          isSelected
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border bg-card"
                        }`}
                        key={option.value}
                        onClick={() =>
                          form.setFieldValue(
                            "game.skillLevel",
                            option.value as
                              | "beginner"
                              | "intermediate"
                              | "advanced"
                              | "pro"
                          )
                        }
                        type="button"
                      >
                        <span
                          className={`block text-sm font-bold ${
                            isSelected ? "text-primary" : "text-foreground"
                          }`}
                        >
                          {option.label}
                        </span>
                        <span className="block text-xs text-muted-foreground mt-1">
                          {option.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="bio">
                  Bio
                </label>
                <textarea
                  aria-label="Bio"
                  className="min-h-24 w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 placeholder:text-muted-foreground"
                  id="bio"
                  onChange={(e) =>
                    form.setFieldValue("game.bio", e.target.value)
                  }
                  placeholder="What should other players know about you? Play style, schedule, favorite courts..."
                  value={form.getFieldValue("game.bio") || ""}
                />
                <p className="text-xs text-muted-foreground">
                  {(form.getFieldValue("game.bio") || "").length}/500
                </p>
              </div>

              <div className="flex justify-between">
                <button
                  className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                  onClick={() => setStep(1)}
                  type="button"
                >
                  Back
                </button>
                <form.AppForm>
                  <form.SubmitButton>Continue</form.SubmitButton>
                </form.AppForm>
              </div>
            </div>
          </form>
        )}
      </form.FormGroup>
    );
  },
});
