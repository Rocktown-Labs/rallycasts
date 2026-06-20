import { useCallback, useEffect, useState } from "react";

import { initializeRadar, Radar } from "@/lib/radar";

export interface GeoLocation {
  isFallback?: boolean;
  lat: number;
  lng: number;
  stateCode?: string;
}

const ARKANSAS_TEST_LOCATION: GeoLocation = {
  isFallback: true,
  lat: 36.3729,
  lng: -94.2088,
  stateCode: "AR",
};

export function useGeolocation(enabled = true) {
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
          (position) => {
            if (cancelled) {
              return;
            }
            setLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
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
              if (result.address?.latitude && result.address?.longitude) {
                setLocation({
                  lat: result.address.latitude,
                  lng: result.address.longitude,
                  stateCode: result.address.stateCode || undefined,
                });
                setError(null);
              } else {
                setLocation(ARKANSAS_TEST_LOCATION);
                setError(err.message);
              }
            } catch {
              setLocation(ARKANSAS_TEST_LOCATION);
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
          if (result.address?.latitude && result.address?.longitude) {
            setLocation({
              lat: result.address.latitude,
              lng: result.address.longitude,
              stateCode: result.address.stateCode || undefined,
            });
            setError(null);
          } else {
            setLocation(ARKANSAS_TEST_LOCATION);
            setError("Geolocation is not supported by this browser.");
          }
        } catch {
          setLocation(ARKANSAS_TEST_LOCATION);
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
