import { createFileRoute } from "@tanstack/react-router";
import { Eye, Timer, Users } from "lucide-react";

import ProfileTabs from "@/components/profile/profile-tabs";
import { StatCard } from "@/components/rally/cards";

export const Route = createFileRoute("/_auth/u/profile/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Your RallyCasts Studio</h1>
        <ProfileTabs />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          icon={<Eye className="size-5" />}
          label="Views"
          value="2,840"
          trend="+12.5%"
        />
        <StatCard
          icon={<Users className="size-5" />}
          label="Followers"
          value="124"
          trend="+8.3%"
        />
        <StatCard
          icon={<Timer className="size-5" />}
          label="Watch time"
          value="91h"
          trend="Last 30 days"
        />
      </div>
      <div className="rounded-lg border border-border p-6">
        <h2 className="text-xl font-bold">Audience momentum</h2>
        <div className="mt-6 h-72 rounded-lg bg-[linear-gradient(180deg,hsl(78_100%_60%/.16),transparent)]" />
      </div>
    </div>
  );
}
