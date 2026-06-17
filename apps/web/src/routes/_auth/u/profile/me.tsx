import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/u/profile/me")({
  beforeLoad: () => {
    throw redirect({
      to: "/u/settings",
    });
  },
});
