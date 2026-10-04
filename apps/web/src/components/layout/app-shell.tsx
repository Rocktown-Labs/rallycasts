import { Outlet } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { SetupGuide } from "../onboarding/setup-guide";
import AppSidebar from "./app-sidebar";
import MobileBottomNav from "./mobile-bottom-nav";
import { SidebarContext } from "./sidebar-context";
import SiteHeader from "./site-header";

export default function AppShell({ children }: { children?: ReactNode } = {}) {
  const [collapsed, setCollapsed] = useState(false);
  const toggleSidebar = useCallback(() => setCollapsed((value) => !value), []);

  useEffect(() => {
    const promptedKey = "rallycasts-location-prompted";

    if (
      typeof window === "undefined" ||
      !("geolocation" in navigator) ||
      window.localStorage.getItem(promptedKey) === "true"
    ) {
      return;
    }

    window.localStorage.setItem(promptedKey, "true");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        window.localStorage.setItem(
          "rallycasts-location",
          JSON.stringify({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
        );
      },
      undefined,
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 8000 }
    );
  }, []);

  const sidebarContextValue = useMemo(
    () => ({ collapsed, setCollapsed, toggleSidebar }),
    [collapsed, toggleSidebar]
  );

  return (
    <SidebarContext.Provider value={sidebarContextValue}>
      <div className="bg-background text-foreground flex min-h-svh">
        <AppSidebar collapsed={collapsed} onToggle={toggleSidebar} />
        <div
          className="flex min-w-0 flex-1 flex-col"
          data-sidebar-collapsed={collapsed}
        >
          <SiteHeader />
          <main className="min-w-0 flex-1 overflow-x-hidden px-4 pt-6 pb-24 md:px-8 md:pb-10">
            {children ?? <Outlet />}
          </main>
        </div>
        <MobileBottomNav />
        <SetupGuide />
      </div>
    </SidebarContext.Provider>
  );
}
