import { Button } from "@rallycaststv/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@rallycaststv/ui/components/card";
import { Input } from "@rallycaststv/ui/components/input";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Braces,
  Building2,
  Calendar,
  Clock,
  ListChecks,
  Trophy,
  Users,
  X,
} from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { toast } from "sonner";

import { PlaceSearchPicker } from "@/components/places/place-search-picker";
import type { SelectedPlace } from "@/components/places/place-search-picker";
import { EmptyState } from "@/components/rally/cards";
import {
  useCreateEvent,
  useMyEvents,
  useMyOrganizations,
  useProfile,
  useUpdateEvent,
} from "@/lib/hooks";

export const Route = createFileRoute("/_auth/u/organizer/events")({
  component: OrganizerEventsPage,
});

const formatEventDate = (value: Date | string) =>
  new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

function OrganizerEventList({
  events,
  isLoading,
  onCreate,
  organizationNames,
}: {
  events: {
    capacity?: number | null;
    entryFeeCents?: number;
    eventType: string;
    id: string;
    name: string;
    organizationId?: null | string;
    startsAt: Date | string;
    status: string;
  }[];
  isLoading: boolean;
  onCreate: () => void;
  organizationNames: Map<string, string>;
}) {
  if (isLoading) {
    return <div className="h-80 animate-pulse rounded-lg bg-muted" />;
  }

  if (events.length === 0) {
    return (
      <EmptyState
        icon={<Calendar className="size-5" />}
        message="Your published and draft events will appear here as soon as you create one."
        title="No organizer events yet"
        action={
          <Button className="rounded-md" onClick={onCreate}>
            Create Event
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-4">
      {events.map((event) => (
        <Card key={event.id} className="rounded-lg">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-lg">{event.name}</CardTitle>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5 text-primary" />
                  {formatEventDate(event.startsAt)}
                </span>
                <span className="inline-flex items-center gap-1 capitalize">
                  <ListChecks className="size-3.5 text-primary" />
                  {event.eventType.replaceAll("_", " ")}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3.5 text-primary" />
                  {event.capacity ?? "Open"} capacity
                </span>
                <span className="inline-flex items-center gap-1">
                  <Building2 className="size-3.5 text-primary" />
                  {event.organizationId
                    ? (organizationNames.get(event.organizationId) ??
                      "Organization")
                    : "Organizer profile"}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold capitalize text-primary">
                {event.status}
              </span>
              <span className="w-fit rounded-full border px-3 py-1 text-xs font-semibold">
                {(event.entryFeeCents ?? 0) > 0
                  ? `$${((event.entryFeeCents ?? 0) / 100).toFixed(2)}`
                  : "Free"}
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Link to="/events/$id" params={{ id: event.id }}>
              <Button variant="outline" className="rounded-md">
                View Event
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link to="/events/$id/players" params={{ id: event.id }}>
              <Button variant="outline" className="rounded-md">
                <Users className="size-4" />
                Players
              </Button>
            </Link>
            <Link to="/events/$id/bracket" params={{ id: event.id }}>
              <Button variant="outline" className="rounded-md">
                <Braces className="size-4" />
                Bracket
              </Button>
            </Link>
            <Link to="/events/$id/matches" params={{ id: event.id }}>
              <Button variant="outline" className="rounded-md">
                <ListChecks className="size-4" />
                Matches
              </Button>
            </Link>
            <EventStatusActions eventId={event.id} status={event.status} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function OrganizerCreateEventPanel({
  isOpen,
  organizations,
  onClose,
}: {
  isOpen: boolean;
  organizations: { id: string; name: string }[];
  onClose: () => void;
}) {
  const navigate = useNavigate({ from: "/u/organizer/events" });
  const createEvent = useCreateEvent();
  const [eventName, setEventName] = useState("");
  const [eventType, setEventType] = useState<
    "clinic" | "league" | "open_play" | "tournament"
  >("tournament");
  const [bracketType, setBracketType] = useState<
    "round_robin" | "single_elimination"
  >("single_elimination");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [registrationDeadline, setRegistrationDeadline] = useState("");
  const [capacity, setCapacity] = useState("16");
  const [entryFee, setEntryFee] = useState("0");
  const [checkInMinutes, setCheckInMinutes] = useState("30");
  const [courts, setCourts] = useState("Court 1, Court 2, Court 3, Court 4");
  const [description, setDescription] = useState("");
  const [refundPolicy, setRefundPolicy] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(
    null
  );

  if (!isOpen) {
    return null;
  }

  const submitEvent = async (nextStatus: "draft" | "published") => {
    if (!eventName.trim()) {
      toast.error("Event name is required.");
      return;
    }
    if (!startsAt) {
      toast.error("Start time is required.");
      return;
    }
    if (nextStatus === "published" && !selectedPlace) {
      toast.error("Published events need a validated location.");
      return;
    }

    try {
      const result = await createEvent.mutateAsync({
        bracketType,
        capacity: Number.parseInt(capacity, 10) || undefined,
        checkInMinutes: Number.parseInt(checkInMinutes, 10) || 30,
        courtLabels: courts
          .split(",")
          .map((court) => court.trim())
          .filter(Boolean),
        description: description.trim() || undefined,
        endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
        entryFeeCents: Math.round(Number(entryFee || "0") * 100),
        eventType,
        googlePlaceId: selectedPlace?.placeId,
        name: eventName.trim(),
        organizationId: organizationId || undefined,
        refundPolicy: refundPolicy.trim() || undefined,
        registrationDeadline: registrationDeadline
          ? new Date(registrationDeadline).toISOString()
          : undefined,
        startsAt: new Date(startsAt).toISOString(),
        status: nextStatus,
      });
      toast.success(
        nextStatus === "published" ? "Event published." : "Event draft created."
      );
      await navigate({
        params: { id: result.event.id },
        to: "/events/$id",
      });
    } catch {
      toast.error("Unable to create event.");
    }
  };

  return (
    <section className="rounded-lg border border-primary/30 bg-card p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-primary">Create Event</p>
          <h2 className="mt-1 text-2xl font-extrabold">
            Build the organizer record once.
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Set the public info, registration rules, bracket type, court labels,
            and validated venue before you publish.
          </p>
        </div>
        <Button
          aria-label="Close create event form"
          onClick={onClose}
          size="icon"
          variant="ghost"
        >
          <X className="size-4" />
        </Button>
      </div>

      <form
        className="grid gap-4 md:grid-cols-2"
        onSubmit={(event: FormEvent) => event.preventDefault()}
      >
        <Input
          aria-label="Event name"
          onChange={(event) => setEventName(event.target.value)}
          placeholder="Event name"
          value={eventName}
        />
        <select
          aria-label="Event type"
          className="h-10 rounded-md border border-border bg-background px-3 text-sm"
          onChange={(event) =>
            setEventType(
              event.target.value as
                | "clinic"
                | "league"
                | "open_play"
                | "tournament"
            )
          }
          value={eventType}
        >
          <option value="tournament">Tournament</option>
          <option value="league">League</option>
          <option value="clinic">Clinic</option>
          <option value="open_play">Open play</option>
        </select>
        <Input
          aria-label="Start time"
          onChange={(event) => setStartsAt(event.target.value)}
          type="datetime-local"
          value={startsAt}
        />
        <Input
          aria-label="End time"
          onChange={(event) => setEndsAt(event.target.value)}
          type="datetime-local"
          value={endsAt}
        />
        <Input
          aria-label="Registration deadline"
          onChange={(event) => setRegistrationDeadline(event.target.value)}
          type="datetime-local"
          value={registrationDeadline}
        />
        <select
          aria-label="Host organization"
          className="h-10 rounded-md border border-border bg-background px-3 text-sm"
          onChange={(event) => setOrganizationId(event.target.value)}
          value={organizationId}
        >
          <option value="">Organizer profile</option>
          {organizations.map((organization) => (
            <option key={organization.id} value={organization.id}>
              {organization.name}
            </option>
          ))}
        </select>
        <div className="md:col-span-2">
          <PlaceSearchPicker
            id="organizerEventLocation"
            label="Validated event location"
            onPlaceChange={setSelectedPlace}
            onQueryChange={setLocationQuery}
            query={locationQuery}
            selectedPlace={selectedPlace}
          />
        </div>
        <Input
          aria-label="Capacity"
          min="2"
          onChange={(event) => setCapacity(event.target.value)}
          type="number"
          value={capacity}
        />
        <Input
          aria-label="Entry fee in dollars"
          min="0"
          onChange={(event) => setEntryFee(event.target.value)}
          step="0.01"
          type="number"
          value={entryFee}
        />
        <select
          aria-label="Bracket type"
          className="h-10 rounded-md border border-border bg-background px-3 text-sm"
          onChange={(event) =>
            setBracketType(
              event.target.value as "round_robin" | "single_elimination"
            )
          }
          value={bracketType}
        >
          <option value="single_elimination">Single elimination</option>
          <option value="round_robin">Round robin</option>
        </select>
        <Input
          aria-label="Check-in minutes"
          min="0"
          onChange={(event) => setCheckInMinutes(event.target.value)}
          type="number"
          value={checkInMinutes}
        />
        <Input
          aria-label="Court labels"
          className="md:col-span-2"
          onChange={(event) => setCourts(event.target.value)}
          placeholder="Court 1, Court 2, Championship Court"
          value={courts}
        />
        <textarea
          aria-label="Event description"
          className="min-h-28 rounded-md border border-border bg-background px-3 py-2 text-sm md:col-span-2"
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Registration costs, schedule, rules, divisions, and event notes"
          value={description}
        />
        <textarea
          aria-label="Refund policy"
          className="min-h-20 rounded-md border border-border bg-background px-3 py-2 text-sm md:col-span-2"
          onChange={(event) => setRefundPolicy(event.target.value)}
          placeholder="Refund policy"
          value={refundPolicy}
        />
        <div className="flex flex-wrap gap-2 md:col-span-2">
          <Button
            disabled={createEvent.isPending}
            onClick={() => {
              setStatus("draft");
              void submitEvent("draft");
            }}
            type="button"
            variant={status === "draft" ? "default" : "outline"}
          >
            Save Draft
          </Button>
          <Button
            disabled={createEvent.isPending}
            onClick={() => {
              setStatus("published");
              void submitEvent("published");
            }}
            type="button"
            variant={status === "published" ? "default" : "outline"}
          >
            Publish Event
          </Button>
        </div>
      </form>
    </section>
  );
}

function EventStatusActions({
  eventId,
  status,
}: {
  eventId: string;
  status: string;
}) {
  const updateEvent = useUpdateEvent(eventId);

  const updateStatus = async (
    nextStatus: "cancelled" | "draft" | "published"
  ) => {
    try {
      await updateEvent.mutateAsync({ status: nextStatus });
      toast.success(`Event marked ${nextStatus.replaceAll("_", " ")}`);
    } catch {
      toast.error("Unable to update event status.");
    }
  };

  if (status === "cancelled" || status === "completed") {
    return null;
  }

  return (
    <>
      {status === "draft" ? (
        <Button
          className="rounded-md"
          disabled={updateEvent.isPending}
          onClick={() => updateStatus("published")}
          variant="outline"
        >
          Publish
        </Button>
      ) : null}
      <Button
        className="rounded-md"
        disabled={updateEvent.isPending}
        onClick={() => updateStatus("cancelled")}
        variant="destructive"
      >
        Cancel
      </Button>
    </>
  );
}

function OrganizerEventsPage() {
  const { data: profileData } = useProfile();
  const { data, isLoading } = useMyEvents();
  const { data: organizationsData } = useMyOrganizations();
  const [isCreating, setIsCreating] = useState(false);
  const profile = profileData?.profile;
  const events = data?.events ?? [];
  const organizations = (organizationsData?.organizations ?? []).map(
    ({ organization }) => ({
      id: organization.id,
      name: organization.name,
    })
  );
  const organizationNames = new Map(
    (organizationsData?.organizations ?? []).map(({ organization }) => [
      organization.id,
      organization.name,
    ])
  );

  if (!profile?.isOrganizer) {
    return (
      <div className="mx-auto max-w-4xl">
        <EmptyState
          icon={<Trophy className="size-5" />}
          message="Enable organizer tools in settings before creating and managing tournaments."
          title="Organizer setup required"
          action={
            <Link to="/u/settings">
              <Button className="rounded-md">Open Settings</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Organizer Events</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
            Manage tournaments, clinics, leagues, and open play.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Review the events you created, open their player lists, generate
            brackets, and monitor match flow from one place.
          </p>
        </div>
        <Button
          className="w-full rounded-md md:w-auto"
          onClick={() => setIsCreating(true)}
        >
          <Calendar className="size-4" />
          Create Event
        </Button>
      </section>

      <OrganizerCreateEventPanel
        isOpen={isCreating}
        onClose={() => setIsCreating(false)}
        organizations={organizations}
      />

      <OrganizerEventList
        events={events}
        isLoading={isLoading}
        onCreate={() => setIsCreating(true)}
        organizationNames={organizationNames}
      />
    </div>
  );
}
