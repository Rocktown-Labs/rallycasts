import { beforeEach, describe, expect, it, vi } from "vitest";

import { RadarClient, createRadarClient } from "./radar-client";

// Mock fetch globally
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe("RadarClient", () => {
  const secretKey = "test_radar_secret_key";
  const client = new RadarClient(secretKey);

  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe("createRadarClient", () => {
    it("creates a client with the provided secret key", () => {
      const radarClient = createRadarClient(secretKey);
      expect(radarClient).toBeInstanceOf(RadarClient);
    });
  });

  describe("upsertGeofence", () => {
    it("creates a geofence with correct parameters", async () => {
      const mockResponse = { meta: { code: 200 } };
      mockFetch.mockResolvedValueOnce({
        json: () => mockResponse,
        ok: true,
      });

      const params = {
        coordinates: [40.7128, -74.006] as [number, number],
        description: "Test Venue",
        externalId: "venue_123",
        metadata: { courtCount: 4 },
        radius: 200,
        tag: "venue",
      };

      const result = await client.upsertGeofence(params);

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.radar.io/v1/venue/venue_123",
        expect.objectContaining({
          body: expect.any(String),
          headers: {
            Authorization: secretKey,
            "Content-Type": "application/json",
          },
          method: "PUT",
        })
      );
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody).toMatchObject({
        coordinates: params.coordinates,
        description: params.description,
        metadata: {
          courtCount: 4,
          venueId: params.externalId,
        },
        radius: params.radius,
        type: "circle",
      });
    });

    it("throws error on API failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: () => "Unauthorized",
      });

      const params = {
        coordinates: [40.7128, -74.006] as [number, number],
        description: "Test Venue",
        externalId: "venue_123",
        radius: 200,
        tag: "venue",
      };

      await expect(client.upsertGeofence(params)).rejects.toThrow(
        "Radar API error:"
      );
    });
  });

  describe("deleteGeofence", () => {
    it("deletes a geofence by tag and externalId", async () => {
      const mockResponse = { meta: { code: 200 } };
      mockFetch.mockResolvedValueOnce({
        json: () => mockResponse,
        ok: true,
      });

      const result = await client.deleteGeofence("venue", "venue_123");

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.radar.io/v1/venue/venue_123",
        expect.objectContaining({
          headers: {
            Authorization: secretKey,
            "Content-Type": "application/json",
          },
          method: "DELETE",
        })
      );
    });
  });

  describe("listGeofences", () => {
    it("lists geofences without parameters", async () => {
      const mockResponse = {
        geofences: [
          {
            description: "Test Venue",
            externalId: "venue_123",
            radius: 200,
            tag: "venue",
          },
        ],
        meta: { code: 200 },
      };
      mockFetch.mockResolvedValueOnce({
        json: () => mockResponse,
        ok: true,
      });

      const result = await client.listGeofences();

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.radar.io/v1/geofences",
        expect.objectContaining({
          headers: {
            Authorization: secretKey,
            "Content-Type": "application/json",
          },
        })
      );
    });

    it("lists geofences with tag filter", async () => {
      const mockResponse = {
        geofences: [
          {
            description: "Test Venue",
            externalId: "venue_123",
            radius: 200,
            tag: "venue",
          },
        ],
        meta: { code: 200 },
      };
      mockFetch.mockResolvedValueOnce({
        json: () => mockResponse,
        ok: true,
      });

      const result = await client.listGeofences({ tag: "venue" });

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.radar.io/v1/geofences?tag=venue",
        expect.anything()
      );
    });

    it("lists geofences with limit", async () => {
      const mockResponse = {
        geofences: [],
        meta: { code: 200 },
      };
      mockFetch.mockResolvedValueOnce({
        json: () => mockResponse,
        ok: true,
      });

      await client.listGeofences({ limit: 10 });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.radar.io/v1/geofences?limit=10",
        expect.anything()
      );
    });
  });
});
