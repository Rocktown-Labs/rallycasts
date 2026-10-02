import { env } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";

import app from "../index";

const LAT = 35.2506;
const LNG = -91.7362;

const placeResponse = (placeId: string, name: string) => ({
  places: [
    {
      displayName: { text: name },
      formattedAddress: "123 Court Ave, Searcy, AR 72143",
      id: placeId,
      location: { latitude: LAT + 0.01, longitude: LNG + 0.01 },
      rating: 4.6,
      types: ["park", "sports_complex"],
      userRatingCount: 12,
    },
  ],
});

const insertCachedVenue = async (
  id: string,
  overrides: { discoveryVersion?: number | null; name?: string } = {}
) => {
  await env.DB.prepare(
    "insert into venue (id, name, latitude, longitude, google_place_id, discovery_version, updated_at) values (?, ?, ?, ?, ?, ?, ?)"
  )
    .bind(
      id,
      overrides.name ?? id,
      LAT + 0.005,
      LNG + 0.005,
      `cached-place-${id}`,
      overrides.discoveryVersion ?? 1,
      new Date().toISOString()
    )
    .run();
};

describe("venue discovery cache versioning", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("refreshes areas cached under an older discovery strategy, then settles", async () => {
    // Fresh response per call: Response bodies can only be read once.
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        Promise.resolve(
          Response.json(
            placeResponse("fresh-place-1", "Searcy Pickleball Courts"),
            { status: 200 }
          )
        )
      );

    await insertCachedVenue("versioned-venue-old");

    const testEnv = { ...env, GOOGLE_PLACES_API_KEY: "test-google-places-key" };

    // First hit: the area is cached under discovery version 1, so Google
    // discovery must run and the fresh venue must be cached.
    const first = await app.request(
      `/api/v1/trending?lat=${LAT}&lng=${LNG}&radius=10`,
      {},
      testEnv
    );
    expect(first.status).toBe(200);
    const firstBody = (await first.json()) as {
      venues: { name: string }[];
    };
    expect(
      firstBody.venues.some(
        (venue) => venue.name === "Searcy Pickleball Courts"
      )
    ).toBe(true);
    expect(fetchSpy.mock.calls.length).toBeGreaterThan(0);

    const cachedRow = await env.DB.prepare(
      "select discovery_version from venue where google_place_id = ?"
    )
      .bind("cached-place-versioned-venue-old")
      .first<{ discovery_version: number | null }>();
    expect(cachedRow?.discovery_version).toBe(2);

    // Second hit: the area is now stamped with the current strategy, so no
    // Google discovery runs (the fetch spy throws if anything reaches out).
    const callsAfterFirstHit = fetchSpy.mock.calls.length;
    fetchSpy.mockImplementation(() => {
      throw new Error("Discovery must not re-run for a fresh cache");
    });
    const second = await app.request(
      `/api/v1/trending?lat=${LAT}&lng=${LNG}&radius=10`,
      {},
      testEnv
    );
    expect(second.status).toBe(200);
    expect(fetchSpy.mock.calls.length).toBe(callsAfterFirstHit);
  });

  it("does not re-run discovery for areas already cached by the current strategy", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() => {
      throw new Error("Discovery must not run for a current cache");
    });

    await insertCachedVenue("versioned-venue-current", {
      discoveryVersion: 2,
    });

    const response = await app.request(
      `/api/v1/trending?lat=${LAT}&lng=${LNG}&radius=10`,
      {},
      { ...env, GOOGLE_PLACES_API_KEY: "test-google-places-key" }
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      venues: { name: string }[];
    };
    expect(
      body.venues.some((venue) => venue.name === "versioned-venue-current")
    ).toBe(true);
  });
});
