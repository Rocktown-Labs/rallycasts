import { Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import AppSidebar from "./app-sidebar";
import MobileBottomNav from "./mobile-bottom-nav";
import SiteHeader from "./site-header";

export default function AppShell({ children }: { children?: ReactNode } = {}) {
  const [collapsed, setCollapsed] = useState(false);

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

  return (
    <div className="flex min-h-svh bg-background text-foreground">
      <AppSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((value) => !value)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <SiteHeader />
        <main className="min-w-0 flex-1 overflow-x-hidden px-4 pb-24 pt-6 md:px-8 md:pb-10">
          {children ?? <Outlet />}
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
