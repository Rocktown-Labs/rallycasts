import { Button } from "@rallycaststv/ui/components/button";
import { Card, CardContent } from "@rallycaststv/ui/components/card";
import { Link, createFileRoute, useParams } from "@tanstack/react-router";
import {
  Activity,
  Calendar,
  ChevronLeft,
  Clock,
  Flame,
  Info,
  MapPin,
  Radio,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import type { EventCardData, VenueCardData } from "@/components/rally/cards";
import { authClient } from "@/lib/auth-client";
import {
  useLocationConsent,
  useRadarTracking,
  useVenue,
  useVenueAnalytics,
  useVenueCheckIn,
  useVenueCheckOut,
} from "@/lib/hooks";

export const Route = createFileRoute("/venues/$id")({
  component: VenueDetailPage,
});

function PopularTimesChart({
  peakHours,
}: {
  peakHours: { hour: string | number; visits: number }[];
}) {
  const hasVisits = peakHours.some((h) => h.visits > 0);

  if (!hasVisits) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-primary" />
          <h3 className="font-bold text-sm">Popular Times</h3>
        </div>
        <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-6 text-center">
          <Clock className="size-6 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-xs font-medium text-foreground">
            No visits recorded yet this week
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Check in below when you arrive to start heating up this court!
          </p>
        </div>
      </div>
    );
  }

  const max = Math.max(...peakHours.map((t) => t.visits), 1);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="size-4 text-primary" />
        <h3 className="font-bold text-sm">Popular Times</h3>
      </div>
      <div className="flex items-end gap-1 h-24">
        {peakHours.map((time) => {
          const height = `${(time.visits / max) * 100}%`;
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
                {String(time.hour).split(":")[0]}
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
  const hasVisits = peakDays.some((d) => d.visits > 0);

  if (!hasVisits) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-primary" />
          <h3 className="font-bold text-sm">Weekly Visits</h3>
        </div>
        <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-6 text-center">
          <Activity className="size-6 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-xs font-medium text-foreground">
            No activity recorded this week
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Weekly visits update automatically as players check in.
          </p>
        </div>
      </div>
    );
  }

  const max = Math.max(...peakDays.map((t) => t.visits), 1);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Activity className="size-4 text-primary" />
        <h3 className="font-bold text-sm">Weekly Visits</h3>
      </div>
      <div className="flex items-end gap-2 h-20">
        {peakDays.map((day) => {
          const height = `${(day.visits / max) * 100}%`;
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
  venue: VenueCardData & { photoUrl?: string | null };
  heatScore: number;
}) {
  return (
    <div className="space-y-4">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-1"
      >
        <ChevronLeft className="size-3.5" /> Back to Home
      </Link>

      {venue.photoUrl ? (
        <div className="relative h-48 sm:h-64 w-full rounded-2xl overflow-hidden border border-border/50 shadow-md">
          <img
            src={venue.photoUrl}
            alt={venue.name}
            className="size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
          <div className="absolute inset-x-6 bottom-5 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs bg-primary text-primary-foreground font-bold px-2.5 py-0.5 rounded-full capitalize shadow-xs">
                {venue.venueType || "park"}
              </span>
              <span className="text-xs bg-emerald-500 text-white font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                Active Venue
              </span>
              <span className="text-xs bg-brand-yellow text-brand-dark font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                {heatScore}% Heat
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-md">
              {venue.name}
            </h1>
          </div>
        </div>
      ) : (
        <div>
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
      )}
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
          <h3 className="font-bold text-sm">Live Activity & Heat</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricStat
            icon={<Flame className="size-4" />}
            label="Heat Score"
            value={`${heatScore}%`}
            trend={heatScore >= 50 ? "High Activity" : undefined}
          />
          <MetricStat
            icon={<Users className="size-4" />}
            label="Active Now"
            value={`${activePlayers}`}
            trend={activePlayers > 0 ? `${activePlayers} playing` : undefined}
          />
          <MetricStat
            icon={<Activity className="size-4" />}
            label="Visits Today"
            value={`${visitsToday}`}
            trend={visitsToday > 0 ? "Logged today" : undefined}
          />
          <MetricStat
            icon={<Radio className="size-4" />}
            label="This Week"
            value={`${visitsThisWeek}`}
            trend={visitsThisWeek > 0 ? "Total check-ins" : undefined}
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
  peakHours: { hour: string | number; visits: number }[];
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
  activePlayers,
  events,
  isCheckedIn,
  isCheckingInOut,
  onCheckIn,
  onCheckOut,
  venue,
}: {
  venue: VenueCardData;
  events: EventCardData[];
  activePlayers: number;
  isCheckedIn: boolean;
  isCheckingInOut: boolean;
  onCheckIn: () => void;
  onCheckOut: () => void;
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
          <h3 className="font-bold text-xs">Radar Geofence & Check-In</h3>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          {isCheckedIn
            ? "You are currently checked in at this court! Your presence is contributing to the live heat map."
            : "Check in when you're playing at this court to connect with nearby players and update live court heat."}
        </p>
        {isCheckedIn ? (
          <Button
            className="w-full rounded-md text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isCheckingInOut}
            onClick={onCheckOut}
            size="sm"
          >
            {isCheckingInOut ? "Updating..." : "Leave Court / Check Out"}
          </Button>
        ) : (
          <Button
            className="w-full rounded-md text-xs font-semibold"
            disabled={isCheckingInOut}
            onClick={onCheckIn}
            size="sm"
          >
            {isCheckingInOut ? "Checking in..." : "🎾 Check In & Play Here"}
          </Button>
        )}
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
          {Array.from({ length: Math.min(activePlayers, 5) }, (_, index) => (
            <div
              className="grid size-8 place-items-center rounded-full border-2 border-card bg-muted text-xs font-bold"
              key={index}
              title="Active player"
            >
              {String.fromCodePoint(65 + index)}
            </div>
          ))}
          {activePlayers > 5 && (
            <div className="grid size-8 place-items-center rounded-full border-2 border-card bg-muted text-xs text-muted-foreground">
              +{activePlayers - 5}
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

// oxlint-disable-next-line complexity -- Venue detail combines analytics, consent, and loading states.
function VenueDetailPage() {
  const { id } = useParams({ from: "/venues/$id" });
  const { data, isLoading, error } = useVenue(id);
  const { data: analyticsData } = useVenueAnalytics(id);
  const checkInMutation = useVenueCheckIn();
  const checkOutMutation = useVenueCheckOut();

  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;
  const { hasConsent: hasLocationConsent } = useLocationConsent();
  useRadarTracking(userId, hasLocationConsent);

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
  const isCheckedIn = Boolean(analyticsData?.isCheckedIn);
  const isCheckingInOut =
    checkInMutation.isPending || checkOutMutation.isPending;

  const handleCheckIn = () => {
    if (!session?.user) {
      toast.error("Please sign in to check in at this venue");
      return;
    }
    checkInMutation.mutate(id, {
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : "Failed to check in");
      },
      onSuccess: (res) => {
        toast.success(res?.message || "Checked in successfully!");
      },
    });
  };

  const handleCheckOut = () => {
    checkOutMutation.mutate(id, {
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : "Failed to check out");
      },
      onSuccess: (res) => {
        toast.info(res?.message || "Checked out successfully");
      },
    });
  };

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
          isCheckedIn={isCheckedIn}
          isCheckingInOut={isCheckingInOut}
          onCheckIn={handleCheckIn}
          onCheckOut={handleCheckOut}
        />
      </div>
      <EventsSection events={events} />
    </div>
  );
}
