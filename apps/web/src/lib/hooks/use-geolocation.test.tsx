import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Radar } from "@/lib/radar";

import {
  BROWSING_LOCATION_KEY,
  LOCATION_STORAGE_KEY,
  useGeolocation,
} from "./use-geolocation";

vi.mock("@/lib/radar", () => ({
  Radar: {
    ipGeocode: vi.fn(),
    reverseGeocode: vi.fn(),
  },
  initializeRadar: vi.fn(),
}));

const geolocationError = {
  PERMISSION_DENIED: 1,
  POSITION_UNAVAILABLE: 2,
  TIMEOUT: 3,
  code: 1,
  message: "Location permission denied",
} satisfies GeolocationPositionError;

const rejectBrowserLocation = () => {
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition: (
        _success: PositionCallback,
        error: PositionErrorCallback
      ) => error(geolocationError),
    },
  });
};

const allowBrowserLocation = () => {
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition: (success: PositionCallback) =>
        success({
          coords: {
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            latitude: 35.2468,
            longitude: -91.735,
            speed: null,
            toJSON: () => ({}),
          } as GeolocationCoordinates,
          timestamp: Date.now(),
          toJSON: () => ({}),
        } as GeolocationPosition),
    },
  });
};

describe("useGeolocation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage?.clear();
    rejectBrowserLocation();
  });

  it("falls back to Radar IP geolocation when browser permission is denied", async () => {
    vi.mocked(Radar.ipGeocode).mockResolvedValue({
      address: {
        city: "Searcy",
        latitude: 36.37,
        longitude: -94.21,
        stateCode: "AR",
      },
    } as Awaited<ReturnType<typeof Radar.ipGeocode>>);

    const { result } = renderHook(() => useGeolocation());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.location).toEqual({
      city: "Searcy",
      label: "Searcy, AR",
      lat: 36.37,
      lng: -94.21,
      stateCode: "AR",
    });
    expect(result.current.error).toBeNull();
  });

  it("reverse geocodes browser coordinates into a readable location label", async () => {
    allowBrowserLocation();
    vi.mocked(Radar.reverseGeocode).mockResolvedValue({
      addresses: [
        {
          city: "Searcy",
          geometry: {
            coordinates: [-91.735, 35.2468],
            type: "Point",
          },
          latitude: 35.2468,
          longitude: -91.735,
          stateCode: "AR",
        },
      ],
    } as Awaited<ReturnType<typeof Radar.reverseGeocode>>);

    const { result } = renderHook(() => useGeolocation());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(Radar.reverseGeocode).toHaveBeenCalledWith({
      latitude: 35.2468,
      longitude: -91.735,
    });
    expect(result.current.location).toMatchObject({
      city: "Searcy",
      label: "Searcy, AR",
      lat: 35.2468,
      lng: -91.735,
      stateCode: "AR",
    });
  });

  it("does not fabricate a location when both providers fail", async () => {
    vi.mocked(Radar.ipGeocode).mockRejectedValue(
      new Error("Radar unavailable")
    );

    const { result } = renderHook(() => useGeolocation());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.location).toBeUndefined();
    expect(result.current.error).toBe("Location permission denied");
  });

  it("does not auto-fetch on mount when disabled, but fetches successfully on manual request", async () => {
    vi.mocked(Radar.ipGeocode).mockResolvedValue({
      address: {
        city: "Searcy",
        latitude: 35.25,
        longitude: -91.74,
        stateCode: "AR",
      },
    } as Awaited<ReturnType<typeof Radar.ipGeocode>>);

    const { result } = renderHook(() => useGeolocation(false));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.location).toBeUndefined();
    expect(Radar.ipGeocode).not.toHaveBeenCalled();

    act(() => {
      result.current.requestLocation();
    });

    await waitFor(() => expect(result.current.location).toBeDefined());
    expect(result.current.isLoading).toBe(false);
    expect(result.current.location).toEqual({
      city: "Searcy",
      label: "Searcy, AR",
      lat: 35.25,
      lng: -91.74,
      stateCode: "AR",
    });
  });

  it("persists resolved location to localStorage", async () => {
    vi.mocked(Radar.ipGeocode).mockResolvedValue({
      address: {
        city: "Searcy",
        latitude: 35.2468,
        longitude: -91.735,
        stateCode: "AR",
      },
    } as Awaited<ReturnType<typeof Radar.ipGeocode>>);

    const { result } = renderHook(() => useGeolocation());

    await waitFor(() => expect(result.current.location).toBeDefined());

    const stored = window.localStorage.getItem(LOCATION_STORAGE_KEY);
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored as string)).toMatchObject({
      city: "Searcy",
      lat: 35.2468,
      lng: -91.735,
      stateCode: "AR",
    });
  });

  it("initializes with stored location immediately without loading delay", () => {
    const cachedLocation = {
      city: "Searcy",
      label: "Searcy, AR",
      lat: 35.2468,
      lng: -91.735,
      stateCode: "AR",
    };
    window.localStorage.setItem(
      LOCATION_STORAGE_KEY,
      JSON.stringify(cachedLocation)
    );

    const { result } = renderHook(() => useGeolocation(false));

    expect(result.current.location).toEqual(cachedLocation);
    expect(result.current.currentLocation).toEqual(cachedLocation);
    expect(result.current.isBrowsing).toBe(false);
    expect(Radar.ipGeocode).not.toHaveBeenCalled();
  });

  it("supports trip-planning browsing location override and resetting", () => {
    const homeLocation = {
      city: "Searcy",
      label: "Searcy, AR",
      lat: 35.2468,
      lng: -91.735,
      stateCode: "AR",
    };
    window.localStorage.setItem(
      LOCATION_STORAGE_KEY,
      JSON.stringify(homeLocation)
    );

    const { result } = renderHook(() => useGeolocation(false));
    expect(result.current.location).toEqual(homeLocation);

    const travelLocation = {
      city: "New York",
      label: "New York, NY",
      lat: 40.7128,
      lng: -74.006,
      stateCode: "NY",
    };

    act(() => {
      result.current.setBrowsingLocation(travelLocation);
    });

    expect(result.current.isBrowsing).toBe(true);
    expect(result.current.location).toEqual(travelLocation);
    expect(result.current.browsingLocation).toEqual(travelLocation);
    expect(result.current.currentLocation).toEqual(homeLocation);
    expect(window.localStorage.getItem(BROWSING_LOCATION_KEY)).toContain(
      "New York"
    );

    act(() => {
      result.current.resetToCurrentLocation();
    });

    expect(result.current.isBrowsing).toBe(false);
    expect(result.current.location).toEqual(homeLocation);
    expect(result.current.browsingLocation).toBeUndefined();
    expect(window.localStorage.getItem(BROWSING_LOCATION_KEY)).toBeNull();
  });
});
