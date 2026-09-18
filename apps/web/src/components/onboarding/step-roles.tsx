import { useStore } from "@tanstack/react-form";
import {
  Check,
  Flame,
  Mic,
  Shield,
  Sparkles,
  Trophy,
  Tv,
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
  render: function render({ form, onFinish, setStep }) {
    // Reactive subscription to roles and account tier
    const rolesValues = useStore(form.store, (state) => state.values.roles);
    const accountTier = rolesValues.accountTier || "free";
    const isPlayer = Boolean(rolesValues.isPlayer);
    const isOrganizer = Boolean(rolesValues.isOrganizer);
    const isCaster = Boolean(rolesValues.isCaster);

    const [billingInterval, setBillingInterval] = useState<
      "monthly" | "annual"
    >("annual");

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
      {
        badge: "$50 Express Fee",
        badgeColor: "text-amber-400 border-amber-500/30 bg-amber-500/10",
        description:
          "Stream matches live, record play-by-play commentary, and publish featured video highlights.",
        icon: Tv,
        key: "isCaster" as const,
        label: "Caster",
        value: isCaster,
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
                    const Icon = role.icon;
                    let roleCardClass =
                      "border-border/70 bg-card/60 hover:border-primary/50 hover:bg-muted/30";
                    if (role.value) {
                      roleCardClass =
                        "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/40";
                    }

                    return (
                      <button
                        className={`w-full flex items-start gap-3.5 rounded-xl border p-4 text-left transition-all cursor-pointer ${roleCardClass}`}
                        key={role.key}
                        onClick={() =>
                          form.setFieldValue(`roles.${role.key}`, !role.value)
                        }
                        type="button"
                      >
                        <div
                          className={`mt-0.5 size-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
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
                              <span className="text-sm font-bold text-foreground">
                                {role.label}
                              </span>
                            </div>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${role.badgeColor}`}
                            >
                              {role.badge}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {role.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Caster $50 Express Fee Callout when isCaster is selected */}
              {isCaster ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="rounded-lg bg-amber-500/10 p-1.5 text-amber-400">
                        <Mic className="size-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <span>Caster Express Verification</span>
                          <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-extrabold text-amber-300">
                            $50 One-Time Fee
                          </span>
                        </h4>
                        <p className="text-[11px] text-muted-foreground">
                          Fast-track your broadcaster certification and unlock
                          live stream controls.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 text-xs text-muted-foreground pt-1">
                    <div className="flex items-start gap-2">
                      <Check className="size-3.5 text-amber-400 shrink-0 mt-0.5 stroke-[2.5]" />
                      <span>
                        <strong className="text-foreground">
                          Verified Caster Badge
                        </strong>{" "}
                        on your profile and live stream feeds
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="size-3.5 text-amber-400 shrink-0 mt-0.5 stroke-[2.5]" />
                      <span>
                        <strong className="text-foreground">
                          24-Hour Express Queue
                        </strong>{" "}
                        reviewed directly by the RallyCasts team
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="size-3.5 text-amber-400 shrink-0 mt-0.5 stroke-[2.5]" />
                      <span>
                        <strong className="text-foreground">
                          RTMP Stream Ingest
                        </strong>{" "}
                        credentials for OBS, Prism, or mobile
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="size-3.5 text-amber-400 shrink-0 mt-0.5 stroke-[2.5]" />
                      <span>
                        <strong className="text-foreground">
                          Priority Match Coverage
                        </strong>{" "}
                        for sanctioned tournaments and brackets
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground/80 border-t border-amber-500/20 pt-2 italic">
                    💡 No charge today during setup. The $50 express fee is
                    processed when you complete your stream test in Studio.
                  </p>
                </div>
              ) : null}

              {/* Plan Selection & Subscription Upsell */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-sm font-bold text-foreground">
                      Choose your RallyCasts plan
                    </span>
                    <p className="text-xs text-muted-foreground">
                      Start free or unlock the full power of RallyCasts Pro
                    </p>
                  </div>

                  {/* Monthly vs Annual Toggle */}
                  <div className="inline-flex rounded-xl border border-border/80 bg-background/60 p-1 text-xs">
                    <button
                      className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
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
                      className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                        billingInterval === "annual"
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => setBillingInterval("annual")}
                      type="button"
                    >
                      <span>Annual</span>
                      <span className="rounded-md bg-brand-yellow/20 text-brand-yellow px-1 py-0.2 text-[9px] font-bold uppercase">
                        Save 17%
                      </span>
                    </button>
                  </div>
                </div>

                <div className="grid gap-3.5 sm:grid-cols-2">
                  {/* Free Court Pass Plan */}
                  <button
                    className={`relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all cursor-pointer ${
                      accountTier === "free"
                        ? "border-primary bg-primary/10 shadow-xs ring-2 ring-primary/40"
                        : "border-border/70 bg-card/60 hover:border-primary/50 hover:bg-muted/30"
                    }`}
                    onClick={() =>
                      form.setFieldValue("roles.accountTier", "free")
                    }
                    type="button"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <Shield className="size-4 text-muted-foreground" />
                          <span className="text-sm font-bold text-foreground">
                            Court Pass
                          </span>
                        </div>
                        <span className="rounded-full bg-muted border border-border/80 px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                          Free Forever
                        </span>
                      </div>

                      <div className="flex items-baseline gap-1 my-2">
                        <span className="text-2xl font-extrabold text-foreground">
                          $0
                        </span>
                        <span className="text-xs text-muted-foreground">
                          / month
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                        Everything you need to play, track your rating, and
                        follow local matches.
                      </p>

                      <div className="space-y-1.5 border-t border-border/40 pt-2.5 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Check className="size-3.5 text-primary shrink-0 stroke-[2.5]" />
                          <span>Player profile & verified DUPR rating</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="size-3.5 text-primary shrink-0 stroke-[2.5]" />
                          <span>Discover local courts & open play</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="size-3.5 text-primary shrink-0 stroke-[2.5]" />
                          <span>Standard video highlights & feeds</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="size-3.5 text-primary shrink-0 stroke-[2.5]" />
                          <span>Post match scores & community brackets</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-xs pt-2 border-t border-border/40">
                      <span className="font-semibold text-foreground">
                        {accountTier === "free"
                          ? "Selected Plan"
                          : "Select Court Pass"}
                      </span>
                      {accountTier === "free" && (
                        <span className="rounded-full bg-primary text-primary-foreground p-0.5">
                          <Check className="size-3 stroke-[3]" />
                        </span>
                      )}
                    </div>
                  </button>

                  {/* RallyCasts Pro / Premium Upsell Plan */}
                  <button
                    className={`relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all cursor-pointer ${
                      accountTier === "premium"
                        ? "border-primary bg-primary/10 shadow-md ring-2 ring-primary/60 scale-[1.01]"
                        : "border-primary/40 bg-card/80 hover:border-primary hover:bg-muted/40 shadow-xs"
                    }`}
                    onClick={() =>
                      form.setFieldValue("roles.accountTier", "premium")
                    }
                    type="button"
                  >
                    {/* Top banner tag */}
                    <div className="absolute -top-2.5 right-4 rounded-full bg-linear-to-r from-primary to-brand-yellow px-2.5 py-0.5 text-[9px] font-extrabold text-primary-foreground uppercase tracking-wider shadow-xs flex items-center gap-1">
                      <Flame className="size-2.5" />
                      <span>Most Popular • 7-Day Trial</span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="size-4 text-brand-yellow" />
                          <span className="text-sm font-bold text-foreground">
                            RallyCasts Pro
                          </span>
                        </div>
                        <span className="rounded-full bg-brand-yellow/15 border border-brand-yellow/30 px-2 py-0.5 text-[10px] font-bold text-brand-yellow">
                          Pro Tier
                        </span>
                      </div>

                      <div className="flex items-baseline gap-1 my-2">
                        <span className="text-2xl font-extrabold text-foreground">
                          {billingInterval === "annual" ? "$8.25" : "$9.99"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          / month
                        </span>
                        {billingInterval === "annual" && (
                          <span className="text-[11px] text-primary font-medium ml-1">
                            ($99 billed annually)
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                        The ultimate toolkit for serious pickleballers, coaches,
                        and creators.
                      </p>

                      <div className="space-y-1.5 border-t border-border/40 pt-2.5 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Zap className="size-3.5 text-brand-yellow shrink-0 stroke-[2.5]" />
                          <span>
                            <strong className="text-foreground">
                              Unlimited 4K match uploads
                            </strong>{" "}
                            & cloud library
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Zap className="size-3.5 text-brand-yellow shrink-0 stroke-[2.5]" />
                          <span>
                            <strong className="text-foreground">
                              AI Highlight Reel Generator
                            </strong>{" "}
                            & auto-clipping
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Zap className="size-3.5 text-brand-yellow shrink-0 stroke-[2.5]" />
                          <span>
                            <strong className="text-foreground">
                              Advanced shot analytics
                            </strong>{" "}
                            & opponent scouting
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Zap className="size-3.5 text-brand-yellow shrink-0 stroke-[2.5]" />
                          <span>
                            <strong className="text-foreground">
                              Priority casting coverage
                            </strong>{" "}
                            at club tournaments
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Zap className="size-3.5 text-brand-yellow shrink-0 stroke-[2.5]" />
                          <span>
                            <strong className="text-foreground">
                              Gold Court Badge
                            </strong>{" "}
                            & community leaderboard crest
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-2 border-t border-border/40 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-primary flex items-center gap-1">
                          <Sparkles className="size-3" />
                          {accountTier === "premium"
                            ? "Pro Selected (7-Day Trial)"
                            : "Upgrade to Pro"}
                        </span>
                        {accountTier === "premium" && (
                          <span className="rounded-full bg-primary text-primary-foreground p-0.5">
                            <Check className="size-3 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        🎉 $0 due today. Cancel anytime within 7 days.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between pt-3">
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
  },
});
