import { createDb } from "@rallycaststv/db";
import { venue } from "@rallycaststv/db/schema/domain";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import app from "../index";
import { GooglePlacesClient } from "../lib/google-places";

// Mock the Google Places API
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

const signUp = async (): Promise<string> => {
  const username = `places${crypto.randomUUID().slice(0, 8)}`;
  const response = await app.request(
    "/api/auth/sign-up/email",
    {
      body: JSON.stringify({
        email: `${username}@example.com`,
        name: "Places Tester",
        password: "password-12345678",
        username,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    env
  );

  expect(response.status).toBe(200);
  return response.headers.get("set-cookie") ?? "";
};

const createVenueRequest = async (placeId?: string) => {
  const cookie = await signUp();
  return app.request(
    "/api/places/venues",
    {
      body: JSON.stringify(placeId ? { placeId } : {}),
      headers: { "Content-Type": "application/json", Cookie: cookie },
      method: "POST",
    },
    env
  );
};

describe("places routes", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/places/search", () => {
    it("returns places for valid search query", async () => {
      mockFetch.mockResolvedValue({
        json: () => ({
          places: [
            {
              displayName: {
                text: "NYC Pickleball Courts",
              },
              formattedAddress: "123 Park Ave, New York, NY",
              id: "place_123",
              location: {
                latitude: 40.7128,
                longitude: -74.006,
              },
              types: ["park"],
            },
          ],
        }),
        ok: true,
      });

      const response = await app.request(
        "/api/places/search?q=pickleball+courts",
        {},
        env
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.places).toHaveLength(1);
      expect(data.places[0].name).toBe("NYC Pickleball Courts");
    });

    it("returns 400 for empty query", async () => {
      const response = await app.request("/api/places/search?q=", {}, env);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Query parameter 'q' is required");
    });

    it("returns 400 for missing query parameter", async () => {
      const response = await app.request("/api/places/search", {}, env);

      expect(response.status).toBe(400);
    });

    it("handles Google API errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
      });

      const response = await app.request(
        "/api/places/search?q=pickleball",
        {},
        env
      );

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Failed to search places");
    });
  });

  describe("GET /api/places/nearby", () => {
    it("returns nearby pickleball places", async () => {
      vi.spyOn(GooglePlacesClient.prototype, "searchNearby").mockResolvedValue([
        {
          address: "123 Park Ave",
          latitude: 40.7128,
          longitude: -74.006,
          name: "Nearby Park",
          placeId: "place_456",
          rating: 4.5,
          types: ["park", "sports_complex"],
        },
      ]);

      const response = await app.request(
        "/api/places/nearby?lat=40.7128&lng=-74.006&radius=25000",
        {},
        env
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.places).toHaveLength(1);
      expect(data.places[0].name).toBe("Nearby Park");
    });

    it("returns 400 for missing lat/lng", async () => {
      const response = await app.request("/api/places/nearby", {}, env);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("lat");
    });

    it("returns 400 for missing lng", async () => {
      const response = await app.request(
        "/api/places/nearby?lat=40.7128",
        {},
        env
      );

      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/places/details/:placeId", () => {
    it("returns place details", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => ({
          displayName: {
            text: "Queens Pickleball",
          },
          formattedAddress: "789 Park Blvd, Queens, NY",
          id: "place_789",
          location: {
            latitude: 40.7282,
            longitude: -73.7949,
          },
          photos: [
            {
              heightPx: 800,
              name: "places/place_789/photos/photo_789",
              widthPx: 1200,
            },
          ],
          rating: 4.8,
          types: ["park", "sports_complex"],
          userRatingCount: 156,
        }),
        ok: true,
      });

      const response = await app.request(
        "/api/places/details/place_789",
        {},
        env
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.place.name).toBe("Queens Pickleball");
      expect(data.place.rating).toBe(4.8);
    });

    it("returns 400 for missing placeId", async () => {
      const response = await app.request("/api/places/details/", {}, env);
      expect(response.status).toBe(404);
    });
  });

  describe("POST /api/places/venues", () => {
    it("requires authentication", async () => {
      const response = await app.request(
        "/api/places/venues",
        {
          body: JSON.stringify({ placeId: "place_private" }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
        env
      );

      expect(response.status).toBe(401);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("creates a venue from Google place", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => ({
          displayName: {
            text: "NYC Pickleball Park",
          },
          formattedAddress: "123 Park Ave, New York, NY 10001",
          id: "place_new_123",
          location: {
            latitude: 40.7128,
            longitude: -74.006,
          },
          photos: [
            {
              heightPx: 800,
              name: "places/place_new_123/photos/photo_123",
              widthPx: 1200,
            },
          ],
          rating: 4.5,
          userRatingCount: 42,
        }),
        ok: true,
      });

      const response = await createVenueRequest("place_new_123");

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.venue.name).toBe("NYC Pickleball Park");
      expect(data.venue.googlePlaceId).toBe("place_new_123");
      expect(data.venue.latitude).toBe(40.7128);
      expect(data.venue.longitude).toBe(-74.006);
      expect(data.venue.rating).toBe(4.5);
      expect(data.venue.userRatingsTotal).toBe(42);

      // Verify in DB
      const db = createDb(env.DB);
      const venues = await db
        .select()
        .from(venue)
        .where(eq(venue.googlePlaceId, "place_new_123"))
        .all();
      expect(venues).toHaveLength(1);
    });

    it("returns an existing venue for an already validated place", async () => {
      const db = createDb(env.DB);
      const venueId = crypto.randomUUID();

      // Pre-create venue
      await db.insert(venue).values({
        country: "US",
        googlePlaceId: "place_existing_456",
        id: venueId,
        latitude: 40.7128,
        longitude: -74.006,
        name: "Existing Venue",
      });

      const response = await createVenueRequest("place_existing_456");

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.venue.id).toBe(venueId);
      expect(data.venue.name).toBe("Existing Venue");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("returns 400 for missing placeId", async () => {
      const response = await createVenueRequest();

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("placeId is required");
    });
  });
});
