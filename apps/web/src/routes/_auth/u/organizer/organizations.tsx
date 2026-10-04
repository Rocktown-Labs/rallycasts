import { Button } from "@rallycaststv/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@rallycaststv/ui/components/card";
import { Input } from "@rallycaststv/ui/components/input";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  MapPin,
  Plus,
  Settings,
  Users,
} from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/rally/cards";
import { useMyOrganizations, useProfile } from "@/lib/hooks";

export const Route = createFileRoute("/_auth/u/organizer/organizations")({
  component: () => <OrganizerOrganizationsPage />,
});

const OrganizerOrganizationsPage = () => {
  const { data: profileData } = useProfile();
  const { data, isLoading } = useMyOrganizations();
  const [query, setQuery] = useState("");
  const profile = profileData?.profile;
  const organizations = (data?.organizations ?? []).filter(({ organization }) =>
    `${organization.name} ${organization.city ?? ""} ${organization.state ?? ""}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  if (!profile?.isOrganizer) {
    return (
      <div className="mx-auto max-w-4xl">
        <EmptyState
          icon={<Building2 className="size-5" />}
          message="Enable organizer tools before creating organization profiles, inviting teammates, and publishing tournaments."
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
      <section className="border-border bg-card flex flex-col gap-4 rounded-lg border p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-primary text-sm font-semibold">
            Organization Management
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
            Manage the host identities behind your tournaments.
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
            Keep organization names, locations, members, payout setup, and
            tournament links together without mixing them into a player profile.
          </p>
        </div>
        <Link to="/events/hosts/new">
          <Button className="w-full rounded-lg md:w-auto">
            <Plus className="size-4" />
            New Organization
          </Button>
        </Link>
      </section>

      <Input
        aria-label="Search your organizations"
        className="max-w-xl rounded-lg"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by name, city, or state"
        value={query}
      />

      {isLoading ? (
        <div className="bg-muted h-80 animate-pulse rounded-lg" />
      ) : null}

      {organizations.length === 0 && !isLoading ? (
        <EmptyState
          icon={<Building2 className="size-5" />}
          message="Create an organization to host tournaments, invite staff, and publish a public organizer page."
          title="No organizations yet"
          action={
            <Link to="/events/hosts/new">
              <Button className="rounded-lg">Create Organization</Button>
            </Link>
          }
        />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {organizations.map(({ organization, role }) => (
          <Card className="rounded-lg" key={organization.id}>
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex min-w-0 gap-4">
                <div className="bg-primary/10 text-primary grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg">
                  {organization.logoUrl ? (
                    <img
                      alt={`${organization.name} logo`}
                      className="size-full object-cover"
                      src={organization.logoUrl}
                    />
                  ) : (
                    <Building2 className="size-6" />
                  )}
                </div>
                <div className="min-w-0">
                  <CardTitle className="flex items-center gap-2 truncate text-lg">
                    {organization.name}
                    {organization.isOfficial ? (
                      <BadgeCheck className="text-primary size-4 shrink-0" />
                    ) : null}
                  </CardTitle>
                  <p className="text-muted-foreground mt-2 flex items-center gap-1 text-xs">
                    <MapPin className="size-3.5" />
                    {[organization.city, organization.state]
                      .filter(Boolean)
                      .join(", ") || "Location not set"}
                  </p>
                </div>
              </div>
              <span className="bg-primary/10 text-primary w-fit rounded-full px-3 py-1 text-xs font-semibold capitalize">
                {role}
              </span>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-muted-foreground line-clamp-3 text-sm">
                {organization.bio ??
                  "Add a bio so players know what this organization hosts."}
              </p>
              <div className="grid gap-3 text-sm sm:grid-cols-3">
                <div className="rounded-md border p-3">
                  <p className="text-muted-foreground text-xs">Public slug</p>
                  <p className="mt-1 truncate font-semibold">
                    {organization.slug}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-muted-foreground text-xs">Payouts</p>
                  <p className="mt-1 truncate font-semibold capitalize">
                    {organization.stripeOnboardingStatus.replaceAll("_", " ")}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-muted-foreground text-xs">Updated</p>
                  <p className="mt-1 truncate font-semibold">
                    {new Date(organization.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  params={{ slug: organization.slug }}
                  to="/u/organizer/organizations/$slug"
                >
                  <Button className="rounded-lg">
                    <Settings className="size-4" />
                    Manage
                  </Button>
                </Link>
                <Link
                  params={{ slug: organization.slug }}
                  to="/u/organizer/organizations/$slug/team"
                >
                  <Button className="rounded-lg" variant="outline">
                    <Users className="size-4" />
                    Team
                  </Button>
                </Link>
                <Link
                  params={{ slug: organization.slug }}
                  to="/events/hosts/$slug"
                >
                  <Button className="rounded-lg" variant="outline">
                    Public Page
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
