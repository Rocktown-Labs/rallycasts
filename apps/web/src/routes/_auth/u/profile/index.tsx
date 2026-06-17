import { createFileRoute, redirect } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_auth/u/profile/")({
  beforeLoad: async () => {
    const session = await authClient.getSession().catch(() => null);
    const user = session?.data?.user;
    const username = user?.username || user?.displayUsername || "player";
    throw redirect({
      params: { username },
      to: "/players/$username",
    });
  },
});
