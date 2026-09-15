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
  Sparkles,
  Calendar,
  MapPin,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { PlaceSearchPicker } from "@/components/places/place-search-picker";
import type { SelectedPlace } from "@/components/places/place-search-picker";
import { EmptyState, EventCard } from "@/components/rally/cards";
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
        "-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted hover:scrollbar-thumb-muted-foreground/30",
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
  organizations: OrganizationSummary[],
  userCity: string | undefined,
  userState: string
) => {
  const localOrganizations = organizations.filter((organization) => {
    const sameState = organization.state === userState;
    const sameCity =
      Boolean(userCity) && organization.city?.toLowerCase() === userCity;
    return sameCity || sameState;
  });

  return (
    localOrganizations.length > 0 ? localOrganizations : organizations
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
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
            <Building2 className="size-5 text-primary" /> Local Hosts
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Clubs, leagues, and hosts creating events near {userState}.
          </p>
        </div>
        <Link
          to="/events/hosts"
          className="rounded-md px-3 py-2 text-xs font-semibold text-primary hover:bg-muted hover:text-primary/80"
        >
          View All
        </Link>
      </div>
      {organizations.length > 0 ? (
        <HorizontalScroll>
          {organizations.map((organization) => (
            <Link
              className="group w-72 shrink-0 rounded-lg border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40"
              key={organization.id}
              params={{ slug: organization.slug }}
              to="/events/hosts/$slug"
            >
              <div className="flex items-start gap-3">
                <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-primary/10 text-primary">
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
                  <h3 className="flex items-center gap-1.5 truncate text-sm font-bold group-hover:text-primary">
                    {organization.name}
                    {organization.isOfficial ? (
                      <BadgeCheck className="size-4 shrink-0 text-[#bcdf21]" />
                    ) : null}
                  </h3>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3" />
                    {[organization.city, organization.state]
                      .filter(Boolean)
                      .join(", ") || "Location coming soon"}
                  </p>
                </div>
              </div>
              <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
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
  const { data: eventsData, isLoading: eventsLoading } = useEvents();
  const { data: profileData } = useProfile();
  const updateProfileMutation = useUpdateProfile();
  const createEventMutation = useCreateEvent();
  const { data: organizationsData } = useMyOrganizations();
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
        capacity: Number.parseInt(capacity, 10) || 64,
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
        <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 animate-in fade-in duration-300">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="h-48 animate-pulse rounded-2xl bg-muted/40 border border-border/50"
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
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {section.title} ({section.list.length})
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewAllSection(null)}
              className="rounded-md h-8 text-xs"
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
      <div className="space-y-10 animate-in fade-in duration-500">
        {/* Section 1: Near You */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <MapPin className="size-5 text-primary" /> Near You (Within 1
              Mile)
            </h2>
            {nearYouEvents.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewAllSection("near-you")}
                className="text-primary hover:text-primary/80 font-semibold text-xs rounded-md"
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
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Calendar className="size-5 text-primary" /> Statewide (
              {userState})
            </h2>
            {statewideEvents.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewAllSection("state")}
                className="text-primary hover:text-primary/80 font-semibold text-xs rounded-md"
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
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Trophy className="size-5 text-primary" /> Nationwide & Global
            </h2>
            {globalEvents.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewAllSection("global")}
                className="text-primary hover:text-primary/80 font-semibold text-xs rounded-md"
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
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-4 animate-in fade-in duration-300">
      {!viewAllSection && (
        <>
          {/* Hero Section */}
          <div className="relative overflow-hidden rounded-2xl bg-primary p-6 text-white shadow-xl sm:p-8">
            <div className="relative z-10 max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-md bg-secondary/20 px-2.5 py-1 text-xs font-semibold text-[#bcdf21]">
                <Sparkles className="size-3" />
                <span>Tournaments, Leagues & Clinics</span>
              </div>
              <h1 className="text-3xl font-logo sm:text-4xl tracking-wide lowercase">
                events
              </h1>
              <p className="text-sm text-gray-200 sm:text-base leading-relaxed">
                Join local tournaments, clinics, and leagues, or host your own.
              </p>
            </div>
          </div>

          {/* Consolidated Organizer Banner */}
          <section className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-3xl">
              <div className="flex items-center gap-2">
                <Trophy className="size-5 text-primary" />
                <span className="text-[10px] bg-primary/15 text-primary font-extrabold px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                  {isOrganizer ? "Organizer Account Active" : "Organizer Hub"}
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight">
                {organizerTitle}
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {organizerCopy}
              </p>
            </div>

            <div className="shrink-0 w-full md:w-auto">
              {isOrganizer ? (
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="w-full md:w-auto rounded-md text-xs font-semibold py-5 px-5 flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="size-4" /> Create New Event
                </Button>
              ) : (
                <Button
                  onClick={handleUpgrade}
                  disabled={updateProfileMutation.isPending}
                  className="w-full md:w-auto rounded-md text-xs font-semibold py-5 px-5 flex items-center gap-1.5 cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-5 border-b border-border flex justify-between items-center">
              <h2 className="text-base font-bold">Create New Event</h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <XCircle className="size-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent}>
              <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
                <div className="space-y-1">
                  <label
                    htmlFor="eventNameInput"
                    className="text-xs font-semibold text-muted-foreground"
                  >
                    Event Name
                  </label>
                  <Input
                    id="eventNameInput"
                    placeholder="e.g. Winter Pickleball Extravaganza"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    required
                    className="text-xs rounded-md"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label
                      htmlFor="eventTypeSelect"
                      className="text-xs font-semibold text-muted-foreground block"
                    >
                      Event Type
                    </label>
                    <select
                      id="eventTypeSelect"
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                      className="w-full p-2.5 bg-card border border-border rounded-md text-xs focus:ring-1 focus:ring-primary focus:outline-none"
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
                      className="text-xs font-semibold text-muted-foreground block"
                    >
                      Host Organization
                    </label>
                    <select
                      id="organizationSelect"
                      value={selectedOrganizationId}
                      onChange={(e) =>
                        setSelectedOrganizationId(e.target.value)
                      }
                      className="w-full p-2.5 bg-card border border-border rounded-md text-xs focus:ring-1 focus:ring-primary focus:outline-none"
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
                      className="text-xs font-semibold text-muted-foreground"
                    >
                      Starts At
                    </label>
                    <Input
                      id="startsAtInput"
                      type="datetime-local"
                      value={startsAt}
                      onChange={(e) => setStartsAt(e.target.value)}
                      required
                      className="text-xs rounded-md"
                    />
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="capacityInput"
                      className="text-xs font-semibold text-muted-foreground"
                    >
                      Capacity (Players)
                    </label>
                    <Input
                      id="capacityInput"
                      type="number"
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      required
                      className="text-xs rounded-md"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="descriptionInput"
                    className="text-xs font-semibold text-muted-foreground"
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
                    className="w-full p-2.5 bg-card border border-border rounded-md text-xs focus:ring-1 focus:ring-primary focus:outline-none resize-none leading-normal text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <div className="p-5 border-t border-border flex gap-2">
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
                  className="flex-1 rounded-md text-xs font-semibold cursor-pointer"
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
