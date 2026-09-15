import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/events/organizers/$slug/manage")({
  beforeLoad: ({ params }) => {
    throw redirect({
      params: { slug: params.slug },
      to: "/events/hosts/$slug/manage",
    });
  },
});
