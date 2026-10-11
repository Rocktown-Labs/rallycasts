import { Button } from "@rallycaststv/ui/components/button";
import { Card, CardContent } from "@rallycaststv/ui/components/card";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Megaphone, Plus } from "lucide-react";

import { ManageAdsPanel } from "@/components/ads/manage-ads-panel";
import { EmptyState } from "@/components/rally/cards";
import { useMyOrganizations } from "@/lib/hooks";

export const Route = createFileRoute("/_auth/u/organizer/ads")({
  component: () => <OrganizerAdsPage />,
});

const OrganizerAdsPage = () => {
  const { data, isLoading } = useMyOrganizations();
  const organizations = data?.organizations ?? [];
  const [primary] = organizations;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <p className="text-primary text-xs font-semibold tracking-[0.22em] uppercase">
          Organizer Tools
        </p>
        <h1 className="mt-1 text-3xl font-bold">Ads</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Run campaigns across RallyCasts to promote your events. Preview
          creatives, track delivery, and top up budgets here.
        </p>
      </header>

      {isLoading ? (
        <div className="bg-muted h-64 animate-pulse rounded-xl" />
      ) : null}

      {!isLoading && organizations.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="size-5" />}
          message="Create an organization first; ads run under an organization's advertiser account."
          title="No organization yet"
          action={
            <Link to="/u/organizer/organizations">
              <Button className="rounded-lg">
                <Plus className="size-4" />
                Create Organization
              </Button>
            </Link>
          }
        />
      ) : null}

      {!isLoading && primary
        ? organizations.map(({ organization }) => (
            <Card className="rounded-lg" key={organization.id}>
              <CardContent>
                <h2 className="mb-4 flex items-center gap-2 font-bold">
                  <Megaphone className="text-primary size-4" />
                  {organization.name}
                </h2>
                <ManageAdsPanel
                  events={[]}
                  organizationId={organization.id}
                  videos={[]}
                />
              </CardContent>
            </Card>
          ))
        : null}
    </div>
  );
};
