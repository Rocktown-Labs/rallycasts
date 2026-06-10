import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { apiClient } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";

const AuthLayout = () => <Outlet />;

export const Route = createFileRoute("/_auth")({
  beforeLoad: async ({ location }) => {
    const session = await authClient.getSession().catch(() => null);
    if (!session?.data) {
      throw redirect({
        to: "/login",
      });
    }

    let profileData = null;
    try {
      const res = await apiClient.api.profile.me.$get();
      if (res.ok) {
        profileData = await res.json();
      }
    } catch {
      // Ignore API errors to prevent blocking
    }

    const onboardingStatus = profileData?.profile?.onboardingStatus;
    if (
      onboardingStatus !== "complete" &&
      location.pathname !== "/onboarding"
    ) {
      throw redirect({
        to: "/onboarding",
      });
    }

    if (
      onboardingStatus === "complete" &&
      location.pathname === "/onboarding"
    ) {
      throw redirect({
        to: "/u",
      });
    }

    return { session };
  },
  component: AuthLayout,
  ssr: false,
});
