import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/u/recording-requests")({
  component: () => <Outlet />,
});
