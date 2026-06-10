import { Button } from "@rallycaststv/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rallycaststv/ui/components/card";
import { cn } from "@rallycaststv/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import {
  Calendar,
  Camera,
  DollarSign,
  Eye,
  MapPin,
  Play,
  Star,
  Users,
  Video,
} from "lucide-react";
import type { ReactNode } from "react";

export interface VideoCardData {
  durationSeconds?: number | null;
  id: string;
  muxPlaybackId?: string | null;
  status?: string;
  thumbnailUrl?: string | null;
  title: string;
}

export interface PlayerCardData {
  bio?: string | null;
  displayUsername?: string | null;
  homeCity?: string | null;
  homeState?: string | null;
  id: string;
  image?: string | null;
  name: string;
  skillLevel?: string | null;
  username?: string | null;
}

export interface VenueCardData {
  activePlayers?: number | null;
  city?: string | null;
  courtCount?: number | null;
  distanceMiles?: number | null;
  heatScore?: number | null;
  id: string;
  name: string;
  state?: string | null;
  venueType?: string;
}

export interface CasterCardData {
  bio?: string | null;
  displayName?: string | null;
  hourlyRateCents?: number;
  serviceRadiusMiles?: number;
  status?: string;
  userId: string;
}

export interface EventCardData {
  capacity?: number | null;
  eventType?: string;
  id: string;
  name: string;
  startsAt: Date | string;
  status?: string;
  location?: string;
  endsAt?: Date | string;
  tags?: string[];
  imageUrl?: string;
}

export interface CastingJobCardData {
  id: string;
  notes?: string | null;
  priceCents?: number;
  requestedHours?: number;
  startsAt: Date | string;
  status?: string;
}

const formatDuration = (seconds?: number | null) => {
  if (!seconds) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const formatDate = (value: Date | string) =>
  new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

const formatMoney = (cents = 0) =>
  new Intl.NumberFormat("en", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(cents / 100);

export function EmptyState({
  action,
  icon,
  message,
  title,
}: {
  action?: ReactNode;
  icon?: ReactNode;
  message: string;
  title: string;
}) {
  return (
    <Card className="rounded-lg border-dashed">
      <CardContent className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
        <div className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
          {icon ?? <Video className="size-5" />}
        </div>
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            {message}
          </p>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}

export function StatCard({
  icon,
  label,
  trend,
  value,
}: {
  icon: ReactNode;
  label: string;
  trend?: string;
  value: string;
}) {
  return (
    <Card className="rounded-lg">
      <CardContent className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold">{value}</p>
          {trend ? <p className="mt-3 text-xs text-primary">{trend}</p> : null}
        </div>
        <div className="grid size-12 place-items-center rounded-full bg-primary/15 text-primary">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

export function VideoCard({ video }: { video: VideoCardData }) {
  const imageUrl =
    video.thumbnailUrl ??
    (video.muxPlaybackId
      ? `https://image.mux.com/${video.muxPlaybackId}/thumbnail.webp?time=1`
      : null);

  return (
    <Link
      to="/videos/$id"
      params={{ id: video.id }}
      className="group min-w-0 block hover:no-underline cursor-pointer"
    >
      <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-muted">
        {imageUrl ? (
          <img
            alt={video.title}
            className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
            src={imageUrl}
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-[linear-gradient(135deg,hsl(142_100%_18%/.35),hsl(78_100%_60%/.12))]">
            <Video className="size-8 text-primary" />
          </div>
        )}
        <div className="absolute inset-0 grid place-items-center bg-black/0 transition-colors group-hover:bg-black/25">
          <div className="grid size-10 place-items-center rounded-full bg-background/90 text-primary opacity-0 transition-opacity group-hover:opacity-100 shadow-md">
            <Play className="size-4 fill-current ml-0.5" />
          </div>
        </div>
        <span className="absolute right-2 bottom-2 rounded bg-black/80 px-1.5 py-0.5 text-xs text-white font-medium">
          {formatDuration(video.durationSeconds)}
        </span>
      </div>
      <h3 className="mt-3 line-clamp-2 text-sm font-semibold group-hover:text-primary transition-colors leading-snug">
        {video.title}
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        {video.status === "ready" ? "Ready to watch" : "Processing"}
      </p>
    </Link>
  );
}

export function PlayerCard({ player }: { player: PlayerCardData }) {
  const location = [player.homeCity, player.homeState]
    .filter(Boolean)
    .join(", ");

  return (
    <Card className="rounded-lg">
      <div className="h-28 bg-[linear-gradient(135deg,hsl(142_100%_18%/.28),hsl(78_100%_60%/.2))]" />
      <CardContent className="-mt-10">
        <Link
          to="/players/$username"
          params={{
            username: player.username ?? player.displayUsername ?? "player",
          }}
          className="group/link block"
        >
          <div className="grid size-16 place-items-center rounded-full border-4 border-card bg-muted text-lg overflow-hidden group-hover/link:border-primary/50 transition-all">
            {player.image ? (
              <img
                alt=""
                className="size-full rounded-full object-cover"
                src={player.image}
              />
            ) : (
              player.name.at(0)
            )}
          </div>
          <h3 className="mt-4 text-lg font-bold group-hover/link:text-primary transition-colors">
            {player.name}
          </h3>
        </Link>
        <p className="text-sm text-muted-foreground">
          @{player.username ?? player.displayUsername ?? "player"}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 text-brand-yellow">
            <Star className="size-3 fill-current" />
            {player.skillLevel ?? "open play"}
          </span>
          {location ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3" />
              {location}
            </span>
          ) : null}
        </div>
        {player.bio ? (
          <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
            {player.bio}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function VenueCard({ venue }: { venue: VenueCardData }) {
  const location = [venue.city, venue.state].filter(Boolean).join(", ");

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>
          <Link
            to="/venues/$id"
            params={{ id: venue.id }}
            className="hover:text-primary transition-colors"
          >
            {venue.name}
          </Link>
        </CardTitle>
        <CardDescription>{venue.venueType ?? "park"}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Link to="/venues/$id" params={{ id: venue.id }} className="block">
          <div className="h-24 rounded-lg bg-[linear-gradient(135deg,hsl(142_100%_18%/.32),hsl(78_100%_60%/.18))] overflow-hidden hover:opacity-90 transition-opacity" />
        </Link>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {location ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-4 text-primary" />
              {location}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <Users className="size-4 text-primary" />
            {venue.courtCount ?? 0} courts
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function ParkHeatCard({ venue }: { venue: VenueCardData }) {
  const location = [venue.city, venue.state].filter(Boolean).join(", ");
  const heatScore = venue.heatScore ?? 35;
  const heatWidth = `${Math.min(Math.max(heatScore, 8), 100)}%`;

  return (
    <article className="w-72 shrink-0 overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <Link to="/venues/$id" params={{ id: venue.id }} className="block">
        <div className="relative h-28 bg-[radial-gradient(circle_at_28%_40%,hsl(78_100%_60%/.55),transparent_24%),radial-gradient(circle_at_72%_36%,hsl(142_100%_18%/.9),transparent_28%),linear-gradient(135deg,hsl(142_100%_18%/.45),hsl(240_10%_4%/.2))] hover:opacity-95 transition-opacity">
          <div className="absolute inset-x-4 bottom-4">
            <div className="h-2 overflow-hidden rounded-full bg-black/35">
              <div
                className="h-full rounded-full bg-brand-yellow"
                style={{ width: heatWidth }}
              />
            </div>
            <p className="mt-2 text-xs font-semibold text-white">
              {heatScore}% heat
            </p>
          </div>
        </div>
      </Link>
      <div className="space-y-3 p-4">
        <div>
          <h3 className="line-clamp-1 font-semibold">
            <Link
              to="/venues/$id"
              params={{ id: venue.id }}
              className="hover:text-primary transition-colors"
            >
              {venue.name}
            </Link>
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {location || venue.venueType || "Nearby park"}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <span className="rounded-md bg-muted px-2 py-1">
            {venue.activePlayers ?? 0} playing
          </span>
          <span className="rounded-md bg-muted px-2 py-1">
            {venue.courtCount ?? 0} courts
          </span>
          <span className="rounded-md bg-muted px-2 py-1">
            {venue.distanceMiles ? `${venue.distanceMiles} mi` : "nearby"}
          </span>
        </div>
      </div>
    </article>
  );
}

export function CasterCard({ caster }: { caster: CasterCardData }) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>
          <Link
            to="/casters/$id"
            params={{ id: caster.userId }}
            className="hover:text-primary transition-colors"
          >
            {caster.displayName ?? "RallyCasts Caster"}
          </Link>
        </CardTitle>
        <CardDescription>{caster.status ?? "available"}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {caster.bio ??
            "Ready to capture matches, highlights, and tournament runs."}
        </p>
        <div className="flex items-center justify-between text-sm">
          <span>{formatMoney(caster.hourlyRateCents)}/hr</span>
          <span>{caster.serviceRadiusMiles ?? 25} mi radius</span>
        </div>
        <div className="flex gap-2">
          <Button className="flex-1 rounded-md text-xs">Request caster</Button>
          <Link
            to="/casters/$id"
            params={{ id: caster.userId }}
            className="flex-1"
          >
            <Button variant="outline" className="w-full rounded-md text-xs">
              View Info
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

const formatDateRange = (start: Date, end: Date | null) => {
  const formatOptions: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  };
  const startStr = new Intl.DateTimeFormat("en", formatOptions).format(start);
  if (!end) {
    return startStr;
  }
  const endStr = new Intl.DateTimeFormat("en", formatOptions).format(end);
  return `${startStr} - ${endStr}`;
};

export function EventCard({ event }: { event: EventCardData }) {
  const startsAtDate = new Date(event.startsAt);
  const endsAtDate = event.endsAt ? new Date(event.endsAt) : null;

  // Static fallback values matching the mockup image
  const fallbacks: Record<
    string,
    { location: string; tags: string[]; banner: string }
  > = {
    "demo-event-1": {
      banner:
        "radial-gradient(circle at 30% 30%, hsl(142 100% 18% / 0.45), transparent), linear-gradient(135deg, hsl(142 100% 18% / 0.8), hsl(78 100% 60% / 0.3))",
      location: "Phoenix, AZ",
      tags: ["tournament", "summer", "all-levels"],
    },
    "demo-event-2": {
      banner:
        "radial-gradient(circle at 70% 30%, hsl(142 100% 18% / 0.5), transparent), linear-gradient(135deg, hsl(240 10% 4% / 0.95), hsl(142 100% 18% / 0.4))",
      location: "Seattle, WA",
      tags: ["tournament", "qualifier", "competitive"],
    },
    "demo-event-3": {
      banner:
        "radial-gradient(circle at 50% 50%, hsl(78 100% 60% / 0.25), transparent), linear-gradient(135deg, hsl(142 100% 18% / 0.65), hsl(240 10% 4% / 0.85))",
      location: "Chicago, IL",
      tags: ["workshop", "beginner", "training"],
    },
  };

  const itemDetails = fallbacks[event.id] || {
    banner:
      "linear-gradient(135deg, hsl(142 100% 18% / 0.65), hsl(78 100% 60% / 0.2))",
    location: event.location || "Austin, TX",
    tags: event.tags || [event.eventType ?? "open play", "pickleball"],
  };

  return (
    <Card className="rounded-xl overflow-hidden border border-border/50 bg-card hover:border-primary/45 transition-all shadow-sm flex flex-col h-full group">
      {/* Banner image wrapper */}
      <Link
        to="/events/$id"
        params={{ id: event.id }}
        className="block relative aspect-video w-full overflow-hidden shrink-0 border-b border-border/30 cursor-pointer"
        style={{ background: itemDetails.banner }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

        {/* Mock visual element: tennis/pickleball net overlay */}
        <div className="absolute inset-x-0 bottom-0 h-10 border-t border-dashed border-white/20 flex items-center justify-center">
          <span className="text-[10px] text-white/45 font-bold uppercase tracking-widest bg-black/40 px-2 py-0.5 rounded backdrop-blur-[2px]">
            {event.eventType ?? "open play"}
          </span>
        </div>

        {/* Dynamic center icon or "?" mark from mockup */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="size-8 rounded bg-sky-950/80 border border-sky-400/30 flex items-center justify-center text-xs text-sky-400 font-extrabold shadow shadow-black/50">
            ?
          </div>
        </div>

        {/* Title text embedded in overlay bottom left */}
        <div className="absolute left-4 bottom-3 right-4 z-10">
          <h3 className="text-base font-extrabold tracking-tight text-white drop-shadow group-hover:text-primary transition-colors">
            {event.name}
          </h3>
        </div>
      </Link>

      {/* Card details body */}
      <CardContent className="p-4 space-y-3.5 flex-1 flex flex-col justify-between">
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-primary shrink-0" />
            <span className="font-medium text-foreground/90">
              {formatDateRange(startsAtDate, endsAtDate)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-primary shrink-0" />
            <span>{itemDetails.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="size-4 text-primary shrink-0" />
            <span>{event.capacity ?? "Open"} players</span>
          </div>
        </div>

        {/* Tags Row */}
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/20">
          {itemDetails.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] bg-muted hover:bg-muted/70 text-muted-foreground font-semibold px-2.5 py-0.5 rounded-full capitalize"
            >
              {tag}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function RequestCard({ job }: { job: CastingJobCardData }) {
  return (
    <Card className="rounded-lg">
      <CardContent className="grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-center">
        <div>
          <h3 className="font-semibold">{job.notes ?? "Recording request"}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {formatDate(job.startsAt)}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <DollarSign className="size-4 text-primary" />
          {formatMoney(job.priceCents)}
        </div>
        <span
          className={cn(
            "w-fit rounded-full px-3 py-1 text-xs font-semibold",
            job.status === "completed"
              ? "bg-blue-500/15 text-blue-500"
              : "bg-brand-yellow text-black"
          )}
        >
          {job.status ?? "requested"}
        </span>
      </CardContent>
    </Card>
  );
}

export const studioStats = [
  {
    icon: <Eye className="size-5" />,
    label: "Total Views",
    trend: "+12.5% from last month",
    value: "2,840",
  },
  {
    icon: <Users className="size-5" />,
    label: "Followers",
    trend: "+8.3% from last month",
    value: "124",
  },
  {
    icon: <DollarSign className="size-5" />,
    label: "Earnings",
    trend: "Start earning now",
    value: "$0",
  },
  {
    icon: <Camera className="size-5" />,
    label: "Caster Requests",
    trend: "2 open this week",
    value: "6",
  },
];
