import { createDb } from "@rallycaststv/db";
import { venue } from "@rallycaststv/db/schema/domain";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import app from "../index";

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
    mockFetch.mockClear();
  });

  describe("GET /api/places/search", () => {
    it("returns places for valid search query", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => ({
          html_attributions: [],
          results: [
            {
              formatted_address: "123 Park Ave, New York, NY",
              geometry: {
                location: {
                  lat: 40.7128,
                  lng: -74.006,
                },
              },
              name: "NYC Pickleball Courts",
              place_id: "place_123",
              types: ["park"],
            },
          ],
          status: "OK",
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
      mockFetch.mockResolvedValueOnce({
        json: () => ({
          html_attributions: [],
          results: [
            {
              geometry: {
                location: {
                  lat: 40.7128,
                  lng: -74.006,
                },
              },
              name: "Nearby Park",
              photos: [
                {
                  height: 400,
                  html_attributions: [],
                  photo_reference: "photo_123",
                  width: 600,
                },
              ],
              place_id: "place_456",
              rating: 4.5,
              vicinity: "123 Park Ave",
            },
          ],
          status: "OK",
        }),
        ok: true,
      });

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
          html_attributions: [],
          result: {
            formatted_address: "789 Park Blvd, Queens, NY",
            geometry: {
              location: {
                lat: 40.7282,
                lng: -73.7949,
              },
            },
            name: "Queens Pickleball",
            photos: [
              {
                height: 800,
                html_attributions: [],
                photo_reference: "photo_789",
                width: 1200,
              },
            ],
            place_id: "place_789",
            rating: 4.8,
            types: ["park", "sports_complex"],
            user_ratings_total: 156,
          },
          status: "OK",
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
          html_attributions: [],
          result: {
            formatted_address: "123 Park Ave, New York, NY 10001",
            geometry: {
              location: {
                lat: 40.7128,
                lng: -74.006,
              },
            },
            name: "NYC Pickleball Park",
            photos: [
              {
                height: 800,
                html_attributions: [],
                photo_reference: "photo_123",
                width: 1200,
              },
            ],
            place_id: "place_new_123",
            rating: 4.5,
            user_ratings_total: 42,
          },
          status: "OK",
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

    it("returns 409 for existing venue", async () => {
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

      mockFetch.mockResolvedValueOnce({
        json: () => ({
          html_attributions: [],
          result: {
            formatted_address: "456 Park Ave, New York, NY",
            geometry: {
              location: {
                lat: 40.7128,
                lng: -74.006,
              },
            },
            name: "Existing Venue",
            place_id: "place_existing_456",
            user_ratings_total: 42,
          },
          status: "OK",
        }),
        ok: true,
      });

      const response = await createVenueRequest("place_existing_456");

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.error).toBe("Venue already exists");
    });

    it("returns 400 for missing placeId", async () => {
      const response = await createVenueRequest();

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("placeId is required");
    });
  });
});
