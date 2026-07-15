import { createFileRoute } from "@tanstack/react-router";

import { HistoryPage } from "./-history-page";

export const Route = createFileRoute("/_auth/u/history/videos")({
  component: () => <HistoryPage section="videos" />,
});
