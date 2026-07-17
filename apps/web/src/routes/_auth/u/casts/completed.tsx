import { createFileRoute } from "@tanstack/react-router";

import { RecordingRequestsPage } from "../recording-requests/-recording-requests-page";

export const Route = createFileRoute("/_auth/u/casts/completed")({
  component: () => <RecordingRequestsPage status="completed" />,
});
