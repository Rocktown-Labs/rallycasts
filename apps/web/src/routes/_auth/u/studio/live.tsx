import { createFileRoute } from "@tanstack/react-router";

import { StudioPage } from "./-studio-page";

export const Route = createFileRoute("/_auth/u/studio/live")({
  component: () => <StudioPage section="live" />,
});
