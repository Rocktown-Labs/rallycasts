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
      const res = await apiClient.api.v1.profile.me.$get();
      if (res.ok) {
        profileData = await res.json();
      }
    } catch {
      // Ignore API errors to prevent blocking
    }

    const onboardingStatus = profileData?.profile?.onboardingStatus;
    const needsOnboarding =
      profileData?.needsOnboarding ?? onboardingStatus !== "complete";
    if (needsOnboarding && location.pathname !== "/onboarding") {
      throw redirect({
        to: "/onboarding",
      });
    }

    if (!needsOnboarding && location.pathname === "/onboarding") {
      throw redirect({
        to: "/u/me",
      });
    }

    return { session };
  },
  component: AuthLayout,
  ssr: false,
});
