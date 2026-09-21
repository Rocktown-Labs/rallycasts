import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/places/$id")({
  component: PlaceRouteRedirect,
});

function PlaceRouteRedirect() {
  const { id } = Route.useParams();
  return <Navigate to="/venues/$id" params={{ id }} replace />;
}
