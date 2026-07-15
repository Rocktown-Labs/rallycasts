import { createFileRoute } from "@tanstack/react-router";

import { HistoryPage } from "./-history-page";

export const Route = createFileRoute("/_auth/u/history/events")({
  component: () => <HistoryPage section="events" />,
});
