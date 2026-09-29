import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/u/profile/")({
  beforeLoad: () => {
    // Profile editing lives on the settings page now.
    throw redirect({ to: "/u/settings" });
  },
});
