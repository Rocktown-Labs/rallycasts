import { Button } from "@rallycaststv/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@rallycaststv/ui/components/card";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Braces,
  Building2,
  Calendar,
  Clock,
  ListChecks,
  Trophy,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/rally/cards";
import {
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
          <Link to="/events">
            <Button className="rounded-md">Create Event</Button>
          </Link>
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
  const profile = profileData?.profile;
  const events = data?.events ?? [];
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
        <Link to="/events">
          <Button className="w-full rounded-md md:w-auto">
            <Calendar className="size-4" />
            Create Event
          </Button>
        </Link>
      </section>

      <OrganizerEventList
        events={events}
        isLoading={isLoading}
        organizationNames={organizationNames}
      />
    </div>
  );
}
