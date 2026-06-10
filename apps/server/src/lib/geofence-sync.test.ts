import { beforeEach, describe, expect, it, vi } from "vitest";

import { deleteVenueGeofence, syncVenueGeofence } from "../lib/geofence-sync";

// Mock fetch globally
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe("geofence-sync", () => {
  const secretKey = "test_radar_secret_key";

  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe("syncVenueGeofence", () => {
    it("creates geofence for venue with few courts", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => ({ meta: { code: 200 } }),
        ok: true,
      });

      const venue = {
        courtCount: 2,
        id: "venue_123",
        latitude: 40.7128,
        longitude: -74.006,
        name: "Small Park",
      };

      await syncVenueGeofence(secretKey, venue);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.radar.io/v1/venue/venue_123",
        expect.objectContaining({
          body: expect.stringContaining("200"),
          method: "PUT",
        })
      );

      // Verify the radius is 200 for small courts
      const calledBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(calledBody.radius).toBe(200);
    });

    it("creates geofence for venue with many courts", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => ({ meta: { code: 200 } }),
        ok: true,
      });

      const venue = {
        courtCount: 8,
        id: "venue_456",
        latitude: 40.7128,
        longitude: -74.006,
        name: "Large Complex",
      };

      await syncVenueGeofence(secretKey, venue);

      // Verify the radius is 300 for large courts
      const calledBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(calledBody.radius).toBe(300);
    });

    it("creates geofence with correct metadata", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => ({ meta: { code: 200 } }),
        ok: true,
      });

      const venue = {
        courtCount: 4,
        id: "venue_789",
        latitude: 40.7128,
        longitude: -74.006,
        name: "Test Venue",
      };

      await syncVenueGeofence(secretKey, venue);

      const calledBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(calledBody.metadata).toEqual({
        courtCount: 4,
        venueId: "venue_789",
      });
      expect(calledBody.coordinates).toEqual([-74.006, 40.7128]);
      expect(calledBody.description).toBe("Test Venue");
      expect(calledBody.type).toBe("circle");
    });

    it("throws error on Radar API failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: () => "Unauthorized",
      });

      const venue = {
        courtCount: 2,
        id: "venue_123",
        latitude: 40.7128,
        longitude: -74.006,
        name: "Test Venue",
      };

      await expect(syncVenueGeofence(secretKey, venue)).rejects.toThrow();
    });
  });

  describe("deleteVenueGeofence", () => {
    it("deletes geofence by venue ID", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => ({ meta: { code: 200 } }),
        ok: true,
      });

      await deleteVenueGeofence(secretKey, "venue_123");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.radar.io/v1/venue/venue_123",
        expect.objectContaining({
          method: "DELETE",
        })
      );
    });

    it("throws error on delete failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: () => "Not Found",
      });

      await expect(
        deleteVenueGeofence(secretKey, "venue_123")
      ).rejects.toThrow();
    });
  });
});
