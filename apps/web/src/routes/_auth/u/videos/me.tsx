import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/u/videos/me")({
  beforeLoad: () => {
    throw redirect({ to: "/u/videos" });
  },
});
