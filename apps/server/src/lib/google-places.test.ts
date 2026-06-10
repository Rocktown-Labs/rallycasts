import { beforeEach, describe, expect, it, vi } from "vitest";

import { GooglePlacesClient, createGooglePlacesClient } from "./google-places";

// Mock fetch globally
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe("GooglePlacesClient", () => {
  const apiKey = "test_google_places_api_key";
  const client = new GooglePlacesClient(apiKey);

  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe("createGooglePlacesClient", () => {
    it("creates a client with the provided API key", () => {
      const placesClient = createGooglePlacesClient();
      expect(placesClient).toBeInstanceOf(GooglePlacesClient);
    });
  });

  describe("searchNearby", () => {
    it("searches for nearby pickleball venues", async () => {
      const mockResponse = {
        html_attributions: [],
        results: [
          {
            geometry: {
              location: {
                lat: 40.7128,
                lng: -74.006,
              },
            },
            name: "Pickleball Court NYC",
            photos: [
              {
                height: 400,
                html_attributions: [],
                photo_reference: "photo_ref_123",
                width: 600,
              },
            ],
            place_id: "place_123",
            rating: 4.5,
            types: ["park", "sports_complex"],
            user_ratings_total: 42,
            vicinity: "123 Park Ave, New York",
          },
        ],
        status: "OK",
      };
      mockFetch.mockResolvedValueOnce({
        json: () => mockResponse,
        ok: true,
      });

      const results = await client.searchNearby(
        40.7128,
        -74.006,
        50_000,
        "pickleball"
      );

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(
        expect.objectContaining({
          address: "123 Park Ave, New York",
          latitude: 40.7128,
          longitude: -74.006,
          name: "Pickleball Court NYC",
          photoUrl: expect.stringContaining("photo"),
          placeId: "place_123",
          rating: 4.5,
          types: ["park", "sports_complex"],
          userRatingsTotal: 42,
        })
      );

      const [[calledUrl]] = mockFetch.mock.calls;
      expect(calledUrl).toContain(
        "maps.googleapis.com/maps/api/place/nearbysearch/json"
      );
      expect(calledUrl).toContain("location=40.7128%2C-74.006");
      expect(calledUrl).toContain("radius=50000");
      expect(calledUrl).toContain("keyword=pickleball");
      expect(calledUrl).toContain("type=park");
      expect(calledUrl).toContain("key=test_google_places_api_key");
    });

    it("returns empty array for zero results", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => ({
          html_attributions: [],
          results: [],
          status: "ZERO_RESULTS",
        }),
        ok: true,
      });

      const results = await client.searchNearby(40.7128, -74.006);
      expect(results).toEqual([]);
    });

    it("throws error on API failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
      });

      await expect(client.searchNearby(40.7128, -74.006)).rejects.toThrow(
        "Google Places API error: 403"
      );
    });

    it("throws error for non-OK status", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => ({
          error_message: "Invalid request",
          status: "INVALID_REQUEST",
        }),
        ok: true,
      });

      await expect(client.searchNearby(40.7128, -74.006)).rejects.toThrow(
        "INVALID_REQUEST"
      );
    });
  });

  describe("searchText", () => {
    it("searches for places by text query", async () => {
      const mockResponse = {
        html_attributions: [],
        results: [
          {
            formatted_address: "456 Court St, Brooklyn, NY",
            geometry: {
              location: {
                lat: 40.6782,
                lng: -73.9442,
              },
            },
            name: "Brooklyn Pickleball Courts",
            place_id: "place_456",
            types: ["park"],
          },
        ],
        status: "OK",
      };
      mockFetch.mockResolvedValueOnce({
        json: () => mockResponse,
        ok: true,
      });

      const results = await client.searchText("pickleball courts brooklyn");

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Brooklyn Pickleball Courts");
      expect(results[0].address).toBe("456 Court St, Brooklyn, NY");

      const [[calledUrl]] = mockFetch.mock.calls;
      expect(calledUrl).toContain("query=pickleball+courts+brooklyn");
    });

    it("includes location bias when provided", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => ({
          html_attributions: [],
          results: [],
          status: "ZERO_RESULTS",
        }),
        ok: true,
      });

      await client.searchText("pickleball", 40.7128, -74.006);

      const [[calledUrl]] = mockFetch.mock.calls;
      expect(calledUrl).toContain("location=40.7128%2C-74.006");
      expect(calledUrl).toContain("radius=50000");
    });
  });

  describe("getPlaceDetails", () => {
    it("fetches detailed place information", async () => {
      const mockResponse = {
        html_attributions: [],
        result: {
          formatted_address: "789 Park Blvd, Queens, NY 11101",
          geometry: {
            location: {
              lat: 40.7282,
              lng: -73.7949,
            },
          },
          name: "Queens Pickleball Park",
          opening_hours: {
            open_now: true,
          },
          photos: [
            {
              height: 800,
              html_attributions: [],
              photo_reference: "photo_ref_789",
              width: 1200,
            },
          ],
          place_id: "place_789",
          rating: 4.8,
          types: ["park", "sports_complex"],
          user_ratings_total: 156,
        },
        status: "OK",
      };
      mockFetch.mockResolvedValueOnce({
        json: () => mockResponse,
        ok: true,
      });

      const result = await client.getPlaceDetails("place_789");

      expect(result).toEqual(
        expect.objectContaining({
          address: "789 Park Blvd, Queens, NY 11101",
          latitude: 40.7282,
          longitude: -73.7949,
          name: "Queens Pickleball Park",
          openNow: true,
          photoUrl: expect.stringContaining("photo"),
          placeId: "place_789",
          rating: 4.8,
          userRatingsTotal: 156,
        })
      );

      const [[calledUrl]] = mockFetch.mock.calls;
      expect(calledUrl).toContain("place_id=place_789");
      expect(calledUrl).toContain("fields=");
    });

    it("throws error for invalid place ID", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => ({
          error_message: "Place not found",
          status: "NOT_FOUND",
        }),
        ok: true,
      });

      await expect(client.getPlaceDetails("invalid_place")).rejects.toThrow(
        "NOT_FOUND"
      );
    });
  });

  describe("getPhotoUrl", () => {
    it("generates photo URL with correct parameters", () => {
      const url = client.getPhotoUrl("photo_ref_123", 400);

      expect(url).toContain("maps.googleapis.com/maps/api/place/photo");
      expect(url).toContain("photoreference=photo_ref_123");
      expect(url).toContain("maxwidth=400");
      expect(url).toContain("key=test_google_places_api_key");
    });

    it("uses default maxWidth when not specified", () => {
      const url = client.getPhotoUrl("photo_ref_123");
      expect(url).toContain("maxwidth=400");
    });
  });
});
