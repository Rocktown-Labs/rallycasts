import { createFileRoute } from "@tanstack/react-router";

import { ManageOrganizationPage } from "./organizers.$slug.manage";

export const Route = createFileRoute("/_auth/events/organizers/$slug/manage")({
  component: ManageOrganizationRoute,
});

function ManageOrganizationRoute() {
  const { slug } = Route.useParams();

  return <ManageOrganizationPage slug={slug} />;
}
