import { createFileRoute } from "@tanstack/react-router";

import { RecordingRequestsPage } from "./-recording-requests-page";

export const Route = createFileRoute("/_auth/u/recording-requests/all")({
  component: () => <RecordingRequestsPage status="all" />,
});
