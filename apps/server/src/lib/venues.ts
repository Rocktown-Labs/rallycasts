import type { createDb } from "@rallycaststv/db";
import { venue } from "@rallycaststv/db/schema/domain";
import { eq } from "drizzle-orm";

import { syncVenueGeofence } from "./geofence-sync";
import { createGooglePlacesClient } from "./google-places";
import { createId } from "./ids";
import { syncVenueSearchDocument } from "./search-index";
import type { AppEnv } from "./types";

export function parseAddress(address: string): {
  city: string;
  postalCode: string;
  state: string;
} {
  const parts = address.split(",").map((part) => part.trim());
  const stateZip = parts.at(-2) || "";

  const stateZipMatch = stateZip.match(/([A-Za-z\s]+)\s+(\d{5}(-\d{4})?)/u);
  const state = stateZipMatch?.[1]?.trim() ?? stateZip;
  const postalCode = stateZipMatch?.[2] ?? "";
  const city = parts.length > 2 ? parts.at(-3) || "" : "";

  return { city, postalCode, state };
}

export const findOrCreateVenueFromGooglePlace = async ({
  db,
  env,
  getExecutionContext,
  placeId,
  userId,
}: {
  db: ReturnType<typeof createDb>;
  env: AppEnv["Bindings"];
  getExecutionContext: () => Pick<ExecutionContext, "waitUntil"> | undefined;
  placeId: string;
  userId?: string;
}) => {
  const [existingVenue] = await db
    .select()
    .from(venue)
    .where(eq(venue.googlePlaceId, placeId))
    .limit(1);

  if (existingVenue) {
    return existingVenue;
  }

  const client = createGooglePlacesClient(env.GOOGLE_PLACES_API_KEY);
  const place = await client.getPlaceDetails(placeId);
  const { city, postalCode, state } = parseAddress(place.address);
  const [createdVenue] = await db
    .insert(venue)
    .values({
      addressLine1: place.address,
      city,
      country: "US",
      createdByUserId: userId,
      googlePlaceId: placeId,
      id: createId(),
      latitude: place.latitude,
      longitude: place.longitude,
      name: place.name,
      photoUrl: place.photoUrl,
      postalCode,
      rating: place.rating,
      state,
      userRatingsTotal: place.userRatingsTotal,
    })
    .returning();

  if (!createdVenue) {
    throw new Error("Failed to create venue from Google Place");
  }

  await syncVenueSearchDocument(getExecutionContext, db, env, createdVenue);
  if (env.RADAR_SECRET_KEY) {
    try {
      await syncVenueGeofence(env.RADAR_SECRET_KEY, {
        courtCount: createdVenue.courtCount ?? 0,
        id: createdVenue.id,
        latitude: createdVenue.latitude,
        longitude: createdVenue.longitude,
        name: createdVenue.name,
      });
    } catch (error) {
      console.error("Failed to sync Google venue to Radar:", error);
    }
  }

  return createdVenue;
};
