import { Check, Sparkles, Trophy, Tv, Users } from "lucide-react";

import { withForm } from "@/lib/hooks/onboarding-form";

import { wizardFormOpts } from "./shared-form";

export const StepRoles = withForm({
  ...wizardFormOpts,
  props: {
    onFinish: (() => null) as (values?: unknown) => void,
    setStep: (() => null) as (step: number) => void,
    step: 3,
  },
  render: function render({ form, onFinish, setStep }) {
    const accountTier = form.getFieldValue("roles.accountTier") || "free";

    const rolesList = [
      {
        description:
          "Play games, track your DUPR rating, challenge opponents, and request court recordings.",
        icon: Users,
        key: "isPlayer" as const,
        label: "Player",
      },
      {
        description:
          "Host tournaments, manage club leagues, publish brackets, and schedule live event casts.",
        icon: Trophy,
        key: "isOrganizer" as const,
        label: "Host",
      },
      {
        description:
          "Stream matches live, record play-by-play commentary, and publish featured video highlights.",
        icon: Tv,
        key: "isCaster" as const,
        label: "Caster",
      },
    ];

    const handleFormSubmit = () => {
      onFinish();
    };

    return (
      <form.FormGroup name="roles" onGroupSubmit={handleFormSubmit}>
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
                  How do you participate in RallyCasts?
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Select your roles on the platform. You can be a player, host,
                  or caster, and update these anytime in your account settings.
                </p>
              </div>

              {/* Role Selection Toggles */}
              <div className="space-y-2.5">
                <span className="text-sm font-medium">Community roles</span>
                <div className="space-y-2.5">
                  {rolesList.map((role) => {
                    const value = Boolean(
                      form.getFieldValue(`roles.${role.key}`)
                    );
                    const Icon = role.icon;
                    return (
                      <button
                        className={`w-full flex items-start gap-3.5 rounded-xl border p-4 text-left transition-all cursor-pointer ${
                          value
                            ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/40"
                            : "border-border/70 bg-card/60 hover:border-primary/50 hover:bg-muted/30"
                        }`}
                        key={role.key}
                        onClick={() =>
                          form.setFieldValue(`roles.${role.key}`, !value)
                        }
                        type="button"
                      >
                        <div
                          className={`mt-0.5 size-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                            value
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-input bg-background/50"
                          }`}
                        >
                          {value && <Check className="size-3.5 stroke-[3]" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Icon
                              className={`size-4 ${
                                value ? "text-primary" : "text-muted-foreground"
                              }`}
                            />
                            <span className="text-sm font-bold text-foreground">
                              {role.label}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                            {role.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Plan Selection */}
              <div className="space-y-2.5">
                <span className="text-sm font-medium">
                  Choose your account tier
                </span>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    className={`relative rounded-xl border p-4 text-left transition-all cursor-pointer ${
                      accountTier === "free"
                        ? "border-primary bg-primary/10 shadow-xs ring-2 ring-primary/40"
                        : "border-border/70 bg-card/60 hover:border-primary/50 hover:bg-muted/30"
                    }`}
                    onClick={() =>
                      form.setFieldValue("roles.accountTier", "free")
                    }
                    type="button"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-foreground">
                        Standard Free
                      </span>
                      {accountTier === "free" && (
                        <span className="rounded-full bg-primary text-primary-foreground p-0.5">
                          <Check className="size-2.5 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Player profile, local court discovery, community match
                      scores, and video browsing.
                    </p>
                  </button>

                  <button
                    className={`relative rounded-xl border p-4 text-left transition-all cursor-pointer ${
                      accountTier === "premium"
                        ? "border-primary bg-primary/10 shadow-xs ring-2 ring-primary/40"
                        : "border-border/70 bg-card/60 hover:border-primary/50 hover:bg-muted/30"
                    }`}
                    onClick={() =>
                      form.setFieldValue("roles.accountTier", "premium")
                    }
                    type="button"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
                        <Sparkles className="size-3.5 text-brand-yellow" />
                        Premium Tier
                      </span>
                      <span className="rounded-full bg-brand-yellow/20 border border-brand-yellow/40 px-2 py-0.2 text-[10px] font-bold uppercase tracking-wider text-brand-yellow">
                        Coming Soon
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Unlimited match uploads, advanced player stats, and
                      priority video casting coverage.
                    </p>
                  </button>
                </div>
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-input bg-background/50 px-5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer"
                  onClick={() => setStep(2)}
                  type="button"
                >
                  Back
                </button>
                <form.AppForm>
                  <button
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-7 text-sm font-bold text-primary-foreground shadow-xs transition-all hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                    type="submit"
                  >
                    Take the Court & Finish Setup
                    <Check className="size-4 stroke-[3]" />
                  </button>
                </form.AppForm>
              </div>
            </div>
          </form>
        )}
      </form.FormGroup>
    );
  },
});
