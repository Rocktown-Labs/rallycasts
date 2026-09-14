import { createFileRoute } from "@tanstack/react-router";

import { OrganizersPage } from "./organizers";

export const Route = createFileRoute("/events/hosts")({
  component: OrganizersPage,
});
