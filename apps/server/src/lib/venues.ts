import type { createDb } from "@rallycaststv/db";
import { venue } from "@rallycaststv/db/schema/domain";
import { eq, like, or } from "drizzle-orm";

import { syncVenueGeofence } from "./geofence-sync";
import { createGooglePlacesClient } from "./google-places";
import { createId } from "./ids";
import { syncVenueSearchDocument } from "./search-index";
import type { AppEnv } from "./types";

export function createVenueSlug(
  name: string,
  city?: string | null,
  state?: string | null
): string {
  const parts = [name, city, state].filter(Boolean).join(" ");
  return parts
    .toLowerCase()
    .replaceAll(/['’]/gu, "")
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/^-+|-+$/gu, "");
}

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
  getExecutionContext?: () => Pick<ExecutionContext, "waitUntil"> | undefined;
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

  const client = createGooglePlacesClient(env.GOOGLE_PLACES_API_KEY ?? "");
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

  if (getExecutionContext) {
    await syncVenueSearchDocument(getExecutionContext, db, env, createdVenue);
  }
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

// oxlint-disable-next-line complexity -- Venue resolution aggregates UUID, slug matching, Google Places import, and photo enrichment.
export const findVenueByIdOrSlug = async ({
  db,
  env,
  getExecutionContext,
  param,
  userId,
}: {
  db: ReturnType<typeof createDb>;
  env: AppEnv["Bindings"];
  getExecutionContext?: () => Pick<ExecutionContext, "waitUntil"> | undefined;
  param: string;
  userId?: string;
}): Promise<typeof venue.$inferSelect | null> => {
  const rawId = param.trim();
  const cleanGoogleId = rawId.startsWith("google:") ? rawId.slice(7) : rawId;

  // 1. Direct match by UUID id or googlePlaceId
  const directMatches = await db
    .select()
    .from(venue)
    .where(or(eq(venue.id, rawId), eq(venue.googlePlaceId, cleanGoogleId)))
    .limit(1);
  let record: typeof venue.$inferSelect | null = directMatches[0] ?? null;

  // 2. Slug match: match against computed slugs for candidate venues
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(
      rawId
    );

  if (!record && !isUuid) {
    const firstWord = rawId.split("-").find(Boolean) ?? "";

    const candidates = await db
      .select()
      .from(venue)
      .where(
        firstWord.length >= 2 ? like(venue.name, `%${firstWord}%`) : undefined
      )
      .limit(100);

    record =
      candidates.find((v) => {
        const fullSlug = createVenueSlug(v.name, v.city, v.state);
        const nameSlug = createVenueSlug(v.name);
        return fullSlug === rawId || nameSlug === rawId;
      }) ?? null;
  }

  // 3. Fallback: If it's a Google Place ID, attempt to import from Google Places
  if (
    !record &&
    env.GOOGLE_PLACES_API_KEY &&
    cleanGoogleId.length > 5 &&
    !cleanGoogleId.includes("-")
  ) {
    try {
      record = await findOrCreateVenueFromGooglePlace({
        db,
        env,
        getExecutionContext,
        placeId: cleanGoogleId,
        userId,
      });
    } catch {
      // Ignore
    }
  }

  // 4. Fallback search by slug text query on Google Places if enabled
  if (!record && env.GOOGLE_PLACES_API_KEY && rawId.includes("-") && !isUuid) {
    const searchQuery = rawId.replaceAll("-", " ");
    try {
      const client = createGooglePlacesClient(env.GOOGLE_PLACES_API_KEY);
      const places = await client.searchText(searchQuery);
      if (places[0]) {
        record = await findOrCreateVenueFromGooglePlace({
          db,
          env,
          getExecutionContext,
          placeId: places[0].placeId,
          userId,
        });
      }
    } catch {
      // Ignore
    }
  }

  // 5. Image enrichment: if venue has no photoUrl, attempt to find a photo via Google Places
  if (record && !record.photoUrl && env.GOOGLE_PLACES_API_KEY) {
    try {
      const client = createGooglePlacesClient(env.GOOGLE_PLACES_API_KEY);
      const searchRes = await client.searchText(
        `${record.name} ${record.city || ""} pickleball`
      );
      const photoPlace = searchRes.find((p) => p.photoUrl);
      if (photoPlace?.photoUrl) {
        await db
          .update(venue)
          .set({ photoUrl: photoPlace.photoUrl })
          .where(eq(venue.id, record.id));
        record = { ...record, photoUrl: photoPlace.photoUrl };
      }
    } catch {
      // Non-fatal
    }
  }

  return record ?? null;
};
