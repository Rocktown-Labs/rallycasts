import { createFileRoute } from "@tanstack/react-router";

import { StudioPage } from "./-studio-page";

export const Route = createFileRoute("/_auth/u/studio/all")({
  component: () => <StudioPage section="all" />,
});
