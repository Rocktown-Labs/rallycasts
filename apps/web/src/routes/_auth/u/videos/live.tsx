import { createFileRoute, redirect } from "@tanstack/react-router";

// The live tab lives in Studio now.
export const Route = createFileRoute("/_auth/u/videos/live")({
  beforeLoad: () => {
    throw redirect({ to: "/u/studio/live" });
  },
});
