import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/u/recording-requests/pending")({
  beforeLoad: () => {
    throw redirect({ to: "/u/casts/pending" });
  },
});
