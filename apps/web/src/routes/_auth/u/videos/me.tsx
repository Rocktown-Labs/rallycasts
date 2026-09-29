import { createFileRoute, redirect } from "@tanstack/react-router";

// The videos library lives in Studio now.
export const Route = createFileRoute("/_auth/u/videos/me")({
  beforeLoad: () => {
    throw redirect({ to: "/u/studio" });
  },
});
