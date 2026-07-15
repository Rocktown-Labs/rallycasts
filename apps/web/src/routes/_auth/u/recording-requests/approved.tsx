import { createFileRoute } from "@tanstack/react-router";

import { RecordingRequestsPage } from "./-recording-requests-page";

export const Route = createFileRoute("/_auth/u/recording-requests/approved")({
  component: () => <RecordingRequestsPage status="approved" />,
});
