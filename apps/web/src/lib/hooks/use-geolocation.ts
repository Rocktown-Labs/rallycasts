import { useEffect, useState } from "react";

import { initializeRadar, Radar } from "@/lib/radar";

export interface GeoLocation {
  lat: number;
  lng: number;
}

export function useGeolocation() {
  const [location, setLocation] = useState<GeoLocation | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") {
      setIsLoading(false);
      return;
    }

    initializeRadar();

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
                });
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
          if (result.address?.latitude && result.address?.longitude) {
            setLocation({
              lat: result.address.latitude,
              lng: result.address.longitude,
            });
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
  }, []);

  return { error, isLoading, location };
}
