import { createFileRoute } from "@tanstack/react-router";

import { CreateOrganizationPage } from "./organizers.new";

export const Route = createFileRoute("/_auth/events/hosts/new")({
  component: CreateOrganizationPage,
});
