import { useStore } from "@tanstack/react-form";
import {
  Check,
  Flame,
  Shield,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { useState } from "react";

import { withForm } from "@/lib/hooks/onboarding-form";

import { wizardFormOpts } from "./shared-form";

export const StepRoles = withForm({
  ...wizardFormOpts,
  props: {
    onFinish: (() => null) as (values?: unknown) => void,
    setStep: (() => null) as (step: number) => void,
    step: 3,
  },
  render: (props) => <StepRolesForm {...props} />,
});

const StepRolesForm = (props: React.ComponentProps<typeof StepRoles>) => {
  const { form, onFinish, setStep } = props;
  // Reactive subscription to roles and account tier
  const rolesValues = useStore(form.store, (state) => state.values.roles);
  const accountTier = rolesValues.accountTier || "free";
  const isPlayer = Boolean(rolesValues.isPlayer);
  const isOrganizer = Boolean(rolesValues.isOrganizer);

  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">(
    "annual"
  );

  const rolesList = [
    {
      badge: "Core Experience",
      badgeColor: "text-primary border-primary/30 bg-primary/10",
      description:
        "Play games, track your DUPR rating, challenge opponents, and request court recordings.",
      icon: Users,
      key: "isPlayer" as const,
      label: "Player",
      value: isPlayer,
    },
    {
      badge: "Host & Director",
      badgeColor: "text-sky-400 border-sky-500/30 bg-sky-500/10",
      description:
        "Host tournaments, manage club leagues, publish brackets, and schedule live event casts.",
      icon: Trophy,
      key: "isOrganizer" as const,
      label: "Host",
      value: isOrganizer,
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
              <p className="text-muted-foreground text-xs sm:text-sm">
                Select your roles on the platform. You can be a player, a host,
                or both. caster, and update these anytime in your account
                settings.
              </p>
            </div>

            {/* Role Selection Toggles */}
            <div className="space-y-2.5">
              <span className="text-sm font-medium">Community roles</span>
              <div className="space-y-2.5">
                {rolesList.map((role) => {
                  const Icon = role.icon;
                  let roleCardClass =
                    "border-border/70 bg-card/60 hover:border-primary/50 hover:bg-muted/30";
                  if (role.value) {
                    roleCardClass =
                      "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/40";
                  }

                  return (
                    <button
                      className={`flex w-full cursor-pointer items-start gap-3.5 rounded-xl border p-4 text-left transition-all ${roleCardClass}`}
                      key={role.key}
                      onClick={() =>
                        form.setFieldValue(`roles.${role.key}`, !role.value)
                      }
                      type="button"
                    >
                      <div
                        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                          role.value
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-input bg-background/50"
                        }`}
                      >
                        {role.value && (
                          <Check className="size-3.5 stroke-[3]" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Icon
                              className={`size-4 ${
                                role.value
                                  ? "text-primary"
                                  : "text-muted-foreground"
                              }`}
                            />
                            <span className="text-foreground text-sm font-bold">
                              {role.label}
                            </span>
                          </div>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${role.badgeColor}`}
                          >
                            {role.badge}
                          </span>
                        </div>
                        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                          {role.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Plan Selection & Subscription Upsell */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-foreground text-sm font-bold">
                    Choose your RallyCasts plan
                  </span>
                  <p className="text-muted-foreground text-xs">
                    Start free or unlock the full power of RallyCasts Pro
                  </p>
                </div>

                {/* Monthly vs Annual Toggle */}
                <div className="border-border/80 bg-background/60 inline-flex rounded-xl border p-1 text-xs">
                  <button
                    className={`cursor-pointer rounded-lg px-3 py-1 font-semibold transition-all ${
                      billingInterval === "monthly"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setBillingInterval("monthly")}
                    type="button"
                  >
                    Monthly
                  </button>
                  <button
                    className={`flex cursor-pointer items-center gap-1 rounded-lg px-3 py-1 font-semibold transition-all ${
                      billingInterval === "annual"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setBillingInterval("annual")}
                    type="button"
                  >
                    <span>Annual</span>
                    <span className="bg-brand-yellow/20 text-brand-yellow py-0.2 rounded-md px-1 text-[9px] font-bold uppercase">
                      Save 17%
                    </span>
                  </button>
                </div>
              </div>

              <div className="grid gap-3.5 sm:grid-cols-2">
                {/* Free Court Pass Plan */}
                <button
                  className={`relative flex cursor-pointer flex-col justify-between rounded-xl border p-4 text-left transition-all ${
                    accountTier === "free"
                      ? "border-primary bg-primary/10 ring-primary/40 shadow-xs ring-2"
                      : "border-border/70 bg-card/60 hover:border-primary/50 hover:bg-muted/30"
                  }`}
                  onClick={() =>
                    form.setFieldValue("roles.accountTier", "free")
                  }
                  type="button"
                >
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Shield className="text-muted-foreground size-4" />
                        <span className="text-foreground text-sm font-bold">
                          Court Pass
                        </span>
                      </div>
                      <span className="bg-muted border-border/80 text-muted-foreground rounded-full border px-2 py-0.5 text-[10px] font-bold">
                        Free Forever
                      </span>
                    </div>

                    <div className="my-2 flex items-baseline gap-1">
                      <span className="text-foreground text-2xl font-extrabold">
                        $0
                      </span>
                      <span className="text-muted-foreground text-xs">
                        / month
                      </span>
                    </div>

                    <p className="text-muted-foreground mb-3 text-xs leading-relaxed">
                      Everything you need to play, track your rating, and follow
                      local matches.
                    </p>

                    <div className="border-border/40 text-muted-foreground space-y-1.5 border-t pt-2.5 text-xs">
                      <div className="flex items-center gap-2">
                        <Check className="text-primary size-3.5 shrink-0 stroke-[2.5]" />
                        <span>Player profile & verified DUPR rating</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="text-primary size-3.5 shrink-0 stroke-[2.5]" />
                        <span>Discover local courts & open play</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="text-primary size-3.5 shrink-0 stroke-[2.5]" />
                        <span>Standard video highlights & feeds</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="text-primary size-3.5 shrink-0 stroke-[2.5]" />
                        <span>Post match scores & community brackets</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-border/40 mt-4 flex items-center justify-between border-t pt-2 text-xs">
                    <span className="text-foreground font-semibold">
                      {accountTier === "free"
                        ? "Selected Plan"
                        : "Select Court Pass"}
                    </span>
                    {accountTier === "free" && (
                      <span className="bg-primary text-primary-foreground rounded-full p-0.5">
                        <Check className="size-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                </button>

                {/* RallyCasts Pro / Premium Upsell Plan */}
                <button
                  className={`relative flex cursor-pointer flex-col justify-between rounded-xl border p-4 text-left transition-all ${
                    accountTier === "premium"
                      ? "border-primary bg-primary/10 ring-primary/60 scale-[1.01] shadow-md ring-2"
                      : "border-primary/40 bg-card/80 hover:border-primary hover:bg-muted/40 shadow-xs"
                  }`}
                  onClick={() =>
                    form.setFieldValue("roles.accountTier", "premium")
                  }
                  type="button"
                >
                  {/* Top banner tag */}
                  <div className="from-primary to-brand-yellow text-primary-foreground absolute -top-2.5 right-4 flex items-center gap-1 rounded-full bg-linear-to-r px-2.5 py-0.5 text-[9px] font-extrabold tracking-wider uppercase shadow-xs">
                    <Flame className="size-2.5" />
                    <span>Most Popular • 7-Day Trial</span>
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="text-brand-yellow size-4" />
                        <span className="text-foreground text-sm font-bold">
                          RallyCasts Pro
                        </span>
                      </div>
                      <span className="bg-brand-yellow/15 border-brand-yellow/30 text-brand-yellow rounded-full border px-2 py-0.5 text-[10px] font-bold">
                        Pro Tier
                      </span>
                    </div>

                    <div className="my-2 flex items-baseline gap-1">
                      <span className="text-foreground text-2xl font-extrabold">
                        {billingInterval === "annual" ? "$10.00" : "$14.99"}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        / month
                      </span>
                      {billingInterval === "annual" && (
                        <span className="text-primary ml-1 text-[11px] font-medium">
                          ($119.99 billed annually)
                        </span>
                      )}
                    </div>

                    <p className="text-muted-foreground mb-3 text-xs leading-relaxed">
                      The ultimate toolkit for serious pickleballers, coaches,
                      and creators.
                    </p>

                    <div className="border-border/40 text-muted-foreground space-y-1.5 border-t pt-2.5 text-xs">
                      <div className="flex items-center gap-2">
                        <Zap className="text-brand-yellow size-3.5 shrink-0 stroke-[2.5]" />
                        <span>
                          <strong className="text-foreground">
                            Ad-free everywhere
                          </strong>{" "}
                          on RallyCasts
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Zap className="text-brand-yellow size-3.5 shrink-0 stroke-[2.5]" />
                        <span>
                          <strong className="text-foreground">
                            Unlimited 4K match uploads
                          </strong>{" "}
                          & cloud library
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Zap className="text-brand-yellow size-3.5 shrink-0 stroke-[2.5]" />
                        <span>
                          <strong className="text-foreground">
                            AI Highlight Reel Generator
                          </strong>{" "}
                          & auto-clipping
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Zap className="text-brand-yellow size-3.5 shrink-0 stroke-[2.5]" />
                        <span>
                          <strong className="text-foreground">
                            Advanced shot analytics
                          </strong>{" "}
                          & opponent scouting
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Zap className="text-brand-yellow size-3.5 shrink-0 stroke-[2.5]" />
                        <span>
                          <strong className="text-foreground">
                            Priority casting coverage
                          </strong>{" "}
                          at club tournaments
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Zap className="text-brand-yellow size-3.5 shrink-0 stroke-[2.5]" />
                        <span>
                          <strong className="text-foreground">
                            Gold Court Badge
                          </strong>{" "}
                          & community leaderboard crest
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-border/40 mt-4 space-y-1 border-t pt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-primary flex items-center gap-1 font-bold">
                        <Sparkles className="size-3" />
                        {accountTier === "premium"
                          ? "Pro Selected (7-Day Trial)"
                          : "Upgrade to Pro"}
                      </span>
                      {accountTier === "premium" && (
                        <span className="bg-primary text-primary-foreground rounded-full p-0.5">
                          <Check className="size-3 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground text-[10px]">
                      🎉 $0 due today. Cancel anytime within 7 days.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-3">
              <button
                className="border-input bg-background/50 hover:bg-accent hover:text-accent-foreground inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border px-5 text-sm font-medium transition-colors"
                onClick={() => setStep(2)}
                type="button"
              >
                Back
              </button>
              <form.AppForm>
                <button
                  className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl px-7 text-sm font-bold shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99]"
                  type="submit"
                >
                  {accountTier === "premium" ? (
                    <>
                      <Sparkles className="size-4" />
                      Start 7-Day Trial & Finish
                    </>
                  ) : (
                    <>
                      Take the Court & Finish Setup
                      <Check className="size-4 stroke-[3]" />
                    </>
                  )}
                </button>
              </form.AppForm>
            </div>
          </div>
        </form>
      )}
    </form.FormGroup>
  );
};
