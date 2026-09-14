import { createFileRoute } from "@tanstack/react-router";

import { ManageOrganizationPage } from "./organizers.$slug.manage";

export const Route = createFileRoute("/_auth/events/hosts/$slug/manage")({
  component: () => <ManageHostRoute />,
});

const ManageHostRoute = () => {
  const { slug } = Route.useParams();

  return <ManageOrganizationPage slug={slug} />;
};
