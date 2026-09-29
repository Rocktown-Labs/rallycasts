import { createFileRoute, redirect } from "@tanstack/react-router";

// The manage console lives in host tools now.
export const Route = createFileRoute("/_auth/events/organizers/$slug/manage")({
  beforeLoad: ({ params }) => {
    throw redirect({
      params: { slug: params.slug },
      to: "/u/organizer/organizations/$slug",
    });
  },
});
