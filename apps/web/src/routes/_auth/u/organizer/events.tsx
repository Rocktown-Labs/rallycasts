import { createFileRoute, redirect } from "@tanstack/react-router";

// Per-organization management covers events now: pick an organization to
// publish and manage its tournaments.
export const Route = createFileRoute("/_auth/u/organizer/events")({
  beforeLoad: () => {
    throw redirect({ to: "/u/organizer/organizations" });
  },
});
