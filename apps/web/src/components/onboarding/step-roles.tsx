import { withForm } from "@/lib/hooks/onboarding-form";

import { wizardFormOpts } from "./shared-form";

export const StepRoles = withForm({
  ...wizardFormOpts,
  props: {
    onFinish: (() => null) as (values?: unknown) => void,
    setStep: (() => null) as (step: number) => void,
    step: 3,
  },
  render: function render({ form, onFinish: _onFinish, setStep }) {
    const accountTier = form.getFieldValue("roles.accountTier");

    return (
      <form.FormGroup
        name="roles"
        onGroupSubmit={() => {
          form.handleSubmit();
        }}
      >
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
                <h2 className="text-xl font-bold">How do you participate?</h2>
                <p className="text-sm text-muted-foreground">
                  Select the roles that fit you. You can change these anytime in
                  settings.
                </p>
              </div>

              {/* Role Toggles */}
              <div className="space-y-3">
                {[
                  {
                    description:
                      "Play games, track ratings, challenge other players, and request recordings.",
                    key: "isPlayer" as const,
                    label: "Player",
                  },
                  {
                    description:
                      "Host tournaments, manage leagues, and publish brackets.",
                    key: "isOrganizer" as const,
                    label: "Organizer",
                  },
                  {
                    description:
                      "Stream, record commentary, and publish featured content.",
                    key: "isCaster" as const,
                    label: "Caster",
                  },
                ].map((role) => {
                  const value = form.getFieldValue(`roles.${role.key}`);
                  return (
                    <button
                      className={`w-full flex items-start gap-3 rounded-xl border p-4 text-left transition-all hover:border-primary/40 ${
                        value
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card"
                      }`}
                      key={role.key}
                      onClick={() =>
                        form.setFieldValue(`roles.${role.key}`, !value)
                      }
                      type="button"
                    >
                      <div
                        className={`mt-0.5 size-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          value
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-input bg-background"
                        }`}
                      >
                        {value && (
                          <svg
                            className="size-3.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={3}
                            viewBox="0 0 24 24"
                          >
                            <path
                              d="M5 12l5 5L20 7"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                      <div>
                        <span className="block text-sm font-bold">
                          {role.label}
                        </span>
                        <span className="block text-xs text-muted-foreground mt-0.5">
                          {role.description}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Plan Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium" htmlFor="plan-select">
                  Choose your plan
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    className={`relative rounded-xl border p-4 text-left transition-all hover:border-primary/40 ${
                      accountTier === "free"
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border bg-card"
                    }`}
                    onClick={() =>
                      form.setFieldValue("roles.accountTier", "free")
                    }
                    type="button"
                  >
                    <span className="block text-sm font-bold">Free</span>
                    <span className="block text-xs text-muted-foreground mt-1">
                      Player profile, local discovery, event browsing, and basic
                      recordings.
                    </span>
                  </button>
                  <button
                    className={`relative rounded-xl border p-4 text-left transition-all hover:border-primary/40 ${
                      accountTier === "premium"
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border bg-card"
                    }`}
                    onClick={() =>
                      form.setFieldValue("roles.accountTier", "premium")
                    }
                    type="button"
                  >
                    <span className="block text-sm font-bold">Premium</span>
                    <span className="block text-xs text-muted-foreground mt-1">
                      Everything in Free plus unlimited uploads, advanced
                      analytics, and priority casting.
                    </span>
                    <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider bg-brand-yellow text-black px-1.5 py-0.5 rounded">
                      Coming Soon
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                  onClick={() => setStep(2)}
                  type="button"
                >
                  Back
                </button>
                <form.AppForm>
                  <form.SubmitButton>Finish Setup</form.SubmitButton>
                </form.AppForm>
              </div>
            </div>
          </form>
        )}
      </form.FormGroup>
    );
  },
});
