import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/events/organizers/$slug")({
  beforeLoad: ({ params }) => {
    throw redirect({
      params: { slug: params.slug },
      to: "/events/hosts/$slug",
    });
  },
});
