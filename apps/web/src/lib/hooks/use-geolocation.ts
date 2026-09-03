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

export function useGeolocation(enabled = true): {
  error: string | null;
  isLoading: boolean;
  location: GeoLocation | undefined;
  requestLocation: () => (() => null) | (() => void);
} {
  const [location, setLocation] = useState<GeoLocation | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const requestLocation = useCallback(() => {
    if (!enabled) {
      setIsLoading(false);
      return () => null;
    }
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
            setLocation(nextLocation);
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
                setLocation(nextLocation);
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
            setLocation(nextLocation);
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
  }, [enabled]);

  useEffect(() => requestLocation(), [requestLocation]);

  return { error, isLoading, location, requestLocation };
}
