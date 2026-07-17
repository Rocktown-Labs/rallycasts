import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/u/casts/")({
  beforeLoad: () => {
    throw redirect({ to: "/u/casts/all" });
  },
});
