import { Button } from "@rallycaststv/ui/components/button";
import { Card, CardContent } from "@rallycaststv/ui/components/card";
import { Link, createFileRoute, useParams } from "@tanstack/react-router";
import {
  Activity,
  Calendar,
  Camera,
  ChevronLeft,
  Clock,
  Flame,
  Info,
  MapPin,
  Navigation,
  Radio,
  Star,
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
          <Clock className="text-primary size-4" />
          <h3 className="text-sm font-bold">Popular Times</h3>
        </div>
        <div className="border-border/40 bg-muted/15 rounded-xl border p-6 text-center backdrop-blur-xs">
          <Clock className="text-muted-foreground/40 mx-auto mb-2 size-6" />
          <p className="text-foreground text-xs font-semibold">
            No visits recorded yet this week
          </p>
          <p className="text-muted-foreground mx-auto mt-1 max-w-xs text-[11px]">
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
        <Clock className="text-primary size-4" />
        <h3 className="text-sm font-bold">Popular Times</h3>
      </div>
      <div className="flex h-24 items-end gap-1 pt-2">
        {peakHours.map((time) => {
          const height = `${Math.max((time.visits / max) * 100, 4)}%`;
          const isPeak = time.visits >= max * 0.9;
          return (
            <div
              key={time.hour}
              className="group relative flex flex-1 flex-col items-center gap-1"
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
              <span className="text-muted-foreground font-mono text-[8px]">
                {String(time.hour).split(":")[0]}
              </span>
            </div>
          );
        })}
      </div>
      <div className="text-muted-foreground flex items-center gap-3 pt-1 text-[10px]">
        <span className="flex items-center gap-1.5">
          <span className="bg-primary size-2 rounded-full" /> Peak
        </span>
        <span className="flex items-center gap-1.5">
          <span className="bg-primary/25 size-2 rounded-full" /> Average
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
          <Activity className="text-primary size-4" />
          <h3 className="text-sm font-bold">Weekly Visits</h3>
        </div>
        <div className="border-border/40 bg-muted/15 rounded-xl border p-6 text-center backdrop-blur-xs">
          <Activity className="text-muted-foreground/40 mx-auto mb-2 size-6" />
          <p className="text-foreground text-xs font-semibold">
            No activity recorded this week
          </p>
          <p className="text-muted-foreground mx-auto mt-1 max-w-xs text-[11px]">
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
        <Activity className="text-primary size-4" />
        <h3 className="text-sm font-bold">Weekly Visits</h3>
      </div>
      <div className="flex h-20 items-end gap-2 pt-2">
        {peakDays.map((day) => {
          const height = `${Math.max((day.visits / max) * 100, 6)}%`;
          const isPeak = day.visits >= max * 0.9;
          return (
            <div
              key={day.day}
              className="group relative flex flex-1 flex-col items-center gap-1"
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
              <span className="text-muted-foreground text-[8px] font-medium">
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
    <div className="bg-muted/30 border-border/40 hover:bg-muted/40 flex items-center gap-3 rounded-xl border p-3 transition-colors">
      <div className="bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-xl">
        {icon}
      </div>
      <div>
        <p className="text-muted-foreground text-xs">{label}</p>
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
  venue: VenueCardData & { photoUrl?: string | null; isHomeCourt?: boolean };
  heatScore: number;
}) {
  return (
    <div className="space-y-4">
      <Link
        to="/"
        className="text-muted-foreground hover:text-foreground mb-1 inline-flex items-center gap-1.5 text-xs font-medium transition-all active:scale-95"
      >
        <ChevronLeft className="size-3.5" /> Back to Home
      </Link>

      {venue.photoUrl ? (
        <div className="border-border/50 relative h-56 w-full overflow-hidden rounded-2xl border shadow-md sm:h-72 lg:h-84">
          <img
            src={venue.photoUrl}
            alt={venue.name}
            className="size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
          <div className="absolute inset-x-6 bottom-6 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {venue.isHomeCourt ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#bcdf21] px-3 py-1 text-xs font-extrabold text-black shadow-xs">
                  <Star className="size-3.5 fill-black" />
                  Your Home Court
                </span>
              ) : null}
              <span className="bg-primary text-primary-foreground rounded-full px-2.5 py-0.5 text-xs font-bold capitalize shadow-xs">
                {venue.venueType || "park"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-2.5 py-0.5 text-xs font-bold text-white shadow-xs">
                <span className="size-2 rounded-full bg-white" />
                Active Venue
              </span>
              {heatScore > 0 ? (
                <span className="bg-brand-yellow text-brand-dark rounded-full px-2.5 py-0.5 text-xs font-bold shadow-xs">
                  {heatScore}% Heat
                </span>
              ) : (
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white shadow-xs">
                  0% Heat • Quiet
                </span>
              )}
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white drop-shadow-md sm:text-4xl">
              {venue.name}
            </h1>
          </div>
        </div>
      ) : (
        <div className="border-border/50 relative flex h-56 w-full flex-col justify-between overflow-hidden rounded-2xl border bg-gradient-to-br from-emerald-950 via-slate-950 to-teal-950 p-6 shadow-md sm:h-72 sm:p-8 lg:h-84">
          {/* Subtle court line markings */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-20">
            <svg
              className="h-full w-full text-emerald-300"
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
              <span className="size-2.5 rounded-full bg-emerald-400" />
              <span className="font-mono text-[11px] font-medium tracking-wider text-emerald-400/90 uppercase">
                Live Court
              </span>
            </div>
            {heatScore > 0 ? (
              <span className="text-brand-yellow bg-brand-yellow/15 border-brand-yellow/30 flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold">
                <Flame className="fill-brand-yellow size-3.5" />
                {heatScore}% Heat
              </span>
            ) : (
              <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-xs text-white/70">
                Quiet
              </span>
            )}
          </div>

          <div className="relative z-10 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {venue.isHomeCourt ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#bcdf21] px-3 py-1 text-xs font-extrabold text-black shadow-xs">
                  <Star className="size-3.5 fill-black" />
                  Your Home Court
                </span>
              ) : null}
              <span className="bg-primary text-primary-foreground rounded-full px-2.5 py-0.5 text-xs font-bold capitalize shadow-xs">
                {venue.venueType || "park"}
              </span>
              <span className="rounded-full bg-emerald-500 px-2.5 py-0.5 text-xs font-bold text-white shadow-xs">
                Active Venue
              </span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white drop-shadow-md sm:text-4xl">
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
    <Card className="border-border/50 bg-card rounded-xl border shadow-sm">
      <CardContent className="space-y-5 p-5">
        <div className="flex items-center gap-2">
          <TrendingUp className="text-primary size-4" />
          <h3 className="text-sm font-bold">Live Activity & Heat</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
    <Card className="border-border/50 bg-card rounded-xl border shadow-xs">
      <CardContent className="space-y-6 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="bg-primary/10 text-primary mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg">
              <MapPin className="size-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Address & Directions</h3>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {venue.addressLine1 || "No street address listed"}
                {venue.addressLine2 ? `, ${venue.addressLine2}` : ""}
              </p>
              <p className="text-muted-foreground text-xs">{location}</p>
            </div>
          </div>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="border-border/60 bg-muted/30 hover:bg-muted text-foreground inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-2xs transition-all active:scale-[0.97]"
          >
            <Navigation className="text-primary size-3" />
            Directions
          </a>
        </div>

        <div className="border-border/30 flex items-start gap-3.5 border-t pt-2">
          <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-500">
            <Users className="size-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Court Configuration</h3>
            <p className="text-muted-foreground mt-0.5 text-xs">
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
    <Card className="border-border/50 bg-card rounded-xl border shadow-xs">
      <CardContent className="space-y-3 p-6">
        <h3 className="flex items-center gap-1.5 text-base font-bold">
          <Info className="text-primary size-4" /> Court Details
        </h3>
        <p className="text-muted-foreground text-xs leading-relaxed whitespace-pre-wrap">
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
    <Card className="border-border/50 bg-card rounded-xl border shadow-xs">
      <CardContent className="space-y-6 p-6">
        <PopularTimesChart peakHours={peakHours} />
        <div className="border-border/30 border-t pt-4">
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
      <Card className="border-border/50 bg-card space-y-4 rounded-xl border p-4 text-center shadow-xs">
        <h3 className="text-sm font-bold">Active Events</h3>
        <p className="text-muted-foreground text-xs">
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
                className="text-primary block text-left text-xs font-medium transition-all hover:underline active:scale-[0.98]"
              >
                {evt.name}
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Card className="border-border/50 bg-card space-y-3 rounded-xl border p-4 shadow-xs">
        <div className="flex items-center gap-2">
          <Radio className="text-primary size-4" />
          <h3 className="text-xs font-bold">Radar Geofence & Check-In</h3>
        </div>
        <p className="text-muted-foreground text-[10px] leading-relaxed">
          {isCheckedIn
            ? "You are currently checked in at this court! Your presence is contributing to the live heat map."
            : "Check in when you're playing at this court to connect with nearby players and update live court heat."}
        </p>
        {isCheckedIn ? (
          <Button
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full rounded-lg text-xs shadow-2xs transition-all duration-150 active:scale-[0.97]"
            disabled={isCheckingInOut}
            onClick={onCheckOut}
            size="sm"
          >
            {isCheckingInOut ? "Updating..." : "Leave Court / Check Out"}
          </Button>
        ) : (
          <Button
            className="w-full rounded-lg text-xs font-semibold shadow-2xs transition-all duration-150 active:scale-[0.97]"
            disabled={isCheckingInOut}
            onClick={onCheckIn}
            size="sm"
          >
            {isCheckingInOut ? "Checking in..." : "🎾 Check In & Play Here"}
          </Button>
        )}
      </Card>

      <Card className="border-primary/20 bg-primary/5 space-y-2.5 rounded-xl border p-4 shadow-xs">
        <div className="flex items-center gap-2">
          <Camera className="text-primary size-4" />
          <h3 className="text-xs font-bold">Request Caster to this Court</h3>
        </div>
        <p className="text-muted-foreground text-[11px] leading-relaxed">
          Order an on-demand court camera for your match or tournament at{" "}
          {venue.name}.
        </p>
        <Link to="/u/casts/new">
          <Button
            size="sm"
            variant="outline"
            className="border-primary/40 hover:bg-primary/10 w-full cursor-pointer rounded-lg text-xs font-semibold"
          >
            Order Caster ($20/hr)
          </Button>
        </Link>
      </Card>

      <Card className="border-border/50 bg-card space-y-3 rounded-xl border p-4 shadow-xs">
        <div className="flex items-center gap-2">
          <Users className="text-primary size-4" />
          <h3 className="text-xs font-bold">Active Players</h3>
          {activePlayers > 0 && (
            <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-500">
              {activePlayers}
            </span>
          )}
        </div>
        <div className="flex -space-x-2">
          {Array.from({ length: Math.min(activePlayers, 5) }, (_, index) => (
            <div
              className="border-card bg-muted grid size-8 place-items-center rounded-full border-2 text-xs font-bold shadow-2xs"
              key={index}
              title="Active player"
            >
              {String.fromCodePoint(65 + index)}
            </div>
          ))}
          {activePlayers > 5 && (
            <div className="border-card bg-muted text-muted-foreground grid size-8 place-items-center rounded-full border-2 text-xs shadow-2xs">
              +{activePlayers - 5}
            </div>
          )}
        </div>
        <p className="text-muted-foreground text-[10px]">
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
      <h2 className="flex items-center gap-2 text-xl font-bold">
        <Calendar className="text-primary size-5" /> Upcoming Events
      </h2>
      {events.length > 0 ? (
        <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2">
          {events.map((evt: EventCardData) => {
            const dateStr = new Date(evt.startsAt).toLocaleDateString("en-US", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });
            return (
              <Card
                key={evt.id}
                className="border-border/50 bg-card hover:bg-muted/20 hover:border-primary/40 w-72 shrink-0 rounded-xl border p-4 shadow-2xs transition-all active:scale-[0.98]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-bold capitalize">
                      {evt.eventType?.replace("_", " ") ?? "open play"}
                    </span>
                    <h4 className="mt-1.5 line-clamp-1 text-sm font-bold">
                      {evt.name}
                    </h4>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {dateStr}
                    </p>
                  </div>
                  <Link to="/events/$id" params={{ id: evt.id }}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 rounded-lg text-xs transition-all active:scale-[0.97]"
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
        <p className="text-muted-foreground bg-muted/20 border-border/50 rounded-xl border p-6 text-center text-xs">
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
      <div className="mx-auto max-w-7xl animate-pulse space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-muted h-6 w-24 rounded" />
        <div className="bg-muted h-10 w-96 rounded" />
        <div className="bg-muted h-64 rounded-2xl" />
      </div>
    );
  }

  if (error || !data?.venue) {
    return (
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-12 text-center sm:px-6 lg:px-8">
        <h2 className="text-destructive text-2xl font-bold">Venue not found</h2>
        <p className="text-muted-foreground text-sm">
          The court or park you are looking for does not exist or has been
          removed.
        </p>
        <Link to="/">
          <Button
            variant="outline"
            className="mt-4 rounded-lg text-xs transition-all active:scale-[0.97]"
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
    <div className="animate-in fade-in mx-auto max-w-7xl space-y-8 px-4 py-6 duration-300 sm:px-6 lg:px-8">
      <VenueHeader venue={venue} heatScore={heatScore} />
      <VenueActivityCard
        heatScore={heatScore}
        activePlayers={activePlayers}
        visitsToday={visitsToday}
        visitsThisWeek={visitsThisWeek}
      />
      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
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
