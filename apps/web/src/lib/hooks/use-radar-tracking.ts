import { useEffect } from "react";

import { initializeRadar, Radar } from "@/lib/radar";

export function useRadarTracking(userId?: string | null) {
  useEffect(() => {
    if (typeof window === "undefined" || !userId) {
      return;
    }

    initializeRadar();

    // Set user ID for Radar tracking
    Radar.setUserId(userId);

    // Track location once on mount
    const trackLocation = () => {
      try {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              try {
                Radar.trackOnce({
                  accuracy: position.coords.accuracy,
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                });
              } catch {
                // Silently fail - location tracking is best-effort
              }
            },
            () => {
              // Location permission denied - that's okay
            },
            { enableHighAccuracy: true, maximumAge: 300_000, timeout: 10_000 }
          );
        }
      } catch {
        // Silently fail
      }
    };

    // Track immediately
    trackLocation();

    // Track every 5 minutes while the app is open
    const interval = setInterval(trackLocation, 300_000);

    return () => {
      clearInterval(interval);
    };
  }, [userId]);
}
