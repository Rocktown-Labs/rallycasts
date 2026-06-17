import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/u/")({
  beforeLoad: () => {
    throw redirect({
      to: "/u/me",
    });
  },
});
