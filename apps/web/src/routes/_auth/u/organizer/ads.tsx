import { Button } from "@rallycaststv/ui/components/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Megaphone, Plus } from "lucide-react";
import { useState } from "react";

import { AdsManager } from "@/components/ads/ads-manager";
import { EmptyState } from "@/components/rally/cards";
import { useMyEvents, useMyOrganizations, useMyVideos } from "@/lib/hooks";

export const Route = createFileRoute("/_auth/u/organizer/ads")({
  component: () => <OrganizerAdsPage />,
});

const OrganizerAdsPage = () => {
  const { data: orgsData, isLoading: orgsLoading } = useMyOrganizations();
  const { data: eventsData } = useMyEvents();
  const { data: videosData } = useMyVideos();

  const organizations = orgsData?.organizations ?? [];
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const activeOrgId =
    selectedOrgId ?? organizations[0]?.organization.id ?? null;
  const activeOrg = organizations.find(
    ({ organization }) => organization.id === activeOrgId
  );

  // Campaigns promote published events owned by the organization.
  const orgEvents = (eventsData?.events ?? []).filter(
    (event) =>
      event.organizationId === activeOrgId && event.status === "published"
  );
  // Sponsor clips must be the creator's own public, ready videos.
  const eligibleVideos = (videosData?.videos ?? [])
    .filter(
      (video) =>
        video.status === "ready" &&
        video.visibility === "public" &&
        video.muxPlaybackId &&
        (!video.durationSeconds || video.durationSeconds <= 30)
    )
    .map((video) => ({ id: video.id, title: video.title }));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <p className="text-primary text-xs font-semibold tracking-[0.22em] uppercase">
          Organizer Tools
        </p>
        <h1 className="mt-1 text-3xl font-bold">Ads</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Promote your events across RallyCasts — sponsored cards in feeds and
          search, plus skippable video prerolls. Set budgets, target by city and
          skill, and track delivery in one place.
        </p>
      </header>

      {orgsLoading ? (
        <div className="bg-muted h-64 animate-pulse rounded-xl" />
      ) : null}

      {!orgsLoading && organizations.length === 0 ? (
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

      {!orgsLoading && organizations.length > 0 ? (
        <div className="space-y-4">
          {organizations.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              {organizations.map(({ organization }) => (
                <Button
                  className="rounded-lg"
                  key={organization.id}
                  onClick={() => setSelectedOrgId(organization.id)}
                  size="sm"
                  type="button"
                  variant={
                    organization.id === activeOrgId ? "default" : "outline"
                  }
                >
                  {organization.name}
                </Button>
              ))}
            </div>
          ) : null}
          {activeOrg ? (
            <AdsManager
              events={orgEvents.map((event) => ({
                id: event.id,
                name: event.name,
                startsAt: event.startsAt,
                status: event.status,
              }))}
              organizationId={activeOrg.organization.id}
              organizationName={activeOrg.organization.name}
              videos={eligibleVideos}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
