import { env } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";

import app from "../index";
import { GooglePlacesClient } from "../lib/google-places";
import { mergeTrendingVenues } from "./trending";

type DatabaseVenue = Parameters<typeof mergeTrendingVenues>[0][number];
type GoogleVenue = Parameters<typeof mergeTrendingVenues>[1][number];

const databaseVenue = (overrides: Partial<DatabaseVenue>): DatabaseVenue =>
  ({
    addressLine1: null,
    addressLine2: null,
    city: "Bentonville",
    country: "US",
    courtCount: 8,
    createdAt: new Date(),
    createdByUserId: null,
    description: null,
    distanceMiles: 2,
    googlePlaceId: "db-place",
    id: "db-venue",
    latitude: 36.37,
    longitude: -94.2,
    name: "Osage Park Pickleball Courts",
    photoUrl: null,
    postalCode: null,
    radarPlaceId: null,
    rating: 4.8,
    source: "rallycasts",
    state: "AR",
    updatedAt: new Date(),
    userRatingsTotal: 50,
    venueType: "park",
    ...overrides,
  }) satisfies DatabaseVenue;

const googleVenue = (overrides: Partial<GoogleVenue>): GoogleVenue =>
  ({
    distanceMiles: 1,
    externalUrl: "https://maps.google.com",
    googlePlaceId: "google-place",
    id: "google:google-place",
    latitude: 36.36,
    longitude: -94.21,
    name: "Creekside Park Pickleball Courts",
    source: "google_places",
    ...overrides,
  }) satisfies GoogleVenue;

describe("trending venue discovery", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps Trending available when Google Places is not configured", async () => {
    const response = await app.request(
      "/api/v1/trending?lat=36.37&lng=-94.21",
      {},
      { ...env, GOOGLE_PLACES_API_KEY: "" }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ venues: [] });
  });

  it("returns Google Places pickleball parks for nearby trending venues", async () => {
    vi.spyOn(GooglePlacesClient.prototype, "searchNearby").mockResolvedValue([
      {
        address: "Berryhill Rd, Searcy, AR",
        isPickleballCandidate: true,
        latitude: 35.2468,
        longitude: -91.735,
        name: "Berryhill Park",
        openNow: true,
        placeId: "berryhill-place",
        rating: 4.7,
        types: ["park"],
        userRatingsTotal: 24,
      },
    ]);

    const response = await app.request(
      "/api/v1/trending?lat=35.2468&lng=-91.735&radius=50",
      {},
      { ...env, GOOGLE_PLACES_API_KEY: "google_test_key" }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.venues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          googlePlaceId: "berryhill-place",
          id: "google:berryhill-place",
          name: "Berryhill Park",
          source: "google_places",
        }),
      ])
    );
  });

  it("prefers RallyCasts records while mixing and distance-sorting Google parks", () => {
    const database = databaseVenue({ distanceMiles: 3 });
    const duplicateGoogle = googleVenue({
      distanceMiles: 0.5,
      googlePlaceId: "db-place",
      name: "Duplicate Google Record",
    });
    const nearbyGoogle = googleVenue({ distanceMiles: 1 });

    const result = mergeTrendingVenues(
      [database],
      [duplicateGoogle, nearbyGoogle]
    );

    expect(result).toHaveLength(2);
    expect(result.map((record) => record.id)).toEqual([
      nearbyGoogle.id,
      database.id,
    ]);
    expect(
      result.find((record) => record.googlePlaceId === "db-place")?.source
    ).toBe("rallycasts");
  });

  it("deduplicates normalized park names when a Google Place ID is missing", () => {
    const database = databaseVenue({ googlePlaceId: null });
    const duplicateGoogle = googleVenue({
      name: "Osage Park — Pickleball Courts!",
    });

    expect(mergeTrendingVenues([database], [duplicateGoogle])).toEqual([
      database,
    ]);
  });
});
