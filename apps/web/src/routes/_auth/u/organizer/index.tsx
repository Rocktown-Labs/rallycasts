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
  Building2,
  Calendar,
  ClipboardList,
  MapPin,
  Trophy,
  Users,
} from "lucide-react";

import { EmptyState, EventCard, StatCard } from "@/components/rally/cards";
import { useMyEvents, useMyOrganizations, useProfile } from "@/lib/hooks";

export const Route = createFileRoute("/_auth/u/organizer/")({
  component: OrganizerDashboardPage,
});

function OrganizerSetupPrompt() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="rounded-lg border border-border bg-card p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-primary">
              Organizer Workspace
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Turn on organizer tools
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Organizer mode adds event publishing, bracket management, player
              lists, and tournament operations to your RallyCasts dashboard.
            </p>
          </div>
          <Link to="/u/settings">
            <Button className="w-full rounded-md md:w-auto">
              Set Up Organizer Profile
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

function OrganizerEventPreview({
  events,
  isLoading,
}: {
  events: Parameters<typeof EventCard>[0]["event"][];
  isLoading: boolean;
}) {
  if (isLoading) {
    return <div className="h-72 animate-pulse rounded-lg bg-muted" />;
  }

  if (events.length === 0) {
    return (
      <EmptyState
        icon={<Calendar className="size-5" />}
        message="Create your first tournament, clinic, league, or open play event to start collecting player and bracket data."
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
    <div className="grid gap-4 md:grid-cols-2">
      {events.slice(0, 4).map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}

function OrganizerDashboardPage() {
  const { data: profileData } = useProfile();
  const { data: eventsData, isLoading } = useMyEvents();
  const { data: organizationsData } = useMyOrganizations();
  const profile = profileData?.profile;
  const events = eventsData?.events ?? [];
  const organizations = organizationsData?.organizations ?? [];
  const publishedEvents = events.filter(
    (event) => event.status === "published"
  );
  const draftEvents = events.filter((event) => event.status === "draft");
  const activeCapacity = events.reduce(
    (total, event) => total + (event.capacity ?? 0),
    0
  );

  if (!profile?.isOrganizer) {
    return <OrganizerSetupPrompt />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-sm font-semibold text-primary">
            Organizer Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">
            Run your pickleball operations from here.
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Create tournaments, manage registrations, prep brackets, and keep
            tabs on the venues and player data RallyCasts is collecting for your
            events.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/events">
              <Button className="rounded-md">
                <Calendar className="size-4" />
                Create Event
              </Button>
            </Link>
            <Link to="/u/organizer/events">
              <Button variant="outline" className="rounded-md">
                <ClipboardList className="size-4" />
                Manage Events
              </Button>
            </Link>
            <Link to="/u/organizer/organizations">
              <Button variant="outline" className="rounded-md">
                <Building2 className="size-4" />
                Organizations
              </Button>
            </Link>
          </div>
        </div>
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="text-lg">Organizer Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
              <span className="text-muted-foreground">Home court</span>
              <span className="max-w-48 truncate font-medium">
                {(profile as { homeCourtName?: string | null }).homeCourtName ??
                  "Not set"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
              <span className="text-muted-foreground">Location</span>
              <span className="font-medium">
                {[
                  (profile as { homeCity?: string | null }).homeCity,
                  (profile as { homeState?: string | null }).homeState,
                ]
                  .filter(Boolean)
                  .join(", ") || "Not set"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Plan</span>
              <span className="font-medium capitalize">
                {profile.accountTier ?? "free"}
              </span>
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          icon={<Trophy className="size-5" />}
          label="Published Events"
          value={`${publishedEvents.length}`}
          trend={`${draftEvents.length} drafts`}
        />
        <StatCard
          icon={<Users className="size-5" />}
          label="Player Capacity"
          value={`${activeCapacity}`}
          trend="Across your events"
        />
        <StatCard
          icon={<Building2 className="size-5" />}
          label="Organizations"
          value={`${organizations.length}`}
          trend="Host profiles you manage"
        />
      </div>

      <section className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Your Events</h2>
            <Link to="/u/organizer/events">
              <Button variant="ghost" className="rounded-md">
                View All
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
          <OrganizerEventPreview events={events} isLoading={isLoading} />
        </div>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="text-lg">Operations</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Link to="/u/organizer/events">
              <Button variant="outline" className="w-full justify-between">
                <span className="inline-flex items-center gap-2">
                  <ClipboardList className="size-4 text-primary" />
                  Manage tournaments
                </span>
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link to="/u/organizer/organizations">
              <Button variant="outline" className="w-full justify-between">
                <span className="inline-flex items-center gap-2">
                  <Building2 className="size-4 text-primary" />
                  Manage organizations
                </span>
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link to="/events">
              <Button variant="outline" className="w-full justify-between">
                <span className="inline-flex items-center gap-2">
                  <Calendar className="size-4 text-primary" />
                  Publish an event
                </span>
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link to="/trending">
              <Button variant="outline" className="w-full justify-between">
                <span className="inline-flex items-center gap-2">
                  <MapPin className="size-4 text-primary" />
                  Review nearby parks
                </span>
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
