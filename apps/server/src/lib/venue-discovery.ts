import type { createDb } from "@rallycaststv/db";
import { venue } from "@rallycaststv/db/schema/domain";

import { byDistance, locationBounds, withinRadius } from "./geo";
import { createGooglePlacesClient } from "./google-places";
import { createId } from "./ids";
import { syncVenueSearchDocument } from "./search-index";
import type { AppEnv } from "./types";
import { parseAddress } from "./venues";

export const DEFAULT_VENUE_RADIUS = 50;
const MAX_LOCATION_CANDIDATES = 100;
const METERS_PER_MILE = 1609;
const GOOGLE_NEARBY_RADIUS_CAP_METERS = 50_000;
const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000;

function getFallbackExecutionContext(): undefined {
  return undefined;
}

export async function discoverAndCacheAreaVenues({
  db,
  env,
  getExecutionContext,
  lat,
  lng,
  radiusMiles = DEFAULT_VENUE_RADIUS,
}: {
  db: ReturnType<typeof createDb>;
  env: AppEnv["Bindings"];
  getExecutionContext?: () => Pick<ExecutionContext, "waitUntil"> | undefined;
  lat: number;
  lng: number;
  radiusMiles?: number;
}) {
  // 1. Check local D1 database first within radius
  const nearbyCandidates = await db
    .select()
    .from(venue)
    .where(
      locationBounds(lat, lng, radiusMiles, venue.latitude, venue.longitude)
    )
    .limit(MAX_LOCATION_CANDIDATES);

  const dbVenues = nearbyCandidates
    .filter((row) =>
      withinRadius(lat, lng, row.latitude, row.longitude, radiusMiles)
    )
    .toSorted(byDistance(lat, lng));

  const isStale =
    dbVenues.length > 0 &&
    dbVenues.every((v) => {
      const updated = v.updatedAt ? new Date(v.updatedAt).getTime() : 0;
      return Date.now() - updated > SIX_MONTHS_MS;
    });

  // 2. If D1 already has cached venues in this area and they're not stale,
  // return immediately! Zero external API calls, zero cost, no overlap!
  if (dbVenues.length > 0 && !isStale) {
    return {
      cached: true,
      venues: dbVenues,
    };
  }

  // 3. First time in this area (or stale)! Discover venues via Google Places
  if (!env.GOOGLE_PLACES_API_KEY) {
    return {
      cached: false,
      venues: dbVenues,
    };
  }

  try {
    const placesClient = createGooglePlacesClient(env.GOOGLE_PLACES_API_KEY);
    const radiusMeters = Math.min(
      Math.round(radiusMiles * METERS_PER_MILE),
      GOOGLE_NEARBY_RADIUS_CAP_METERS
    );

    const places = await placesClient.searchNearby(lat, lng, radiusMeters);
    const existingGoogleIds = new Set(
      nearbyCandidates.flatMap((v) =>
        v.googlePlaceId ? [v.googlePlaceId] : []
      )
    );

    const toInsert = places
      .filter(
        (place) =>
          place.isPickleballCandidate && !existingGoogleIds.has(place.placeId)
      )
      .map((place) => {
        const location = parseAddress(place.address);
        return {
          addressLine1: place.address || null,
          city: location.city || null,
          country: "US",
          createdAt: new Date(),
          googlePlaceId: place.placeId,
          id: createId(),
          latitude: place.latitude,
          longitude: place.longitude,
          name: place.name,
          photoUrl: place.photoUrl || null,
          rating: place.rating || null,
          state: location.state || null,
          userRatingsTotal: place.userRatingsTotal || null,
          venueType: "park" as const,
        };
      });

    if (toInsert.length > 0) {
      await db.insert(venue).values(toInsert).onConflictDoNothing();

      // 4. Embed the spots once we get them!
      // Index into Vectorize search index with Gemini embeddings
      for (const inserted of toInsert) {
        try {
          await syncVenueSearchDocument(
            getExecutionContext ?? getFallbackExecutionContext,
            db,
            env,
            inserted as typeof venue.$inferSelect
          );
        } catch (embedError) {
          console.warn(
            "Failed to embed venue spot into search index:",
            embedError
          );
        }
      }
    }

    // Re-fetch cached venues from D1
    const refreshedCandidates = await db
      .select()
      .from(venue)
      .where(
        locationBounds(lat, lng, radiusMiles, venue.latitude, venue.longitude)
      )
      .limit(MAX_LOCATION_CANDIDATES);

    const updatedDbVenues = refreshedCandidates
      .filter((row) =>
        withinRadius(lat, lng, row.latitude, row.longitude, radiusMiles)
      )
      .toSorted(byDistance(lat, lng));

    return {
      cached: false,
      venues: updatedDbVenues,
    };
  } catch (error) {
    console.warn("Venue discovery failed:", error);
    return {
      cached: false,
      venues: dbVenues,
    };
  }
}
