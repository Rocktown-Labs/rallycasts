import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/events/organizers/new")({
  beforeLoad: () => {
    throw redirect({ to: "/events/hosts/new" });
  },
});
