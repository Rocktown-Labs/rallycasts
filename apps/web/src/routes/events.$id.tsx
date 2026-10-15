import { Button } from "@rallycaststv/ui/components/button";
import {
  useParams,
  Link,
  Outlet,
  createFileRoute,
} from "@tanstack/react-router";
import {
  Calendar,
  ChevronLeft,
  Eye,
  Info,
  ListChecks,
  MapPin,
  ShieldCheck,
  Swords,
  Trophy,
  Users,
} from "lucide-react";
import { createContext, useContext, useMemo } from "react";

import { accentForeground } from "@/lib/accent-color";
import { authClient } from "@/lib/auth-client";
import { useEvent, useMyOrganizations } from "@/lib/hooks";

export interface EventDetails {
  location: string;
  tags: string[];
  imageUrl: string;
}

export interface EventData {
  id: string;
  name: string;
  eventType: string;
  startsAt: string;
  endsAt?: string | null;
  status: string;
  capacity?: number | null;
  description?: string | null;
  venueId?: string | null;
  entryFeeCents: number;
  organizerUserId?: string | null;
  registrationDeadline?: string | null;
  refundPolicy?: string | null;
  courtLabelsJson?: string | null;
  organizationId?: string | null;
  bracketType?: string | null;
  branding?: EventBranding | null;
}

export interface EventBranding {
  accentColor?: string;
  bannerUrl?: string | null;
  logoUrl?: string | null;
}

export interface EventContextType {
  canManageEvent: boolean;
  event: EventData;
  details: EventDetails;
}

export const EventContext = createContext<EventContextType | null>(null);

export function useEventContext() {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error("useEventContext must be used within EventLayout");
  }
  return context;
}

export const Route = createFileRoute("/events/$id")({
  component: EventLayout,
});

const canUserManageEvent = ({
  eventData,
  organizationIds,
  userId,
}: {
  eventData: EventData;
  organizationIds: Set<string>;
  userId?: string;
}) =>
  Boolean(userId) &&
  (eventData.organizerUserId === userId ||
    Boolean(
      eventData.organizationId && organizationIds.has(eventData.organizationId)
    ));

const DEFAULT_EVENT_ACCENT = "#16a34a";

const eventAccentColor = (branding: EventBranding | null): string =>
  branding?.accentColor ?? DEFAULT_EVENT_ACCENT;

const eventHeroBackground = (branding: EventBranding | null): string => {
  const fallback =
    "linear-gradient(135deg, hsl(142 100% 18% / 0.6), hsl(78 100% 60% / 0.15))";
  if (branding?.bannerUrl) {
    return `url(${branding.bannerUrl}) center / cover`;
  }
  if (branding?.accentColor) {
    return `linear-gradient(135deg, ${branding.accentColor}cc, ${branding.accentColor}44)`;
  }
  return fallback;
};

function EventHeroBanner({
  accentColor,
  canManageEvent,
  eventData,
  formattedDate,
  heroBackground,
  location,
}: {
  accentColor: string;
  canManageEvent: boolean;
  eventData: EventData;
  formattedDate: string;
  heroBackground: string;
  location: string;
}) {
  return (
    <div
      className="border-border/50 relative flex h-64 w-full flex-col justify-end overflow-hidden rounded-2xl border p-6 md:h-80 md:p-8"
      style={{ background: heroBackground }}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

      <div className="relative z-10 space-y-3">
        <div className="flex items-center gap-2">
          {eventData.branding?.logoUrl ? (
            <img
              alt={`${eventData.name} logo`}
              className="size-10 shrink-0 rounded-lg border border-white/30 bg-black/30 object-contain p-1"
              src={eventData.branding.logoUrl}
            />
          ) : null}
          <span
            className="rounded-full px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider uppercase"
            style={{
              backgroundColor: accentColor,
              color: accentForeground(accentColor),
            }}
          >
            {eventData.eventType.replace("_", " ")}
          </span>
          <span className="rounded-full bg-yellow-500/20 px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider text-yellow-400 uppercase">
            {eventData.status}
          </span>
          {canManageEvent ? (
            <span className="rounded-full bg-black/40 px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider text-white uppercase">
              Organizer view
            </span>
          ) : null}
        </div>

        <h1 className="max-w-4xl text-3xl font-extrabold tracking-tight text-white md:text-4xl">
          {eventData.name}
        </h1>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-300 md:text-sm">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="text-primary size-4" /> {formattedDate}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="text-primary size-4" /> {location}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="text-primary size-4" />{" "}
            {eventData.capacity ? `${eventData.capacity} Cap` : "Open Entry"}
          </span>
        </div>
        {canManageEvent ? (
          <div className="flex flex-wrap gap-2 pt-2">
            <Link params={{ id: eventData.id }} to="/events/$id/manage">
              <Button className="rounded-lg text-xs" size="sm">
                <ShieldCheck className="size-3.5" /> Manage Event
              </Button>
            </Link>
            <Link params={{ id: eventData.id }} to="/events/$id/preview">
              <Button
                className="rounded-lg bg-white/15 text-xs text-white hover:bg-white/25"
                size="sm"
                variant="outline"
              >
                <Eye className="size-3.5" /> Preview
              </Button>
            </Link>
            <Link params={{ id: eventData.id }} to="/events/$id/bracket">
              <Button className="rounded-lg text-xs" size="sm">
                <Trophy className="size-3.5" /> Bracket
              </Button>
            </Link>
            <Link params={{ id: eventData.id }} to="/events/$id/matches">
              <Button className="rounded-lg text-xs" size="sm">
                <ListChecks className="size-3.5" /> Match Desk
              </Button>
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function EventLayout() {
  const { id } = useParams({ from: "/events/$id" });
  const { data: sessionData } = authClient.useSession();
  const { data: organizationsData } = useMyOrganizations(
    Boolean(sessionData?.user)
  );

  // Shared hook: its ["events", id] key is the one useUpdateEvent
  // invalidates, so status changes and edits refresh the layout.
  const { data, isLoading, error } = useEvent(id);

  const eventData = data?.event;

  // Every hook must run before the loading/error early returns below, or
  // React throws "rendered more hooks than during the previous render"
  // the moment data arrives.
  const branding = eventData?.branding ?? null;
  const heroBackground = eventHeroBackground(branding);
  const accentColor = eventAccentColor(branding);
  const details = useMemo(
    () => ({
      imageUrl:
        "linear-gradient(135deg, hsl(142 100% 18% / 0.6), hsl(78 100% 60% / 0.15))",
      location: eventData?.venueId
        ? "Venue details available below"
        : "Location to be announced",
      tags: [eventData?.eventType ?? "", "pickleball"],
    }),
    [eventData?.eventType, eventData?.venueId]
  );
  // Only owner/admin org members manage events. The server rejects the
  // editor role, so matching it here avoids a console where every action
  // would fail with a 404.
  const manageableOrganizationIds = new Set(
    (organizationsData?.organizations ?? [])
      .filter(({ role }) => role !== "editor")
      .map(({ organization }) => organization.id)
  );
  const canManageEvent = eventData
    ? canUserManageEvent({
        eventData,
        organizationIds: manageableOrganizationIds,
        userId: sessionData?.user?.id,
      })
    : false;

  const eventContextValue = useMemo<EventContextType | null>(
    () => (eventData ? { canManageEvent, details, event: eventData } : null),
    [canManageEvent, details, eventData]
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl animate-pulse space-y-6 px-4 py-8">
        <div className="bg-muted h-6 w-24 rounded" />
        <div className="bg-muted h-10 w-96 rounded" />
        <div className="bg-muted h-64 rounded-2xl" />
      </div>
    );
  }

  if (error || !eventData) {
    return (
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-12 text-center">
        <h2 className="text-destructive text-2xl font-bold">Event not found</h2>
        <p className="text-muted-foreground text-sm">
          The event you are looking for does not exist or has been deleted.
        </p>
        <Link to="/events">
          <Button variant="outline" className="mt-4 rounded-lg text-xs">
            Back to Events
          </Button>
        </Link>
      </div>
    );
  }

  const startsAtDate = new Date(eventData.startsAt);
  const formattedDate = startsAtDate.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    weekday: "long",
    year: "numeric",
  });

  const activeLinkClass = "border-primary text-primary font-bold";
  const inactiveLinkClass =
    "border-transparent text-muted-foreground hover:text-foreground";

  return (
    <div className="animate-in fade-in mx-auto max-w-7xl space-y-6 px-4 py-6 duration-300">
      {/* Back button */}
      <div>
        <Link
          to={canManageEvent ? "/u/organizer/tournaments" : "/events"}
          className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 text-xs"
        >
          <ChevronLeft className="size-3.5" />{" "}
          {canManageEvent ? "Back to My Tournaments" : "Back to Events"}
        </Link>
      </div>

      {/* Hero Banner */}
      <EventHeroBanner
        accentColor={accentColor}
        canManageEvent={canManageEvent}
        eventData={eventData}
        formattedDate={formattedDate}
        heroBackground={heroBackground}
        location={details.location}
      />

      {/* Tabs Navigation */}
      <div className="border-border flex flex-wrap justify-center gap-x-6 gap-y-2 border-b sm:justify-start">
        <Link
          to="/events/$id"
          params={{ id: eventData.id }}
          activeProps={{ className: activeLinkClass }}
          inactiveProps={{ className: inactiveLinkClass }}
          activeOptions={{ exact: true }}
          className="flex items-center gap-1.5 border-b-2 pb-3 text-xs font-bold tracking-wider uppercase transition-all sm:text-sm"
        >
          <Info className="size-4" /> Overview
        </Link>
        <Link
          to="/events/$id/bracket"
          params={{ id: eventData.id }}
          activeProps={{ className: activeLinkClass }}
          inactiveProps={{ className: inactiveLinkClass }}
          className="flex items-center gap-1.5 border-b-2 pb-3 text-xs font-bold tracking-wider uppercase transition-all sm:text-sm"
        >
          <Trophy className="size-4" /> Bracket
        </Link>
        <Link
          to="/events/$id/players"
          params={{ id: eventData.id }}
          activeProps={{ className: activeLinkClass }}
          inactiveProps={{ className: inactiveLinkClass }}
          className="flex items-center gap-1.5 border-b-2 pb-3 text-xs font-bold tracking-wider uppercase transition-all sm:text-sm"
        >
          <Users className="size-4" /> Players
        </Link>
        <Link
          to="/events/$id/matches"
          params={{ id: eventData.id }}
          activeProps={{ className: activeLinkClass }}
          inactiveProps={{ className: inactiveLinkClass }}
          className="flex items-center gap-1.5 border-b-2 pb-3 text-xs font-bold tracking-wider uppercase transition-all sm:text-sm"
        >
          <Swords className="size-4" /> Matches
        </Link>
        <Link
          to="/events/$id/locations"
          params={{ id: eventData.id }}
          activeProps={{ className: activeLinkClass }}
          inactiveProps={{ className: inactiveLinkClass }}
          className="flex items-center gap-1.5 border-b-2 pb-3 text-xs font-bold tracking-wider uppercase transition-all sm:text-sm"
        >
          <MapPin className="size-4" /> Locations
        </Link>
        {canManageEvent ? (
          <Link
            to="/events/$id/manage"
            params={{ id: eventData.id }}
            activeProps={{ className: activeLinkClass }}
            inactiveProps={{ className: inactiveLinkClass }}
            className="flex items-center gap-1.5 border-b-2 pb-3 text-xs font-bold tracking-wider uppercase transition-all sm:text-sm"
          >
            <ShieldCheck className="size-4" /> Manage
          </Link>
        ) : null}
      </div>

      {/* Tab content */}
      <div className="pt-2">
        <EventContext.Provider value={eventContextValue}>
          <Outlet />
        </EventContext.Provider>
      </div>
    </div>
  );
}
