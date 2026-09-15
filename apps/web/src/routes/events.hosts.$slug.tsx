import { createFileRoute } from "@tanstack/react-router";

import { OrganizationProfilePage } from "./organizers.$slug";

export const Route = createFileRoute("/events/hosts/$slug")({
  component: HostProfileRoute,
});

function HostProfileRoute() {
  const { slug } = Route.useParams();

  return <OrganizationProfilePage slug={slug} />;
}
