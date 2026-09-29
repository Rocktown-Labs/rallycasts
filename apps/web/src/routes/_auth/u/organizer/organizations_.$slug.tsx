import { createFileRoute } from "@tanstack/react-router";

import { ManageOrganizationPage } from "./-manage-organization";

export const Route = createFileRoute("/_auth/u/organizer/organizations_/$slug")(
  {
    component: () => <ManageOrganizationRoute />,
  }
);

const ManageOrganizationRoute = () => {
  const { slug } = Route.useParams();

  return <ManageOrganizationPage slug={slug} />;
};
