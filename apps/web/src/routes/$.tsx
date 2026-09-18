import { createFileRoute } from "@tanstack/react-router";

import { CourtNotFound } from "@/components/layout/court-not-found";

export const Route = createFileRoute("/$")({
  component: CourtNotFound,
});
