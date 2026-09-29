import { createFileRoute, redirect } from "@tanstack/react-router";

// The clips tab lives in Studio now.
export const Route = createFileRoute("/_auth/u/videos/clips")({
  beforeLoad: () => {
    throw redirect({ to: "/u/studio/clips" });
  },
});
