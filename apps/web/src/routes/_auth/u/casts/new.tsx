import { createFileRoute } from "@tanstack/react-router";

import { CastingRequestsPage } from "./-casts-page";

export const Route = createFileRoute("/_auth/u/casts/new")({
  component: () => <CastingRequestsPage status="new" />,
});
