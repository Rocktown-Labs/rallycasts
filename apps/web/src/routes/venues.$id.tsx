import { Button } from "@rallycaststv/ui/components/button";
import { Card, CardContent } from "@rallycaststv/ui/components/card";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link, createFileRoute } from "@tanstack/react-router";
import {
  MapPin,
  Users,
  Info,
  ChevronLeft,
  Calendar,
  Flame,
  Clock,
  TrendingUp,
  Activity,
  Radio,
} from "lucide-react";

import type { EventCardData } from "@/components/rally/cards";
import { authClient } from "@/lib/auth-client";
import { useRadarTracking } from "@/lib/hooks";

export const Route = createFileRoute("/venues/$id")({
  component: VenueDetailPage,
});

// Fallback data for popular times when no real data is available
const _POPULAR_TIMES = [
  { hour: "6a", value: 15 },
  { hour: "7a", value: 35 },
  { hour: "8a", value: 55 },
  { hour: "9a", value: 75 },
  { hour: "10a", value: 85 },
  { hour: "11a", value: 90 },
  { hour: "12p", value: 80 },
  { hour: "1p", value: 70 },
  { hour: "2p", value: 85 },
  { hour: "3p", value: 95 },
  { hour: "4p", value: 88 },
  { hour: "5p", value: 75 },
  { hour: "6p", value: 60 },
  { hour: "7p", value: 45 },
  { hour: "8p", value: 30 },
  { hour: "9p", value: 15 },
];

const _WEEKLY_VISITS = [
  { day: "Mon", value: 42 },
  { day: "Tue", value: 58 },
  { day: "Wed", value: 65 },
  { day: "Thu", value: 48 },
  { day: "Fri", value: 72 },
  { day: "Sat", value: 95 },
  { day: "Sun", value: 88 },
];

function PopularTimesChart({
  peakHours,
}: {
  peakHours: { hour: string; visits: number }[];
}) {
  const hours =
    peakHours.length > 0
      ? peakHours
      : [
          { hour: "6:00", visits: 15 },
          { hour: "7:00", visits: 35 },
          { hour: "8:00", visits: 55 },
          { hour: "9:00", visits: 75 },
          { hour: "10:00", visits: 85 },
          { hour: "11:00", visits: 90 },
          { hour: "12:00", visits: 80 },
          { hour: "13:00", visits: 70 },
          { hour: "14:00", visits: 85 },
          { hour: "15:00", visits: 95 },
          { hour: "16:00", visits: 88 },
          { hour: "17:00", visits: 75 },
          { hour: "18:00", visits: 60 },
          { hour: "19:00", visits: 45 },
          { hour: "20:00", visits: 30 },
          { hour: "21:00", visits: 15 },
        ];
  const max = Math.max(...hours.map((t) => t.visits));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="size-4 text-primary" />
        <h3 className="font-bold text-sm">Popular Times</h3>
      </div>
      <div className="flex items-end gap-1 h-24">
        {hours.map((time) => {
          const height = max > 0 ? `${(time.visits / max) * 100}%` : "0%";
          const isPeak = time.visits >= max * 0.9;
          return (
            <div
              key={time.hour}
              className="flex-1 flex flex-col items-center gap-1"
            >
              <div
                className={`w-full rounded-t-sm transition-all ${
                  isPeak ? "bg-primary" : "bg-primary/30"
                }`}
                style={{ height }}
                title={`${time.hour}: ${time.visits} visits`}
              />
              <span className="text-[8px] text-muted-foreground">
                {time.hour.split(":")[0]}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-primary" /> Peak
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-primary/30" /> Average
        </span>
      </div>
    </div>
  );
}

function WeeklyActivityChart({
  peakDays,
}: {
  peakDays: { day: string; visits: number }[];
}) {
  const days =
    peakDays.length > 0
      ? peakDays
      : [
          { day: "Mon", visits: 42 },
          { day: "Tue", visits: 58 },
          { day: "Wed", visits: 65 },
          { day: "Thu", visits: 48 },
          { day: "Fri", visits: 72 },
          { day: "Sat", visits: 95 },
          { day: "Sun", visits: 88 },
        ];
  const max = Math.max(...days.map((t) => t.visits));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Activity className="size-4 text-primary" />
        <h3 className="font-bold text-sm">Weekly Visits</h3>
      </div>
      <div className="flex items-end gap-2 h-20">
        {days.map((day) => {
          const height = max > 0 ? `${(day.visits / max) * 100}%` : "0%";
          const isPeak = day.visits >= max * 0.9;
          return (
            <div
              key={day.day}
              className="flex-1 flex flex-col items-center gap-1"
            >
              <div
                className={`w-full rounded-t-sm transition-all ${
                  isPeak ? "bg-brand-yellow" : "bg-brand-yellow/30"
                }`}
                style={{ height }}
                title={`${day.day}: ${day.visits} visits`}
              />
              <span className="text-[8px] text-muted-foreground">
                {day.day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MetricStat({
  label,
  value,
  icon,
  trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend?: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
      <div className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-bold">{value}</p>
        {trend && <p className="text-[10px] text-emerald-500">{trend}</p>}
      </div>
    </div>
  );
}

function VenueHeader({
  venue,
  heatScore,
}: {
  venue: VenueCardData;
  heatScore: number;
}) {
  return (
    <div>
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4"
      >
        <ChevronLeft className="size-3.5" /> Back to Home
      </Link>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full capitalize">
          {venue.venueType || "park"}
        </span>
        <span className="text-xs bg-emerald-500/10 text-emerald-500 font-bold px-2 py-0.5 rounded-full">
          Active Venue
        </span>
        <span className="text-xs bg-brand-yellow/10 text-brand-yellow font-bold px-2 py-0.5 rounded-full">
          {heatScore}% Heat
        </span>
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight mt-2 text-foreground">
        {venue.name}
      </h1>
    </div>
  );
}

function VenueActivityCard({
  heatScore,
  activePlayers,
  visitsToday,
  visitsThisWeek,
}: {
  heatScore: number;
  activePlayers: number;
  visitsToday: number;
  visitsThisWeek: number;
}) {
  return (
    <Card className="border border-border/50 bg-card rounded-xl shadow-sm">
      <CardContent className="p-5 space-y-5">
        <div className="flex items-center gap-2">
          <TrendingUp className="size-4 text-primary" />
          <h3 className="font-bold text-sm">Live Activity</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricStat
            icon={<Flame className="size-4" />}
            label="Heat Score"
            value={`${heatScore}%`}
            trend="+5% from yesterday"
          />
          <MetricStat
            icon={<Users className="size-4" />}
            label="Active Now"
            value={`${activePlayers}`}
            trend="3 in a match"
          />
          <MetricStat
            icon={<Activity className="size-4" />}
            label="Visits Today"
            value={`${visitsToday}`}
            trend="Peak at 3pm"
          />
          <MetricStat
            icon={<Radio className="size-4" />}
            label="This Week"
            value={`${visitsThisWeek}`}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function VenueLocationCard({ venue }: { venue: VenueCardData }) {
  const location = [venue.city, venue.state, venue.postalCode]
    .filter(Boolean)
    .join(", ");

  return (
    <Card className="border border-border/50 bg-card rounded-xl shadow-sm">
      <CardContent className="p-6 space-y-6">
        <div className="flex items-start gap-3.5">
          <MapPin className="size-5 text-primary mt-0.5" />
          <div>
            <h3 className="font-semibold text-sm">Address</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {venue.addressLine1 || "No street address listed"}
              {venue.addressLine2 ? `, ${venue.addressLine2}` : ""}
            </p>
            <p className="text-xs text-muted-foreground">{location}</p>
          </div>
        </div>

        <div className="flex items-start gap-3.5">
          <Users className="size-5 text-primary mt-0.5" />
          <div>
            <h3 className="font-semibold text-sm">Court Configuration</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {venue.courtCount ?? 0} active pickleball courts available
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function VenueDescriptionCard({ venue }: { venue: VenueCardData }) {
  return (
    <Card className="border border-border/50 bg-card rounded-xl shadow-sm">
      <CardContent className="p-6 space-y-3">
        <h3 className="font-bold text-base flex items-center gap-1.5">
          <Info className="size-4 text-primary" /> Court Details
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {venue.description ||
            "Beautiful open-play venue with standard nets. Great lighting for evening matches."}
        </p>
      </CardContent>
    </Card>
  );
}

function VenueAnalyticsCard({
  peakHours,
  peakDays,
}: {
  peakHours: { hour: number; visits: number }[];
  peakDays: { day: string; visits: number }[];
}) {
  return (
    <Card className="border border-border/50 bg-card rounded-xl shadow-sm">
      <CardContent className="p-6 space-y-6">
        <PopularTimesChart peakHours={peakHours} />
        <div className="border-t border-border/30 pt-4">
          <WeeklyActivityChart peakDays={peakDays} />
        </div>
      </CardContent>
    </Card>
  );
}

function VenueSidebar({
  venue,
  events,
  activePlayers,
  analyticsData,
}: {
  venue: VenueCardData;
  events: EventCardData[];
  activePlayers: number;
  analyticsData: VenueAnalytics | undefined;
}) {
  return (
    <div className="space-y-4">
      <Card className="border border-border/50 bg-card rounded-xl shadow-sm p-4 text-center space-y-4">
        <h3 className="font-bold text-sm">Active Events</h3>
        <p className="text-xs text-muted-foreground">
          {events.length} tournament
          {events.length === 1 ? "" : "s"} and open play scheduled at{" "}
          {venue.name}.
        </p>
        {events.length > 0 && (
          <div className="space-y-2">
            {events.slice(0, 3).map((evt: EventCardData) => (
              <Link
                key={evt.id}
                to="/events/$id"
                params={{ id: evt.id }}
                className="block text-xs text-primary hover:underline text-left"
              >
                {evt.name}
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Card className="border border-border/50 bg-card rounded-xl shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Radio className="size-4 text-primary" />
          <h3 className="font-bold text-xs">Radar Tracking</h3>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Enable location tracking to see when friends are here, get popular
          times, and earn park badges.
        </p>
        <Button size="sm" className="w-full rounded-md text-xs">
          Enable Check-ins
        </Button>
      </Card>

      <Card className="border border-border/50 bg-card rounded-xl shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-primary" />
          <h3 className="font-bold text-xs">Active Players</h3>
          {activePlayers > 0 && (
            <span className="text-[10px] bg-emerald-500/10 text-emerald-500 font-bold px-1.5 py-0.5 rounded-full">
              {activePlayers}
            </span>
          )}
        </div>
        <div className="flex -space-x-2">
          {(analyticsData?.activeUsers ?? []).slice(0, 5).map((user, i) => (
            <div
              key={user.userId}
              className="grid size-8 place-items-center rounded-full border-2 border-card bg-muted text-xs font-bold"
              title={`User ${user.userId}`}
            >
              {String.fromCodePoint(65 + i)}
            </div>
          ))}
          {(analyticsData?.activeUsers ?? []).length > 5 && (
            <div className="grid size-8 place-items-center rounded-full border-2 border-card bg-muted text-xs text-muted-foreground">
              +{(analyticsData?.activeUsers ?? []).length - 5}
            </div>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">
          {activePlayers > 0
            ? `${activePlayers} players checked in now`
            : "No active players right now"}
        </p>
      </Card>
    </div>
  );
}

function EventsSection({ events }: { events: EventCardData[] }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <Calendar className="size-5 text-primary" /> Upcoming Events
      </h2>
      {events.length > 0 ? (
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4">
          {events.map((evt: EventCardData) => {
            const dateStr = new Date(evt.startsAt).toLocaleDateString("en-US", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });
            return (
              <Card
                key={evt.id}
                className="border border-border/50 bg-card hover:bg-muted/30 transition-all rounded-lg p-4 w-72 shrink-0"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full capitalize">
                      {evt.eventType?.replace("_", " ") ?? "open play"}
                    </span>
                    <h4 className="font-bold text-sm mt-1.5">{evt.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {dateStr}
                    </p>
                  </div>
                  <Link to="/events/$id" params={{ id: evt.id }}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs rounded-md"
                    >
                      Details
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground bg-muted/20 border border-border/50 rounded-lg p-6 text-center">
          No upcoming tournaments or open play sessions are scheduled here at
          this time.
        </p>
      )}
    </div>
  );
}

function VenueDetailPage() {
  const { id } = useParams({ from: "/venues/$id" });
  const { data, isLoading, error } = useQuery(venueQueryOptions(id));
  const { data: analyticsData } = useQuery({
    ...venueAnalyticsQueryOptions(id),
    queryKey: ["venue", id, "analytics"],
  });

  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;
  useRadarTracking(userId);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6 animate-pulse">
        <div className="h-6 w-24 bg-muted rounded" />
        <div className="h-10 w-96 bg-muted rounded" />
        <div className="h-48 bg-muted rounded-xl" />
      </div>
    );
  }

  if (error || !data?.venue) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center space-y-4">
        <h2 className="text-2xl font-bold text-destructive">Venue not found</h2>
        <p className="text-muted-foreground text-sm">
          The court or park you are looking for does not exist or has been
          removed.
        </p>
        <Link to="/">
          <Button variant="outline" className="rounded-md text-xs mt-4">
            Back to Home
          </Button>
        </Link>
      </div>
    );
  }

  const { venue, events = [] } = data;
  const heatScore = analyticsData?.heatScore ?? 0;
  const activePlayers = analyticsData?.activeCount ?? 0;
  const visitsToday = analyticsData?.todayVisits ?? 0;
  const visitsThisWeek = analyticsData?.weekVisits ?? 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-6 animate-in fade-in duration-300">
      <VenueHeader venue={venue} heatScore={heatScore} />
      <VenueActivityCard
        heatScore={heatScore}
        activePlayers={activePlayers}
        visitsToday={visitsToday}
        visitsThisWeek={visitsThisWeek}
      />
      <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <VenueLocationCard venue={venue} />
          <VenueDescriptionCard venue={venue} />
          <VenueAnalyticsCard
            peakHours={analyticsData?.peakHours ?? []}
            peakDays={analyticsData?.peakDays ?? []}
          />
        </div>
        <VenueSidebar
          venue={venue}
          events={events}
          activePlayers={activePlayers}
          analyticsData={analyticsData}
        />
      </div>
      <EventsSection events={events} />
    </div>
  );
}
