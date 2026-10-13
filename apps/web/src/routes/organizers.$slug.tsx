import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { OrganizationGroupView } from "@/components/organizations/organization-group-view";
import { apiClient } from "@/lib/api-client";
import { readApiJson } from "@/lib/hooks/api";

export const Route = createFileRoute("/organizers/$slug")({
  beforeLoad: ({ params }) => {
    throw redirect({
      params: { slug: params.slug },
      to: "/events/hosts/$slug",
    });
  },
});

export function OrganizationProfilePage({ slug }: { slug: string }) {
  const { data, isLoading } = useQuery({
    queryFn: () =>
      readApiJson(apiClient.api.v1.hosts[":slug"].$get({ param: { slug } })),
    queryKey: ["organization", slug],
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        <div className="bg-muted h-64 w-full animate-pulse rounded-2xl" />
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="bg-muted h-96 animate-pulse rounded-2xl lg:col-span-8" />
          <div className="bg-muted h-96 animate-pulse rounded-2xl lg:col-span-4" />
        </div>
      </div>
    );
  }

  if (!data?.organization) {
    return (
      <div className="mx-auto max-w-md p-16 text-center">
        <h2 className="text-xl font-bold">Organization not found</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          The requested club or organization could not be found.
        </p>
      </div>
    );
  }

  return <OrganizationGroupView data={data} slug={slug} />;
}

export const HostProfilePage = OrganizationProfilePage;
