import { createFileRoute } from "@tanstack/react-router";

import { StudioPage } from "./-studio-page";

export const Route = createFileRoute("/_auth/u/studio/")({
  component: () => <StudioPage section="videos" />,
});
