import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/u/history/")({
  beforeLoad: () => {
    throw redirect({ to: "/u/history/videos" });
  },
});
