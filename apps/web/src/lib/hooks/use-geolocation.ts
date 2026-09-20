import { useCallback, useEffect, useState } from "react";

import { initializeRadar, Radar } from "@/lib/radar";

export interface GeoLocation {
  city?: string;
  isFallback?: boolean;
  label?: string;
  lat: number;
  lng: number;
  stateCode?: string;
}

const getLocationLabel = (location: Pick<GeoLocation, "city" | "stateCode">) =>
  [location.city, location.stateCode].filter(Boolean).join(", ");

const locationFromAddress = (
  address:
    | {
        city?: string;
        latitude?: number;
        longitude?: number;
        stateCode?: string;
      }
    | undefined
): GeoLocation | null => {
  if (
    typeof address?.latitude !== "number" ||
    typeof address.longitude !== "number"
  ) {
    return null;
  }

  const location = {
    city: address.city || undefined,
    lat: address.latitude,
    lng: address.longitude,
    stateCode: address.stateCode || undefined,
  };

  return {
    ...location,
    label: getLocationLabel(location) || undefined,
  };
};

const reverseGeocodeLocation = async (
  lat: number,
  lng: number
): Promise<GeoLocation> => {
  try {
    const result = await Radar.reverseGeocode({
      latitude: lat,
      longitude: lng,
    });
    const address = result.addresses.find(
      (item) => item.city || item.stateCode
    );
    const location = {
      city: address?.city || undefined,
      lat,
      lng,
      stateCode: address?.stateCode || undefined,
    };

    return {
      ...location,
      label: getLocationLabel(location) || undefined,
    };
  } catch {
    return { lat, lng };
  }
};

export const LOCATION_STORAGE_KEY = "rallycasts.last-known-location";
export const BROWSING_LOCATION_KEY = "rallycasts.browsing-location";

export const getStoredLocation = (): GeoLocation | undefined => {
  if (typeof window === "undefined") {
    return undefined;
  }
  try {
    const raw = window.localStorage.getItem(LOCATION_STORAGE_KEY);
    if (!raw) {
      return undefined;
    }
    const parsed = JSON.parse(raw) as Partial<GeoLocation>;
    if (typeof parsed.lat === "number" && typeof parsed.lng === "number") {
      return parsed as GeoLocation;
    }
  } catch {
    // Ignore invalid stored location
  }
  return undefined;
};

export const getStoredBrowsingLocation = (): GeoLocation | undefined => {
  if (typeof window === "undefined") {
    return undefined;
  }
  try {
    const raw = window.localStorage.getItem(BROWSING_LOCATION_KEY);
    if (!raw) {
      return undefined;
    }
    const parsed = JSON.parse(raw) as Partial<GeoLocation>;
    if (typeof parsed.lat === "number" && typeof parsed.lng === "number") {
      return parsed as GeoLocation;
    }
  } catch {
    // Ignore invalid stored location
  }
  return undefined;
};

export const setStoredBrowsingLocation = (
  location: GeoLocation | null
): void => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (location) {
      window.localStorage.setItem(
        BROWSING_LOCATION_KEY,
        JSON.stringify(location)
      );
    } else {
      window.localStorage.removeItem(BROWSING_LOCATION_KEY);
    }
    window.dispatchEvent(new Event("rallycasts:location-change"));
  } catch {
    // Ignore storage errors
  }
};

export function useGeolocation(enabled = true): {
  browsingLocation: GeoLocation | undefined;
  currentLocation: GeoLocation | undefined;
  error: string | null;
  isBrowsing: boolean;
  isLoading: boolean;
  location: GeoLocation | undefined;
  requestLocation: () => (() => null) | (() => void);
  resetToCurrentLocation: () => void;
  setBrowsingLocation: (loc: GeoLocation | null) => void;
} {
  const [currentLocation, setCurrentLocation] = useState<
    GeoLocation | undefined
  >(() => getStoredLocation());
  const [browsingLocation, setBrowsingLocationState] = useState<
    GeoLocation | undefined
  >(() => getStoredBrowsingLocation());
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(
    enabled && !getStoredLocation() && !getStoredBrowsingLocation()
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleSync = () => {
      setBrowsingLocationState(getStoredBrowsingLocation());
      const stored = getStoredLocation();
      if (stored) {
        setCurrentLocation(stored);
      }
    };

    window.addEventListener("rallycasts:location-change", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("rallycasts:location-change", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const setBrowsingLocation = useCallback((loc: GeoLocation | null) => {
    setStoredBrowsingLocation(loc);
    setBrowsingLocationState(loc ?? undefined);
  }, []);

  const resetToCurrentLocation = useCallback(() => {
    setStoredBrowsingLocation(null);
    setBrowsingLocationState(undefined);
  }, []);

  const persistLocation = useCallback((nextLocation: GeoLocation) => {
    setCurrentLocation(nextLocation);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          LOCATION_STORAGE_KEY,
          JSON.stringify(nextLocation)
        );
      } catch {
        // Ignore storage write errors
      }
    }
  }, []);

  const requestLocation = useCallback(() => {
    if (typeof window === "undefined") {
      setIsLoading(false);
      return () => null;
    }

    initializeRadar();
    setIsLoading(true);

    let cancelled = false;

    const getLocation = async () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            if (cancelled) {
              return;
            }
            const nextLocation = await reverseGeocodeLocation(
              position.coords.latitude,
              position.coords.longitude
            );
            if (cancelled) {
              return;
            }
            persistLocation(nextLocation);
            setError(null);
            setIsLoading(false);
          },
          async (err) => {
            if (cancelled) {
              return;
            }
            // Fallback to Radar IP geolocation if browser geolocation fails
            try {
              const result = await Radar.ipGeocode();
              const nextLocation = locationFromAddress(result.address);
              if (nextLocation) {
                persistLocation(nextLocation);
                setError(null);
              } else {
                setError(err.message);
              }
            } catch {
              setError(err.message);
            } finally {
              setIsLoading(false);
            }
          },
          {
            enableHighAccuracy: true,
            maximumAge: 60_000,
            timeout: 10_000,
          }
        );
      } else {
        // Fallback to Radar IP geolocation if browser geolocation not supported
        try {
          const result = await Radar.ipGeocode();
          const nextLocation = locationFromAddress(result.address);
          if (nextLocation) {
            persistLocation(nextLocation);
            setError(null);
          } else {
            setError("Geolocation is not supported by this browser.");
          }
        } catch {
          setError("Geolocation is not supported by this browser.");
        } finally {
          setIsLoading(false);
        }
      }
    };

    getLocation();

    return () => {
      cancelled = true;
    };
  }, [persistLocation]);

  useEffect(() => {
    if (enabled) {
      return requestLocation();
    }
    setIsLoading(false);
  }, [enabled, requestLocation]);

  const effectiveLocation = browsingLocation ?? currentLocation;

  return {
    browsingLocation,
    currentLocation,
    error,
    isBrowsing: Boolean(browsingLocation),
    isLoading,
    location: effectiveLocation,
    requestLocation,
    resetToCurrentLocation,
    setBrowsingLocation,
  };
}
