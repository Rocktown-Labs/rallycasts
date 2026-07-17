import { createFileRoute } from "@tanstack/react-router";

import { VideosPage } from "./-videos-page";

export const Route = createFileRoute("/_auth/u/videos/clips")({
  component: () => <VideosPage section="clips" />,
});
