import { beforeEach, describe, expect, it, vi } from "vitest";

import { GooglePlacesClient, createGooglePlacesClient } from "./google-places";

// Mock fetch globally
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe("GooglePlacesClient", () => {
  const apiKey = "test_google_places_api_key";
  const client = new GooglePlacesClient(apiKey);

  beforeEach(() => {
    mockFetch.mockReset();
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
        places: [
          {
            displayName: {
              text: "Pickleball Court NYC",
            },
            formattedAddress: "123 Park Ave, New York",
            id: "place_123",
            location: {
              latitude: 40.7128,
              longitude: -74.006,
            },
            photos: [
              {
                heightPx: 400,
                name: "places/place_123/photos/photo_ref_123",
                widthPx: 600,
              },
            ],
            rating: 4.5,
            types: ["park", "sports_complex"],
            userRatingCount: 42,
          },
        ],
      };
      mockFetch.mockResolvedValue({
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

      expect(mockFetch).toHaveBeenCalledTimes(7);
      const [[calledUrl, requestInit], ...remainingCalls] =
        mockFetch.mock.calls;
      expect(calledUrl).toBe(
        "https://places.googleapis.com/v1/places:searchText"
      );
      expect(requestInit).toMatchObject({
        headers: expect.objectContaining({
          "X-Goog-Api-Key": "test_google_places_api_key",
          "X-Goog-FieldMask": expect.stringContaining("places.displayName"),
        }),
        method: "POST",
      });
      expect(JSON.parse(requestInit.body as string)).toMatchObject({
        locationRestriction: {
          circle: {
            center: { latitude: 40.7128, longitude: -74.006 },
            radius: 50_000,
          },
        },
        rankPreference: "DISTANCE",
        textQuery: "pickleball",
      });
      expect(
        mockFetch.mock.calls
          .map(([, init]) => JSON.parse(init.body as string))
          .some((body) => body.includedType === "park")
      ).toBe(true);
      const [, nearbyRequestInit] = remainingCalls.at(-1) ?? [];
      expect(JSON.parse(nearbyRequestInit.body as string)).toMatchObject({
        includedTypes: expect.arrayContaining(["park", "sports_complex"]),
        locationRestriction: {
          circle: {
            center: { latitude: 40.7128, longitude: -74.006 },
            radius: 50_000,
          },
        },
        rankPreference: "DISTANCE",
      });
    });

    it("returns empty array for zero results", async () => {
      mockFetch.mockResolvedValue({
        json: () => ({
          places: [],
        }),
        ok: true,
      });

      const results = await client.searchNearby(40.7128, -74.006);
      expect(results).toEqual([]);
    });

    it("keeps nearby discovery alive when one text search refinement fails", async () => {
      mockFetch
        .mockResolvedValueOnce({
          json: () => ({
            error: {
              message: "Bad included type",
              status: "INVALID_ARGUMENT",
            },
          }),
          ok: false,
          status: 400,
        })
        .mockResolvedValue({
          json: () => ({
            places: [
              {
                displayName: {
                  text: "Berryhill Park",
                },
                formattedAddress: "Berryhill Rd, Searcy, AR",
                id: "berryhill",
                location: {
                  latitude: 35.2468,
                  longitude: -91.735,
                },
                rating: 4.7,
                types: ["park"],
                userRatingCount: 24,
              },
            ],
          }),
          ok: true,
        });

      const results = await client.searchNearby(35.2468, -91.735);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        isPickleballCandidate: true,
        name: "Berryhill Park",
        placeId: "berryhill",
      });
    });

    it("filters lodging results out of pickleball discovery", async () => {
      mockFetch.mockResolvedValue({
        json: () => ({
          places: [
            {
              displayName: {
                text: "Downtown Hotel Pickleball Courts",
              },
              formattedAddress: "1 Hotel Way, Searcy, AR",
              id: "hotel_place",
              location: {
                latitude: 35.2468,
                longitude: -91.735,
              },
              types: ["hotel", "lodging"],
            },
          ],
        }),
        ok: true,
      });

      const results = await client.searchNearby(35.2468, -91.735);

      expect(results).toEqual([]);
    });

    it("throws error on API failure", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
      });

      await expect(client.searchNearby(40.7128, -74.006)).rejects.toThrow(
        "Google Places API error: 403"
      );
    });

    it("throws error for non-OK status", async () => {
      mockFetch.mockResolvedValue({
        json: () => ({
          error: {
            message: "Invalid request",
            status: "INVALID_REQUEST",
          },
        }),
        ok: false,
        status: 400,
      });

      await expect(client.searchNearby(40.7128, -74.006)).rejects.toThrow(
        "Invalid request"
      );
    });
  });

  describe("searchText", () => {
    it("searches for places by text query", async () => {
      const mockResponse = {
        places: [
          {
            displayName: {
              text: "Brooklyn Pickleball Courts",
            },
            formattedAddress: "456 Court St, Brooklyn, NY",
            id: "place_456",
            location: {
              latitude: 40.6782,
              longitude: -73.9442,
            },
            types: ["park"],
          },
        ],
      };
      mockFetch.mockResolvedValueOnce({
        json: () => mockResponse,
        ok: true,
      });

      const results = await client.searchText("pickleball courts brooklyn");

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Brooklyn Pickleball Courts");
      expect(results[0].address).toBe("456 Court St, Brooklyn, NY");

      const [[calledUrl, requestInit]] = mockFetch.mock.calls;
      expect(calledUrl).toBe(
        "https://places.googleapis.com/v1/places:searchText"
      );
      expect(JSON.parse(requestInit.body as string)).toMatchObject({
        textQuery: "pickleball courts brooklyn",
      });
    });

    it("includes location restriction when provided", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => ({
          places: [],
        }),
        ok: true,
      });

      await client.searchText("pickleball", 40.7128, -74.006);

      const [[, requestInit]] = mockFetch.mock.calls;
      expect(JSON.parse(requestInit.body as string)).toMatchObject({
        locationRestriction: {
          circle: {
            center: { latitude: 40.7128, longitude: -74.006 },
            radius: 50_000,
          },
        },
        rankPreference: "DISTANCE",
      });
    });
  });

  describe("getPlaceDetails", () => {
    it("fetches detailed place information", async () => {
      const mockResponse = {
        displayName: {
          text: "Queens Pickleball Park",
        },
        formattedAddress: "789 Park Blvd, Queens, NY 11101",
        id: "place_789",
        location: {
          latitude: 40.7282,
          longitude: -73.7949,
        },
        photos: [
          {
            heightPx: 800,
            name: "places/place_789/photos/photo_ref_789",
            widthPx: 1200,
          },
        ],
        rating: 4.8,
        regularOpeningHours: {
          openNow: true,
        },
        types: ["park", "sports_complex"],
        userRatingCount: 156,
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

      const [[calledUrl, requestInit]] = mockFetch.mock.calls;
      expect(calledUrl).toBe(
        "https://places.googleapis.com/v1/places/place_789"
      );
      expect(requestInit).toMatchObject({
        headers: expect.objectContaining({
          "X-Goog-Api-Key": "test_google_places_api_key",
          "X-Goog-FieldMask": expect.stringContaining("displayName"),
        }),
      });
    });

    it("throws error for invalid place ID", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => ({
          error: {
            message: "Place not found",
            status: "NOT_FOUND",
          },
        }),
        ok: false,
        status: 404,
      });

      await expect(client.getPlaceDetails("invalid_place")).rejects.toThrow(
        "Place not found"
      );
    });
  });

  describe("getPhotoUrl", () => {
    it("generates photo URL with correct parameters", () => {
      const url = client.getPhotoUrl(
        "places/place_123/photos/photo_ref_123",
        400
      );

      expect(url).toContain(
        "places.googleapis.com/v1/places/place_123/photos/photo_ref_123/media"
      );
      expect(url).toContain("maxWidthPx=400");
      expect(url).toContain("key=test_google_places_api_key");
    });

    it("uses default maxWidth when not specified", () => {
      const url = client.getPhotoUrl("places/place_123/photos/photo_ref_123");
      expect(url).toContain("maxWidthPx=400");
    });
  });

  describe("isPickleballParkResult classifier", () => {
    it("accepts venues with explicit pickleball in name", () => {
      expect(
        GooglePlacesClient.isPickleballParkResult({
          address: "100 Warehouse Way, Kensett, AR",
          latitude: 35.23,
          longitude: -91.67,
          name: "Warehouse Pickleball",
          placeId: "warehouse_1",
          types: ["sports_complex"],
        })
      ).toBe(true);

      expect(
        GooglePlacesClient.isPickleballParkResult({
          address: "North Little Rock, AR",
          latitude: 34.78,
          longitude: -92.27,
          name: "Burns Park Pickleball Courts",
          placeId: "burns_pickleball",
          types: ["park"],
        })
      ).toBe(true);
    });

    it("rejects non-pickleball sports venues like gyms, disc golf, track, and soccer", () => {
      // Gym / Fitness
      expect(
        GooglePlacesClient.isPickleballParkResult({
          address: "Searcy, AR",
          latitude: 35.25,
          longitude: -91.74,
          name: "Marbles Fitness LLC",
          placeId: "gym_1",
          types: ["fitness_center", "sports_activity_location"],
        })
      ).toBe(false);

      expect(
        GooglePlacesClient.isPickleballParkResult({
          address: "Searcy, AR",
          latitude: 35.25,
          longitude: -91.74,
          name: "Planet Fitness",
          placeId: "gym_2",
          types: ["gym"],
        })
      ).toBe(false);

      // Disc Golf
      expect(
        GooglePlacesClient.isPickleballParkResult({
          address: "Searcy, AR",
          latitude: 35.25,
          longitude: -91.74,
          name: "Harding University disc golf course",
          placeId: "disc_golf_1",
          types: ["park", "sports_activity_location"],
        })
      ).toBe(false);

      // Track & Field
      expect(
        GooglePlacesClient.isPickleballParkResult({
          address: "Searcy, AR",
          latitude: 35.25,
          longitude: -91.74,
          name: "Ted Lloyd Track and Field",
          placeId: "track_1",
          types: ["athletic_field"],
        })
      ).toBe(false);

      // Soccer Complex
      expect(
        GooglePlacesClient.isPickleballParkResult({
          address: "Searcy, AR",
          latitude: 35.25,
          longitude: -91.74,
          name: "Stevens Soccer Complex",
          placeId: "soccer_1",
          types: ["sports_complex"],
        })
      ).toBe(false);

      // Martial arts / Grappling
      expect(
        GooglePlacesClient.isPickleballParkResult({
          address: "Searcy, AR",
          latitude: 35.25,
          longitude: -91.74,
          name: "263 Grappling Club",
          placeId: "grappling_1",
          types: ["sports_club"],
        })
      ).toBe(false);

      expect(
        GooglePlacesClient.isPickleballParkResult({
          address: "Searcy, AR",
          latitude: 35.25,
          longitude: -91.74,
          name: "Searcy Fitness Kickboxing",
          placeId: "kickboxing_1",
          types: ["fitness_center"],
        })
      ).toBe(false);

      // Baseball
      expect(
        GooglePlacesClient.isPickleballParkResult({
          address: "Searcy, AR",
          latitude: 35.25,
          longitude: -91.74,
          name: "Harding Academy Baseball Field",
          placeId: "baseball_1",
          types: ["athletic_field"],
        })
      ).toBe(false);
    });

    it("accepts candidate municipal parks returned for pickleball query", () => {
      expect(
        GooglePlacesClient.isPickleballParkResult({
          address: "Berryhill Rd, Searcy, AR",
          isPickleballCandidate: true,
          latitude: 35.25,
          longitude: -91.74,
          name: "Berryhill Park",
          placeId: "berryhill_park",
          types: ["park"],
        })
      ).toBe(true);
    });

    it("accepts parks where user reviews mention pickleball", () => {
      expect(
        GooglePlacesClient.isPickleballParkResult({
          address: "123 Community Rd, Little Rock, AR",
          latitude: 34.74,
          longitude: -92.28,
          name: "MacArthur Park",
          placeId: "macarthur_park",
          reviewsSnippet:
            "Beautiful park! The new outdoor pickleball courts are well lit and maintained.",
          types: ["park"],
        })
      ).toBe(true);
    });

    it("accepts tennis courts and racquet clubs as dual-sport candidate venues", () => {
      expect(
        GooglePlacesClient.isPickleballParkResult({
          address: "Conway, AR",
          latitude: 35.08,
          longitude: -92.44,
          name: "UCA Tennis Courts",
          placeId: "uca_tennis",
          types: ["tennis_court"],
        })
      ).toBe(true);

      expect(
        GooglePlacesClient.isPickleballParkResult({
          address: "Little Rock, AR",
          latitude: 34.75,
          longitude: -92.36,
          name: "Little Rock Racquet Club",
          placeId: "lr_racquet",
          types: ["sports_club"],
        })
      ).toBe(true);
    });
  });
});
