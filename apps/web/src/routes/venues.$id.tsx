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
  Navigation,
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
        <div className="rounded-xl border border-border/40 bg-muted/15 backdrop-blur-xs p-6 text-center">
          <Clock className="size-6 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-xs font-semibold text-foreground">
            No visits recorded yet this week
          </p>
          <p className="text-[11px] text-muted-foreground mt-1 max-w-xs mx-auto">
            Check in below when you arrive to heat up this court and log
            activity for your community.
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
      <div className="flex items-end gap-1 h-24 pt-2">
        {peakHours.map((time) => {
          const height = `${Math.max((time.visits / max) * 100, 4)}%`;
          const isPeak = time.visits >= max * 0.9;
          return (
            <div
              key={time.hour}
              className="flex-1 flex flex-col items-center gap-1 group relative"
            >
              <div
                className={`w-full rounded-t-md transition-all duration-200 ${
                  isPeak
                    ? "bg-primary group-hover:brightness-110"
                    : "bg-primary/25 group-hover:bg-primary/45"
                }`}
                style={{ height }}
                title={`${time.hour}: ${time.visits} visits`}
              />
              <span className="text-[8px] text-muted-foreground font-mono">
                {String(time.hour).split(":")[0]}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-primary" /> Peak
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-primary/25" /> Average
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
        <div className="rounded-xl border border-border/40 bg-muted/15 backdrop-blur-xs p-6 text-center">
          <Activity className="size-6 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-xs font-semibold text-foreground">
            No activity recorded this week
          </p>
          <p className="text-[11px] text-muted-foreground mt-1 max-w-xs mx-auto">
            Weekly visits update automatically as players check in via geofence
            or app tap.
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
      <div className="flex items-end gap-2 h-20 pt-2">
        {peakDays.map((day) => {
          const height = `${Math.max((day.visits / max) * 100, 6)}%`;
          const isPeak = day.visits >= max * 0.9;
          return (
            <div
              key={day.day}
              className="flex-1 flex flex-col items-center gap-1 group relative"
            >
              <div
                className={`w-full rounded-t-md transition-all duration-200 ${
                  isPeak
                    ? "bg-brand-yellow group-hover:brightness-110"
                    : "bg-brand-yellow/30 group-hover:bg-brand-yellow/50"
                }`}
                style={{ height }}
                title={`${day.day}: ${day.visits} visits`}
              />
              <span className="text-[8px] text-muted-foreground font-medium">
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
    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/40 hover:bg-muted/40 transition-colors">
      <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-bold">{value}</p>
        {trend && (
          <p className="text-[10px] font-medium text-emerald-500">{trend}</p>
        )}
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
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground active:scale-95 transition-all mb-1 font-medium"
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
              <span className="inline-flex items-center gap-1.5 text-xs bg-emerald-500 text-white font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                </span>
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
        <div className="relative h-48 sm:h-56 w-full rounded-2xl overflow-hidden border border-border/50 bg-gradient-to-br from-emerald-950 via-slate-950 to-teal-950 p-6 flex flex-col justify-between shadow-md">
          {/* Subtle court line markings */}
          <div className="pointer-events-none absolute inset-0 opacity-15 overflow-hidden">
            <svg
              className="w-full h-full text-emerald-300"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 400 200"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <rect
                x="20"
                y="20"
                width="360"
                height="160"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
              <line
                x1="200"
                y1="20"
                x2="200"
                y2="180"
                stroke="currentColor"
                strokeWidth="3"
              />
              <line
                x1="140"
                y1="20"
                x2="140"
                y2="180"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="4 2"
              />
              <line
                x1="260"
                y1="20"
                x2="260"
                y2="180"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="4 2"
              />
              <line
                x1="20"
                y1="100"
                x2="140"
                y2="100"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <line
                x1="260"
                y1="100"
                x2="380"
                y2="100"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </div>

          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-[11px] uppercase tracking-wider text-emerald-400/90 font-mono font-medium">
                Live Radar Monitored
              </span>
            </div>
            {heatScore > 0 && (
              <span className="text-xs font-bold text-brand-yellow flex items-center gap-1 bg-brand-yellow/15 px-2.5 py-1 rounded-full border border-brand-yellow/30">
                <Flame className="size-3.5 fill-brand-yellow" />
                {heatScore}% Heat
              </span>
            )}
          </div>

          <div className="relative z-10 space-y-2">
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

  const mapQuery = encodeURIComponent(
    [venue.name, venue.addressLine1, venue.city, venue.state]
      .filter(Boolean)
      .join(", ")
  );
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;

  return (
    <Card className="border border-border/50 bg-card rounded-xl shadow-xs">
      <CardContent className="p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
              <MapPin className="size-4.5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Address & Directions</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {venue.addressLine1 || "No street address listed"}
                {venue.addressLine2 ? `, ${venue.addressLine2}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">{location}</p>
            </div>
          </div>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border/60 bg-muted/30 hover:bg-muted active:scale-[0.97] transition-all text-foreground shrink-0 shadow-2xs"
          >
            <Navigation className="size-3 text-primary" />
            Directions
          </a>
        </div>

        <div className="flex items-start gap-3.5 pt-2 border-t border-border/30">
          <div className="grid size-9 place-items-center rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0 mt-0.5">
            <Users className="size-4.5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Court Configuration</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {venue.courtCount ?? 0} active pickleball court
              {(venue.courtCount ?? 0) === 1 ? "" : "s"} available
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function VenueDescriptionCard({ venue }: { venue: VenueCardData }) {
  return (
    <Card className="border border-border/50 bg-card rounded-xl shadow-xs">
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
    <Card className="border border-border/50 bg-card rounded-xl shadow-xs">
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
      <Card className="border border-border/50 bg-card rounded-xl shadow-xs p-4 text-center space-y-4">
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
                className="block text-xs text-primary hover:underline text-left font-medium active:scale-[0.98] transition-all"
              >
                {evt.name}
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Card className="border border-border/50 bg-card rounded-xl shadow-xs p-4 space-y-3">
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
            className="w-full rounded-lg text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-[0.97] transition-all duration-150 shadow-2xs"
            disabled={isCheckingInOut}
            onClick={onCheckOut}
            size="sm"
          >
            {isCheckingInOut ? "Updating..." : "Leave Court / Check Out"}
          </Button>
        ) : (
          <Button
            className="w-full rounded-lg text-xs font-semibold active:scale-[0.97] transition-all duration-150 shadow-2xs"
            disabled={isCheckingInOut}
            onClick={onCheckIn}
            size="sm"
          >
            {isCheckingInOut ? "Checking in..." : "🎾 Check In & Play Here"}
          </Button>
        )}
      </Card>

      <Card className="border border-border/50 bg-card rounded-xl shadow-xs p-4 space-y-3">
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
              className="grid size-8 place-items-center rounded-full border-2 border-card bg-muted text-xs font-bold shadow-2xs"
              key={index}
              title="Active player"
            >
              {String.fromCodePoint(65 + index)}
            </div>
          ))}
          {activePlayers > 5 && (
            <div className="grid size-8 place-items-center rounded-full border-2 border-card bg-muted text-xs text-muted-foreground shadow-2xs">
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
                className="border border-border/50 bg-card hover:bg-muted/20 hover:border-primary/40 active:scale-[0.98] transition-all rounded-xl p-4 w-72 shrink-0 shadow-2xs"
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full capitalize">
                      {evt.eventType?.replace("_", " ") ?? "open play"}
                    </span>
                    <h4 className="font-bold text-sm mt-1.5 line-clamp-1">
                      {evt.name}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {dateStr}
                    </p>
                  </div>
                  <Link to="/events/$id" params={{ id: evt.id }}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs rounded-lg active:scale-[0.97] transition-all shrink-0"
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
        <p className="text-xs text-muted-foreground bg-muted/20 border border-border/50 rounded-xl p-6 text-center">
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
          <Button
            variant="outline"
            className="rounded-lg text-xs mt-4 active:scale-[0.97] transition-all"
          >
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
