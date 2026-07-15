import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/u/recording-requests/me")({
  beforeLoad: () => {
    throw redirect({ to: "/u/recording-requests/all" });
  },
});
