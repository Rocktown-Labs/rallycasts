import { Button } from "@rallycaststv/ui/components/button";
import { createFileRoute } from "@tanstack/react-router";
import { Camera, DollarSign } from "lucide-react";

import ProfileTabs from "@/components/profile/profile-tabs";
import { StatCard } from "@/components/rally/cards";

export const Route = createFileRoute("/_auth/u/profile/earn")({
  component: EarnPage,
});

function EarnPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Your RallyCasts Studio</h1>
        <ProfileTabs />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          icon={<DollarSign className="size-5" />}
          label="Earnings"
          value="$0"
          trend="Stripe Connect pending"
        />
        <StatCard
          icon={<Camera className="size-5" />}
          label="Caster jobs"
          value="0"
          trend="Become a caster to start"
        />
      </div>
      <div className="border-border rounded-lg border p-6">
        <h2 className="text-2xl font-bold">
          Turn your phone into a court-side studio.
        </h2>
        <p className="text-muted-foreground mt-3 max-w-2xl">
          Premium earning setup will connect to Stripe onboarding once checkout
          and Connect account creation are complete.
        </p>
        <Button className="mt-6 rounded-md text-xs">Start earning setup</Button>
      </div>
    </div>
  );
}
