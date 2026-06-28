import { createFileRoute } from "@tanstack/react-router";

import { OrganizationProfilePage } from "./organizers.$slug";

export const Route = createFileRoute("/events/organizers/$slug")({
  component: OrganizationProfileRoute,
});

function OrganizationProfileRoute() {
  const { slug } = Route.useParams();

  return <OrganizationProfilePage slug={slug} />;
}
