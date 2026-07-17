import { createFileRoute } from "@tanstack/react-router";

import { RecordingRequestsPage } from "../recording-requests/-recording-requests-page";

export const Route = createFileRoute("/_auth/u/casts/pending")({
  component: () => <RecordingRequestsPage status="pending" />,
});
