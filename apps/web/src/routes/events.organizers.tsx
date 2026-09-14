import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/events/organizers")({
  beforeLoad: () => {
    throw redirect({ to: "/events/hosts" });
  },
});
