import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/hosts")({
  beforeLoad: () => {
    throw redirect({ to: "/events/hosts" });
  },
});
