import { createFileRoute } from "@tanstack/react-router";

import { HistoryPage } from "./-history-page";

export const Route = createFileRoute("/_auth/u/history/profiles")({
  component: () => <HistoryPage section="profiles" />,
});
