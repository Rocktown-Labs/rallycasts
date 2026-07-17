import { createFileRoute } from "@tanstack/react-router";

import { ProfileEditorPage } from "../settings";

export const Route = createFileRoute("/_auth/u/profile/")({
  component: ProfileRoute,
});

function ProfileRoute() {
  return (
    <ProfileEditorPage
      title="Edit Profile"
      subtitle="Update the public profile players see, including your name, handle, bio, home court, rating, and roles."
    />
  );
}
