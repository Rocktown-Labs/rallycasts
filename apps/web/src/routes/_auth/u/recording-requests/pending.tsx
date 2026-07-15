import { createFileRoute } from "@tanstack/react-router";

import { RecordingRequestsPage } from "./-recording-requests-page";

export const Route = createFileRoute("/_auth/u/recording-requests/pending")({
  component: () => <RecordingRequestsPage status="pending" />,
});
