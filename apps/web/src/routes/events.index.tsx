/* eslint-disable complexity */
import { Button } from "@rallycaststv/ui/components/button";
import { Input } from "@rallycaststv/ui/components/input";
import { cn } from "@rallycaststv/ui/lib/utils";
import { Link, createFileRoute, useSearch } from "@tanstack/react-router";
import {
  Trophy,
  ArrowRight,
  BadgeCheck,
  Building2,
  Plus,
  XCircle,
  Calendar,
  MapPin,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { PlaceSearchPicker } from "@/components/places/place-search-picker";
import type { SelectedPlace } from "@/components/places/place-search-picker";
import { EmptyState, EventCard } from "@/components/rally/cards";
import { authClient } from "@/lib/auth-client";
import {
  useCreateEvent,
  useEvents,
  useMyOrganizations,
  useOrganizations,
  useProfile,
  useUpdateProfile,
  useGeolocation,
} from "@/lib/hooks";

const eventsSearchSchema = z.object({
  section: z.string().optional(),
});

export const Route = createFileRoute("/events/")({
  component: EventsPage,
  validateSearch: eventsSearchSchema,
});

function HorizontalScroll({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "scrollbar-thumb-muted hover:scrollbar-thumb-muted-foreground/30 -mx-4 flex scrollbar-thin scrollbar-track-transparent gap-4 overflow-x-auto px-4 pb-2",
        className
      )}
    >
      {children}
    </div>
  );
}

interface OrganizationSummary {
  bio?: string | null;
  city?: string | null;
  id: string;
  isOfficial?: boolean | null;
  logoUrl?: string | null;
  name: string;
  slug: string;
  state?: string | null;
}

const getOrganizerPreview = (
  organizations: OrganizationSummary[] | undefined,
  userCity: string | undefined,
  userState: string
) => {
  const safeOrganizations = (organizations ?? []).filter((org) =>
    Boolean(org?.id && org?.slug)
  );
  const localOrganizations = safeOrganizations.filter((organization) => {
    const sameState = organization.state === userState;
    const sameCity =
      Boolean(userCity) && organization.city?.toLowerCase() === userCity;
    return sameCity || sameState;
  });

  return (
    localOrganizations.length > 0 ? localOrganizations : safeOrganizations
  ).slice(0, 6);
};

function LocalOrganizersSection({
  organizations,
  userState,
}: {
  organizations: OrganizationSummary[];
  userState: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground flex items-center gap-2 text-xl font-bold tracking-tight">
            <Building2 className="text-primary size-5" /> Local Hosts
          </h2>
          <p className="text-muted-foreground mt-1 text-xs">
            Clubs, leagues, and hosts creating events near {userState}.
          </p>
        </div>
        <Link
          to="/events/hosts"
          className="text-primary hover:bg-muted hover:text-primary/80 rounded-md px-3 py-2 text-xs font-semibold"
        >
          View All
        </Link>
      </div>
      {organizations.some((org) => Boolean(org?.id && org?.slug)) ? (
        <HorizontalScroll>
          {organizations
            .filter((org) => Boolean(org?.id && org?.slug))
            .map((organization) => (
              <Link
                className="group border-border bg-card hover:border-primary/40 w-72 shrink-0 rounded-lg border p-4 shadow-sm transition-colors"
                key={organization.id}
                params={{ slug: organization.slug }}
                to="/events/hosts/$slug"
              >
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 text-primary grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg">
                    {organization.logoUrl ? (
                      <img
                        alt={`${organization.name} logo`}
                        className="size-full object-cover"
                        src={organization.logoUrl}
                      />
                    ) : (
                      <Building2 className="size-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="group-hover:text-primary flex items-center gap-1.5 truncate text-sm font-bold">
                      {organization.name}
                      {organization.isOfficial ? (
                        <BadgeCheck className="size-4 shrink-0 text-[#bcdf21]" />
                      ) : null}
                    </h3>
                    <p className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                      <MapPin className="size-3" />
                      {[organization.city, organization.state]
                        .filter(Boolean)
                        .join(", ") || "Location coming soon"}
                    </p>
                  </div>
                </div>
                <p className="text-muted-foreground mt-3 line-clamp-2 text-xs leading-relaxed">
                  {organization.bio ??
                    "Tournament and pickleball community host."}
                </p>
              </Link>
            ))}
        </HorizontalScroll>
      ) : (
        <EmptyState
          icon={<Building2 className="size-5" />}
          message="Hosts will appear here as local clubs and organizers create their profiles."
          title="No hosts yet"
        />
      )}
    </div>
  );
}

function EventsPage() {
  const { data: session } = authClient.useSession();
  const { data: eventsData, isLoading: eventsLoading } = useEvents();
  const { data: profileData } = useProfile();
  const updateProfileMutation = useUpdateProfile();
  const createEventMutation = useCreateEvent();
  const { data: organizationsData } = useMyOrganizations(
    Boolean(session?.user)
  );
  const { data: publicOrganizationsData } = useOrganizations();
  const { location } = useGeolocation();

  const userState = location?.stateCode || "AR";
  const userCity = location?.city?.toLowerCase();

  const profile = profileData?.profile;
  const isOrganizer = profile?.isOrganizer ?? false;
  const isPlatformAdmin = profileData?.isPlatformAdmin ?? false;

  const search = useSearch({ strict: false });
  const initialSection =
    typeof search.section === "string" &&
    ["near-you", "state", "global"].includes(search.section)
      ? (search.section as "near-you" | "state" | "global")
      : null;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewAllSection, setViewAllSection] = useState<
    "near-you" | "state" | "global" | null
  >(initialSection);

  // Form states for creating an event
  const [eventName, setEventName] = useState("");
  const [eventType, setEventType] = useState("tournament");
  const [startsAt, setStartsAt] = useState("2026-06-20T15:00");
  const [capacity, setCapacity] = useState("96");
  const [description, setDescription] = useState("");
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(
    null
  );

  const allEvents = eventsData?.events ?? [];
  const myOrganizations = organizationsData?.organizations ?? [];
  const publicOrganizations = publicOrganizationsData?.organizations ?? [];

  const parsedEvents = allEvents.map((event) => ({
    ...event,
    distanceMiles: null,
    location: event.venueId ? "Validated venue" : "Location to be announced",
    state: null,
  }));

  const nearYouEvents: typeof parsedEvents = [];
  const statewideEvents: typeof parsedEvents = [];
  const globalEvents = parsedEvents;
  const organizerPreview = getOrganizerPreview(
    publicOrganizations,
    userCity,
    userState
  );

  const handleUpgrade = async () => {
    try {
      await updateProfileMutation.mutateAsync({
        isOrganizer: true,
      });
      toast.success("Congratulations! You are now an Organizer.");
    } catch {
      toast.error("Failed to upgrade account. Please try again.");
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim()) {
      toast.error("Event name is required.");
      return;
    }
    if (!selectedPlace) {
      toast.error("Select a validated location before publishing.");
      return;
    }

    try {
      await createEventMutation.mutateAsync({
        capacity: Math.trunc(Number(capacity)) || 64,
        description: description.trim() || undefined,
        eventType: eventType as
          | "clinic"
          | "league"
          | "open_play"
          | "tournament",
        googlePlaceId: selectedPlace.placeId,
        name: eventName,
        organizationId: selectedOrganizationId || undefined,
        startsAt: new Date(startsAt).toISOString(),
        status: "published",
      });

      setShowCreateModal(false);
      setEventName("");
      setEventType("tournament");
      setCapacity("96");
      setDescription("");
      setSelectedOrganizationId("");
      setLocationQuery("");
      setSelectedPlace(null);

      toast.success(
        isPlatformAdmin
          ? `Published RallyCasts-hosted event: ${eventName}.`
          : `Successfully published event: ${eventName}!`
      );
    } catch {
      toast.error("Failed to publish event. Please try again.");
    }
  };

  const organizerTitle = (() => {
    if (!isOrganizer) {
      return "Upgrade to an Organizer Account";
    }

    return isPlatformAdmin
      ? "Manage RallyCasts Hosted Events"
      : "Manage Your Club & Tournaments";
  })();

  const organizerCopy = (() => {
    if (!isOrganizer) {
      return "Organizer premium is for leagues, clinics, and tournaments that want discoverable events, recording packages, and better player turnout.";
    }

    return isPlatformAdmin
      ? "Publish official RallyCasts events, manage registration lists, configure brackets, and request caster coverage."
      : "Publish new events, manage registration lists, view seeds, configure brackets, and request premium caster coverage.";
  })();

  const renderEventsDashboard = () => {
    if (eventsLoading) {
      return (
        <div className="animate-in fade-in grid grid-cols-2 gap-3 duration-300 sm:gap-6 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-muted/40 border-border/50 h-48 animate-pulse rounded-2xl border"
            />
          ))}
        </div>
      );
    }

    if (viewAllSection) {
      const getSectionDetails = () => {
        switch (viewAllSection) {
          case "near-you": {
            return {
              list: nearYouEvents,
              title: "Events Near You (Within 1 Mile)",
            };
          }
          case "state": {
            return {
              list: statewideEvents,
              title: `Statewide Events in ${userState}`,
            };
          }
          case "global": {
            return {
              list: globalEvents,
              title: "Nationwide & Global Events",
            };
          }
          default: {
            return { list: [], title: "" };
          }
        }
      };

      const section = getSectionDetails();

      return (
        <div className="animate-in fade-in space-y-6 duration-300">
          <div className="flex items-center justify-between">
            <h2 className="text-foreground text-xl font-bold tracking-tight">
              {section.title} ({section.list.length})
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewAllSection(null)}
              className="h-8 rounded-md text-xs"
            >
              ← Back to Dashboard
            </Button>
          </div>
          {section.list.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
              {section.list.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <EmptyState
              message="No events found in this section."
              title="No events found"
            />
          )}
        </div>
      );
    }

    return (
      <div className="animate-in fade-in space-y-10 duration-500">
        {/* Section 1: Near You */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-foreground flex items-center gap-2 text-xl font-bold tracking-tight">
              <MapPin className="text-primary size-5" /> Near You (Within 1
              Mile)
            </h2>
            {nearYouEvents.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewAllSection("near-you")}
                className="text-primary hover:text-primary/80 rounded-md text-xs font-semibold"
              >
                View All
              </Button>
            )}
          </div>
          {nearYouEvents.length > 0 ? (
            <HorizontalScroll>
              {nearYouEvents.map((event) => (
                <div key={event.id} className="w-80 shrink-0">
                  <EventCard event={event} />
                </div>
              ))}
            </HorizontalScroll>
          ) : (
            <EmptyState
              icon={<MapPin className="size-5" />}
              message="No events scheduled within a mile range yet."
              title="No events near you"
            />
          )}
        </div>

        {/* Section 2: Statewide */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-foreground flex items-center gap-2 text-xl font-bold tracking-tight">
              <Calendar className="text-primary size-5" /> Statewide (
              {userState})
            </h2>
            {statewideEvents.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewAllSection("state")}
                className="text-primary hover:text-primary/80 rounded-md text-xs font-semibold"
              >
                View All
              </Button>
            )}
          </div>
          {statewideEvents.length > 0 ? (
            <HorizontalScroll>
              {statewideEvents.map((event) => (
                <div key={event.id} className="w-80 shrink-0">
                  <EventCard event={event} />
                </div>
              ))}
            </HorizontalScroll>
          ) : (
            <EmptyState
              icon={<Calendar className="size-5" />}
              message={`No statewide events in ${userState} scheduled yet.`}
              title="No state events"
            />
          )}
        </div>

        {/* Section 3: Local Organizers */}
        <LocalOrganizersSection
          organizations={organizerPreview}
          userState={userState}
        />

        {/* Section 4: Nationwide & Global */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-foreground flex items-center gap-2 text-xl font-bold tracking-tight">
              <Trophy className="text-primary size-5" /> Nationwide & Global
            </h2>
            {globalEvents.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewAllSection("global")}
                className="text-primary hover:text-primary/80 rounded-md text-xs font-semibold"
              >
                View All
              </Button>
            )}
          </div>
          {globalEvents.length > 0 ? (
            <HorizontalScroll>
              {globalEvents.map((event) => (
                <div key={event.id} className="w-80 shrink-0">
                  <EventCard event={event} />
                </div>
              ))}
            </HorizontalScroll>
          ) : (
            <EmptyState
              icon={<Trophy className="size-5" />}
              message="No nationwide or global events scheduled yet."
              title="No global events"
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="animate-in fade-in mx-auto max-w-7xl space-y-8 px-4 py-4 duration-300">
      {!viewAllSection && (
        <>
          {/* Hero Section */}
          <div className="bg-primary relative overflow-hidden rounded-2xl p-6 text-white shadow-xl sm:p-8">
            <div className="relative z-10 max-w-2xl space-y-2">
              <div className="bg-secondary/20 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold text-[#bcdf21]">
                <span>Tournaments, Leagues & Clinics</span>
              </div>
              <h1 className="font-logo text-3xl tracking-wide lowercase sm:text-4xl">
                events
              </h1>
              <p className="text-sm leading-relaxed text-gray-200 sm:text-base">
                Join local tournaments, clinics, and leagues, or host your own.
              </p>
            </div>
          </div>

          {/* Consolidated Organizer Banner */}
          <section className="border-border/50 bg-card flex flex-col items-start justify-between gap-6 rounded-2xl border p-6 shadow-sm md:flex-row md:items-center">
            <div className="max-w-3xl space-y-2">
              <div className="flex items-center gap-2">
                <Trophy className="text-primary size-5" />
                <span className="bg-primary/15 text-primary rounded-md px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider uppercase">
                  {isOrganizer ? "Organizer Account Active" : "Organizer Hub"}
                </span>
              </div>
              <h2 className="text-xl font-bold tracking-tight md:text-2xl">
                {organizerTitle}
              </h2>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {organizerCopy}
              </p>
            </div>

            <div className="w-full shrink-0 md:w-auto">
              {isOrganizer ? (
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="flex w-full cursor-pointer items-center gap-1.5 rounded-lg px-5 py-5 text-xs font-semibold md:w-auto"
                >
                  <Plus className="size-4" /> Create New Event
                </Button>
              ) : (
                <Button
                  onClick={handleUpgrade}
                  disabled={updateProfileMutation.isPending}
                  className="flex w-full cursor-pointer items-center gap-1.5 rounded-lg px-5 py-5 text-xs font-semibold md:w-auto"
                >
                  {updateProfileMutation.isPending
                    ? "Upgrading..."
                    : "Start Organizer Upgrade"}
                  <ArrowRight className="size-4" />
                </Button>
              )}
            </div>
          </section>
        </>
      )}

      {/* Events dashboard/grid */}
      {renderEventsDashboard()}

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200">
          <div className="bg-card border-border animate-in slide-in-from-bottom-4 w-full max-w-lg overflow-hidden rounded-xl border shadow-xl duration-300">
            <div className="border-border flex items-center justify-between border-b p-5">
              <h2 className="text-base font-bold">Create New Event</h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <XCircle className="size-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent}>
              <div className="max-h-[65vh] space-y-4 overflow-y-auto p-5">
                <div className="space-y-1">
                  <label
                    htmlFor="eventNameInput"
                    className="text-muted-foreground text-xs font-semibold"
                  >
                    Event Name
                  </label>
                  <Input
                    id="eventNameInput"
                    placeholder="e.g. Winter Pickleball Extravaganza"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    required
                    className="rounded-md text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label
                      htmlFor="eventTypeSelect"
                      className="text-muted-foreground block text-xs font-semibold"
                    >
                      Event Type
                    </label>
                    <select
                      id="eventTypeSelect"
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                      className="bg-card border-border focus:ring-primary w-full rounded-md border p-2.5 text-xs focus:ring-1 focus:outline-none"
                    >
                      <option value="tournament">Tournament</option>
                      <option value="open_play">Open Play</option>
                      <option value="clinic">Clinic</option>
                      <option value="league">League</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="organizationSelect"
                      className="text-muted-foreground block text-xs font-semibold"
                    >
                      Host Organization
                    </label>
                    <select
                      id="organizationSelect"
                      value={selectedOrganizationId}
                      onChange={(e) =>
                        setSelectedOrganizationId(e.target.value)
                      }
                      className="bg-card border-border focus:ring-primary w-full rounded-md border p-2.5 text-xs focus:ring-1 focus:outline-none"
                    >
                      <option value="">My organizer profile</option>
                      {myOrganizations.map(({ organization }) => (
                        <option key={organization.id} value={organization.id}>
                          {organization.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <PlaceSearchPicker
                  id="eventLocationInput"
                  onPlaceChange={setSelectedPlace}
                  onQueryChange={setLocationQuery}
                  query={locationQuery}
                  selectedPlace={selectedPlace}
                />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label
                      htmlFor="startsAtInput"
                      className="text-muted-foreground text-xs font-semibold"
                    >
                      Starts At
                    </label>
                    <Input
                      id="startsAtInput"
                      type="datetime-local"
                      value={startsAt}
                      onChange={(e) => setStartsAt(e.target.value)}
                      required
                      className="rounded-md text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="capacityInput"
                      className="text-muted-foreground text-xs font-semibold"
                    >
                      Capacity (Players)
                    </label>
                    <Input
                      id="capacityInput"
                      type="number"
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      required
                      className="rounded-md text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="descriptionInput"
                    className="text-muted-foreground text-xs font-semibold"
                  >
                    Event Description
                  </label>
                  <textarea
                    id="descriptionInput"
                    rows={3}
                    aria-label="Event Description"
                    placeholder="Provide details about registration costs, schedules, scoring formats, and rules..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-card border-border focus:ring-primary text-foreground placeholder:text-muted-foreground w-full resize-none rounded-md border p-2.5 text-xs leading-normal focus:ring-1 focus:outline-none"
                  />
                </div>
              </div>

              <div className="border-border flex gap-2 border-t p-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 rounded-md text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createEventMutation.isPending}
                  className="flex-1 cursor-pointer rounded-md text-xs font-semibold"
                >
                  {createEventMutation.isPending
                    ? "Publishing..."
                    : "Publish Event"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
