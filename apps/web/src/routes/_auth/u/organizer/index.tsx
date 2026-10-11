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
  CreditCard,
  FileVideo,
  MapPin,
  Plus,
  Trophy,
  UserPlus,
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
      <section className="border-border bg-card rounded-lg border p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-primary text-sm font-semibold">Host tools</p>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Turn on host tools
            </h1>
            <p className="text-muted-foreground max-w-2xl text-sm">
              Host mode adds event publishing, bracket management, player lists,
              and tournament operations to your RallyCasts dashboard.
            </p>
          </div>
          <Link to="/u/settings">
            <Button className="w-full rounded-lg md:w-auto">
              Set Up Host Profile
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
    return <div className="bg-muted h-72 animate-pulse rounded-lg" />;
  }

  if (events.length === 0) {
    return (
      <EmptyState
        icon={<Calendar className="size-5" />}
        message="Publish your first tournament, clinic, league, or open play event from an organization to start collecting player and bracket data."
        title="No hosted events yet"
        action={
          <Link to="/events/hosts/new">
            <Button className="rounded-lg">Create Organization</Button>
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

const quickActionTiles = [
  {
    chip: "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground",
    icon: Plus,
    label: "New organization",
    resolveTo: () => ({ to: "/events/hosts/new" as const }),
  },
  {
    chip: "bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white",
    icon: Calendar,
    label: "Publish tournament",
    resolveTo: (firstOrgSlug?: string) =>
      firstOrgSlug
        ? {
            params: { slug: firstOrgSlug },
            to: "/u/organizer/organizations/$slug" as const,
          }
        : { to: "/events/hosts/new" as const },
  },
  {
    chip: "bg-indigo-500/10 text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white",
    icon: UserPlus,
    label: "Invite teammate",
    resolveTo: (firstOrgSlug?: string) =>
      firstOrgSlug
        ? {
            params: { slug: firstOrgSlug },
            to: "/u/organizer/organizations/$slug/team" as const,
          }
        : { to: "/events/hosts/new" as const },
  },
  {
    chip: "bg-amber-500/10 text-amber-500 group-hover:bg-amber-500 group-hover:text-white",
    icon: CreditCard,
    label: "Set up payouts",
    resolveTo: (firstOrgSlug?: string) =>
      firstOrgSlug
        ? {
            params: { slug: firstOrgSlug },
            to: "/u/organizer/organizations/$slug" as const,
          }
        : { to: "/events/hosts/new" as const },
  },
  {
    chip: "bg-violet-500/10 text-violet-500 group-hover:bg-violet-500 group-hover:text-white",
    icon: FileVideo,
    label: "Post update",
    resolveTo: (firstOrgSlug?: string) =>
      firstOrgSlug
        ? {
            params: { slug: firstOrgSlug },
            to: "/u/organizer/organizations/$slug" as const,
          }
        : { to: "/events/hosts/new" as const },
  },
] as const;

function QuickActions({ firstOrgSlug }: { firstOrgSlug?: string }) {
  return (
    <section
      aria-label="Quick actions"
      className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0"
    >
      {quickActionTiles.map(({ chip, icon: Icon, label, resolveTo }) => (
        <Link
          className="group border-border/80 bg-card/60 hover:border-primary/50 hover:bg-card focus-visible:ring-ring/50 flex min-w-32 cursor-pointer flex-col items-center gap-2.5 rounded-xl border p-4 transition-[background-color,border-color,transform] duration-150 focus-visible:ring-2 focus-visible:outline-none active:scale-[0.98]"
          key={label}
          {...resolveTo(firstOrgSlug)}
        >
          <span
            className={`grid size-10 place-items-center rounded-lg transition-colors ${chip}`}
          >
            <Icon className="size-5" />
          </span>
          <span className="text-foreground text-xs font-semibold">{label}</span>
        </Link>
      ))}
    </section>
  );
}

function OrganizerDashboardPage() {
  const { data: profileData } = useProfile();
  const { data: eventsData, isLoading } = useMyEvents();
  const { data: organizationsData } = useMyOrganizations();
  const profile = profileData?.profile;
  const events = eventsData?.events ?? [];
  const organizations = organizationsData?.organizations ?? [];
  const firstOrgSlug =
    organizations.length > 0
      ? (organizations[0].organization.slug as string | undefined)
      : undefined;
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
        <div className="border-border bg-card rounded-lg border p-6">
          <p className="text-primary text-sm font-semibold">Host tools</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">
            Run your pickleball operations from here.
          </h1>
          <p className="text-muted-foreground mt-3 max-w-2xl text-sm">
            Publish tournaments, manage registrations and brackets, keep your
            organizations and team together, and track the player data
            RallyCasts collects for your events.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {firstOrgSlug ? (
              <Link
                params={{ slug: firstOrgSlug }}
                to="/u/organizer/organizations/$slug"
              >
                <Button className="rounded-lg">
                  <Calendar className="size-4" />
                  Publish tournament
                </Button>
              </Link>
            ) : (
              <Link to="/events/hosts/new">
                <Button className="rounded-lg">
                  <Plus className="size-4" />
                  Create organization
                </Button>
              </Link>
            )}
            <Link to="/u/organizer/organizations">
              <Button className="rounded-lg" variant="outline">
                <Building2 className="size-4" />
                Organizations
              </Button>
            </Link>
          </div>
        </div>
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="text-lg">Host profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="border-border flex items-center justify-between gap-4 border-b pb-3">
              <span className="text-muted-foreground">Home court</span>
              <span className="max-w-48 truncate font-medium">
                {(profile as { homeCourtName?: string | null }).homeCourtName ??
                  "Not set"}
              </span>
            </div>
            <div className="border-border flex items-center justify-between gap-4 border-b pb-3">
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

      <QuickActions firstOrgSlug={firstOrgSlug} />

      {(profile.accountTier ?? "free") === "premium" ? null : (
        <section
          className="bg-primary text-primary-foreground flex flex-wrap items-center justify-between gap-3 rounded-xl px-5 py-4"
          aria-label="RallyCasts Pro upsell"
        >
          <div>
            <p className="text-sm font-bold">Do more with RallyCasts Pro</p>
            <p className="text-xs opacity-85">
              Ad-free everywhere, 5% off casting requests, priority tournament
              coverage, and the AI highlight reel.
            </p>
          </div>
          <Link
            className="bg-background text-foreground hover:bg-background/90 inline-flex h-9 items-center rounded-lg px-4 text-sm font-semibold transition-colors"
            to="/u/me"
          >
            Upgrade to Pro
          </Link>
        </section>
      )}

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
            <Link to="/u/organizer/organizations">
              <Button className="rounded-lg" variant="ghost">
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
            <Link to="/u/organizer/organizations">
              <Button
                className="w-full justify-between rounded-lg"
                variant="outline"
              >
                <span className="inline-flex items-center gap-2">
                  <Building2 className="text-primary size-4" />
                  Manage organizations
                </span>
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            {firstOrgSlug ? (
              <Link
                params={{ slug: firstOrgSlug }}
                to="/u/organizer/organizations/$slug/team"
              >
                <Button
                  className="w-full justify-between rounded-lg"
                  variant="outline"
                >
                  <span className="inline-flex items-center gap-2">
                    <UserPlus className="text-primary size-4" />
                    Invite a teammate
                  </span>
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
            ) : null}
            <Link to="/events/hosts/new">
              <Button
                className="w-full justify-between rounded-lg"
                variant="outline"
              >
                <span className="inline-flex items-center gap-2">
                  <Plus className="text-primary size-4" />
                  New organization
                </span>
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link to="/trending">
              <Button
                className="w-full justify-between rounded-lg"
                variant="outline"
              >
                <span className="inline-flex items-center gap-2">
                  <MapPin className="text-primary size-4" />
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
