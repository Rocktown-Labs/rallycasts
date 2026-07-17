import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/u/recording-requests/completed")({
  beforeLoad: () => {
    throw redirect({ to: "/u/casts/completed" });
  },
});
