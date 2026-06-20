import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Radar } from "@/lib/radar";

import { useGeolocation } from "./use-geolocation";

vi.mock("@/lib/radar", () => ({
  Radar: {
    ipGeocode: vi.fn(),
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

describe("useGeolocation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rejectBrowserLocation();
  });

  it("falls back to Radar IP geolocation when browser permission is denied", async () => {
    vi.mocked(Radar.ipGeocode).mockResolvedValue({
      address: {
        latitude: 36.37,
        longitude: -94.21,
        stateCode: "AR",
      },
    } as Awaited<ReturnType<typeof Radar.ipGeocode>>);

    const { result } = renderHook(() => useGeolocation());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.location).toEqual({
      lat: 36.37,
      lng: -94.21,
      stateCode: "AR",
    });
    expect(result.current.error).toBeNull();
  });

  it("uses the explicit Arkansas demo fallback when both providers fail", async () => {
    vi.mocked(Radar.ipGeocode).mockRejectedValue(
      new Error("Radar unavailable")
    );

    const { result } = renderHook(() => useGeolocation());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.location).toMatchObject({
      isFallback: true,
      stateCode: "AR",
    });
    expect(result.current.error).toBe("Location permission denied");
  });
});
