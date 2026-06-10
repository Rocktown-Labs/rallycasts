import { Button } from "@rallycaststv/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@rallycaststv/ui/components/card";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Eye,
  Users,
  DollarSign,
  Camera,
  ArrowRight,
  Video,
  MessageSquare,
} from "lucide-react";

import { StatCard } from "@/components/rally/cards";
import { useProfile } from "@/lib/hooks";

export const Route = createFileRoute("/_auth/u/")({
  component: DashboardPage,
});

function DashboardPage() {
  const { data } = useProfile();
  const user = data?.user;
  const profile = data?.profile;

  const stats = [
    {
      icon: <Eye className="size-5" />,
      label: "Total Views",
      trend: "+12.5% this month",
      value: "2,840",
    },
    {
      icon: <Users className="size-5" />,
      label: "Followers",
      trend: "+8.3% this month",
      value: "124",
    },
    {
      icon: <DollarSign className="size-5" />,
      label: "Earnings",
      trend: "Start earning now",
      value: "$0",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-primary uppercase tracking-wider">
          Player Hub
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
          Welcome back, {user?.name || "Player"}!
        </h1>
        <p className="text-muted-foreground text-sm max-w-2xl">
          Manage your recordings, customize your studio profile, and connect
          with other pickleball players in your area.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-border bg-card/50 backdrop-blur-md shadow-md rounded-xl">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Link to="/u/profile/me">
              <Button
                variant="outline"
                className="w-full justify-between rounded-lg py-5 text-xs"
              >
                <span className="flex items-center gap-2">
                  <Users className="size-4 text-primary" /> Customize Studio
                  Profile
                </span>
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link to="/u/videos/me">
              <Button
                variant="outline"
                className="w-full justify-between rounded-lg py-5 text-xs"
              >
                <span className="flex items-center gap-2">
                  <Video className="size-4 text-primary" /> Manage Your Videos
                </span>
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link to="/u/recording-requests/me">
              <Button
                variant="outline"
                className="w-full justify-between rounded-lg py-5 text-xs"
              >
                <span className="flex items-center gap-2">
                  <Camera className="size-4 text-primary" /> Recording Requests
                </span>
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link to="/u/messages">
              <Button
                variant="outline"
                className="w-full justify-between rounded-lg py-5 text-xs"
              >
                <span className="flex items-center gap-2">
                  <MessageSquare className="size-4 text-primary" /> Chat
                  Messages
                </span>
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card/50 backdrop-blur-md shadow-md rounded-xl">
          <CardHeader>
            <CardTitle className="text-lg font-bold">
              RallyCasts Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <span className="text-xs text-muted-foreground">
                Account Tier
              </span>
              <span className="text-xs font-semibold capitalize bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
                {profile?.accountTier || "Free"}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <span className="text-xs text-muted-foreground">
                Onboarding Status
              </span>
              <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1">
                Completed
              </span>
            </div>
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs text-muted-foreground">Home Venue</span>
              <span className="text-xs font-semibold max-w-[200px] truncate text-right">
                {profile?.homeCourtName || "None set"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
