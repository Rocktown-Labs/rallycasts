import { Button } from "@rallycaststv/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import {
  useParams,
  Link,
  Outlet,
  createFileRoute,
} from "@tanstack/react-router";
import {
  Calendar,
  ChevronLeft,
  ListChecks,
  Trophy,
  Users,
  Swords,
  MapPin,
  Info,
} from "lucide-react";
import { createContext, useContext } from "react";

import { apiClient } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import { useMyOrganizations } from "@/lib/hooks";

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
  endsAt?: string;
  status: string;
  capacity?: number;
  description?: string;
  venueId?: string;
  entryFeeCents: number;
  organizerUserId?: string;
  registrationDeadline?: string;
  refundPolicy?: string;
  courtLabelsJson?: string;
  organizationId?: string;
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

function EventLayout() {
  const { id } = useParams({ from: "/events/$id" });
  const { data: sessionData } = authClient.useSession();
  const { data: organizationsData } = useMyOrganizations(
    Boolean(sessionData?.user)
  );

  const { data, isLoading, error } = useQuery({
    queryFn: async () => {
      const res = await apiClient.api.events[":id"].$get({
        param: { id },
      });
      if (!res.ok) {
        throw new Error("Failed to fetch event");
      }
      return res.json();
    },
    queryKey: ["event", id],
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-6 animate-pulse">
        <div className="h-6 w-24 bg-muted rounded" />
        <div className="h-10 w-96 bg-muted rounded" />
        <div className="h-64 bg-muted rounded-2xl" />
      </div>
    );
  }

  if (error || !data?.event) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 text-center space-y-4">
        <h2 className="text-2xl font-bold text-destructive">Event not found</h2>
        <p className="text-muted-foreground text-sm">
          The event you are looking for does not exist or has been deleted.
        </p>
        <Link to="/events">
          <Button variant="outline" className="rounded-md text-xs mt-4">
            Back to Events
          </Button>
        </Link>
      </div>
    );
  }

  const { event: eventData } = data;
  const startsAtDate = new Date(eventData.startsAt);
  const formattedDate = startsAtDate.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    weekday: "long",
    year: "numeric",
  });

  // Get location and tag fallbacks from mock list for display
  const eventDetailsMap: Record<
    string,
    { location: string; tags: string[]; imageUrl: string }
  > = {
    "demo-event-1": {
      imageUrl:
        "radial-gradient(circle at 30% 30%, hsl(142 100% 18% / 0.4), transparent), linear-gradient(135deg, hsl(142 100% 18% / 0.8), hsl(78 100% 60% / 0.3))",
      location: "Phoenix, AZ",
      tags: ["tournament", "summer", "all-levels"],
    },
    "demo-event-2": {
      imageUrl:
        "radial-gradient(circle at 70% 30%, hsl(142 100% 18% / 0.5), transparent), linear-gradient(135deg, hsl(240 10% 4% / 0.95), hsl(142 100% 18% / 0.4))",
      location: "Seattle, WA",
      tags: ["tournament", "qualifier", "competitive"],
    },
    "demo-event-3": {
      imageUrl:
        "radial-gradient(circle at 50% 50%, hsl(78 100% 60% / 0.2), transparent), linear-gradient(135deg, hsl(142 100% 18% / 0.6), hsl(240 10% 4% / 0.8))",
      location: "Chicago, IL",
      tags: ["workshop", "beginner", "training"],
    },
  };

  const details = eventDetailsMap[eventData.id] || {
    imageUrl:
      "linear-gradient(135deg, hsl(142 100% 18% / 0.6), hsl(78 100% 60% / 0.15))",
    location: "Austin, TX",
    tags: [eventData.eventType, "pickleball"],
  };
  const manageableOrganizationIds = new Set(
    (organizationsData?.organizations ?? []).map(
      ({ organization }) => organization.id
    )
  );
  const canManageEvent = canUserManageEvent({
    eventData,
    organizationIds: manageableOrganizationIds,
    userId: sessionData?.user?.id,
  });

  const activeLinkClass = "border-primary text-primary font-bold";
  const inactiveLinkClass =
    "border-transparent text-muted-foreground hover:text-foreground";

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-6 animate-in fade-in duration-300">
      {/* Back button */}
      <div>
        <Link
          to={canManageEvent ? "/u/organizer/events" : "/events"}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="size-3.5" />{" "}
          {canManageEvent ? "Back to Organizer Events" : "Back to Events"}
        </Link>
      </div>

      {/* Hero Banner */}
      <div
        className="relative h-64 md:h-80 w-full overflow-hidden rounded-2xl border border-border/50 flex flex-col justify-end p-6 md:p-8"
        style={{ background: details.imageUrl }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-primary text-primary-foreground font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              {eventData.eventType.replace("_", " ")}
            </span>
            <span className="text-[10px] bg-yellow-500/20 text-yellow-400 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              {eventData.status}
            </span>
            {canManageEvent ? (
              <span className="text-[10px] bg-black/40 text-white font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Organizer view
              </span>
            ) : null}
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white max-w-4xl">
            {eventData.name}
          </h1>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs md:text-sm text-gray-300">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="size-4 text-primary" /> {formattedDate}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4 text-primary" /> {details.location}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-4 text-primary" />{" "}
              {eventData.capacity ? `${eventData.capacity} Cap` : "Open Entry"}
            </span>
          </div>
          {canManageEvent ? (
            <div className="flex flex-wrap gap-2 pt-2">
              <Link params={{ id: eventData.id }} to="/events/$id/players">
                <Button className="rounded-md text-xs" size="sm">
                  <Users className="size-3.5" /> Player Pool
                </Button>
              </Link>
              <Link params={{ id: eventData.id }} to="/events/$id/bracket">
                <Button className="rounded-md text-xs" size="sm">
                  <Trophy className="size-3.5" /> Bracket
                </Button>
              </Link>
              <Link params={{ id: eventData.id }} to="/events/$id/matches">
                <Button className="rounded-md text-xs" size="sm">
                  <ListChecks className="size-3.5" /> Match Desk
                </Button>
              </Link>
            </div>
          ) : null}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-border flex flex-wrap gap-x-6 gap-y-2 justify-center sm:justify-start">
        <Link
          to="/events/$id"
          params={{ id: eventData.id }}
          activeProps={{ className: activeLinkClass }}
          inactiveProps={{ className: inactiveLinkClass }}
          activeOptions={{ exact: true }}
          className="pb-3 text-xs sm:text-sm font-bold tracking-wider uppercase flex items-center gap-1.5 border-b-2 transition-all"
        >
          <Info className="size-4" /> Overview
        </Link>
        <Link
          to="/events/$id/bracket"
          params={{ id: eventData.id }}
          activeProps={{ className: activeLinkClass }}
          inactiveProps={{ className: inactiveLinkClass }}
          className="pb-3 text-xs sm:text-sm font-bold tracking-wider uppercase flex items-center gap-1.5 border-b-2 transition-all"
        >
          <Trophy className="size-4" /> Bracket
        </Link>
        <Link
          to="/events/$id/players"
          params={{ id: eventData.id }}
          activeProps={{ className: activeLinkClass }}
          inactiveProps={{ className: inactiveLinkClass }}
          className="pb-3 text-xs sm:text-sm font-bold tracking-wider uppercase flex items-center gap-1.5 border-b-2 transition-all"
        >
          <Users className="size-4" /> Players
        </Link>
        <Link
          to="/events/$id/matches"
          params={{ id: eventData.id }}
          activeProps={{ className: activeLinkClass }}
          inactiveProps={{ className: inactiveLinkClass }}
          className="pb-3 text-xs sm:text-sm font-bold tracking-wider uppercase flex items-center gap-1.5 border-b-2 transition-all"
        >
          <Swords className="size-4" /> Matches
        </Link>
        <Link
          to="/events/$id/locations"
          params={{ id: eventData.id }}
          activeProps={{ className: activeLinkClass }}
          inactiveProps={{ className: inactiveLinkClass }}
          className="pb-3 text-xs sm:text-sm font-bold tracking-wider uppercase flex items-center gap-1.5 border-b-2 transition-all"
        >
          <MapPin className="size-4" /> Locations
        </Link>
      </div>

      {/* Tab content */}
      <div className="pt-2">
        <EventContext.Provider
          value={{ canManageEvent, details, event: eventData }}
        >
          <Outlet />
        </EventContext.Provider>
      </div>
    </div>
  );
}
