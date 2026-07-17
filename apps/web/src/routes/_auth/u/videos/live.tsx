import { createFileRoute } from "@tanstack/react-router";

import { VideosPage } from "./-videos-page";

export const Route = createFileRoute("/_auth/u/videos/live")({
  component: () => <VideosPage section="live" />,
});
