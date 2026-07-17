import { createFileRoute } from "@tanstack/react-router";

import { HistoryPage } from "./history/-history-page";

export const Route = createFileRoute("/_auth/u/history")({
  component: () => <HistoryPage section="videos" />,
});
