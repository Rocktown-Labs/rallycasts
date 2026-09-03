import { useCallback, useEffect, useState } from "react";

const LOCATION_CONSENT_KEY = "rallycasts.location-consent";

type LocationConsent = "granted" | "unknown";

export function useLocationConsent() {
  const [consent, setConsent] = useState<LocationConsent>("unknown");

  useEffect(() => {
    try {
      if (window.localStorage.getItem(LOCATION_CONSENT_KEY) === "granted") {
        setConsent("granted");
      }
    } catch {
      // A blocked storage API keeps location sharing opt-in for this session.
    }
  }, []);

  const grantConsent = useCallback(() => {
    try {
      window.localStorage.setItem(LOCATION_CONSENT_KEY, "granted");
    } catch {
      // The in-memory state still permits the current session after browser permission.
    }
    setConsent("granted");
  }, []);

  const revokeConsent = useCallback(() => {
    try {
      window.localStorage.removeItem(LOCATION_CONSENT_KEY);
    } catch {
      // Keep the in-memory opt-out even when storage is unavailable.
    }
    setConsent("unknown");
  }, []);

  return {
    grantConsent,
    hasConsent: consent === "granted",
    revokeConsent,
  };
}
