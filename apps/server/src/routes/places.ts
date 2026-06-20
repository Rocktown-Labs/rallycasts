import { createDb } from "@rallycaststv/db";
import { venue } from "@rallycaststv/db/schema/domain";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { createGooglePlacesClient } from "../lib/google-places";
import type { AppEnv } from "../lib/types";
import { requireAuth } from "../middleware/auth";

function parseAddress(address: string): {
  city: string;
  postalCode: string;
  state: string;
} {
  const parts = address.split(",").map((p) => p.trim());
  const stateZip = parts.at(-2) || "";

  // Try to extract state and zip from "State ZIP" pattern
  const stateZipMatch = stateZip.match(/([A-Za-z\s]+)\s+(\d{5}(-\d{4})?)/u);
  const state = stateZipMatch?.[1]?.trim() ?? stateZip;
  const postalCode = stateZipMatch?.[2] ?? "";

  // City is usually the part before state/zip
  const city = parts.length > 2 ? parts.at(-3) || "" : "";

  return { city, postalCode, state };
}

export const placesRouter = new Hono<AppEnv>()
  .get("/search", async (c) => {
    const query = c.req.query("q") ?? "";
    const lat = c.req.query("lat");
    const lng = c.req.query("lng");

    if (!query.trim()) {
      return c.json(
        { error: "Query parameter 'q' is required" },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    try {
      const client = createGooglePlacesClient(c.env.GOOGLE_PLACES_API_KEY);
      const results = await client.searchText(
        query,
        lat ? Number(lat) : undefined,
        lng ? Number(lng) : undefined
      );

      return c.json({ places: results }, HttpStatusCodes.OK);
    } catch (error) {
      console.error("Google Places search error:", error);
      return c.json(
        { error: "Failed to search places" },
        HttpStatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  })
  .get("/nearby", async (c) => {
    const lat = c.req.query("lat");
    const lng = c.req.query("lng");
    const radius = c.req.query("radius");

    if (!lat || !lng) {
      return c.json(
        { error: "Parameters 'lat' and 'lng' are required" },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    try {
      const client = createGooglePlacesClient(c.env.GOOGLE_PLACES_API_KEY);
      const results = await client.searchNearby(
        Number(lat),
        Number(lng),
        radius ? Number(radius) : 50_000,
        "pickleball"
      );

      return c.json({ places: results }, HttpStatusCodes.OK);
    } catch (error) {
      console.error("Google Places nearby error:", error);
      return c.json(
        { error: "Failed to find nearby places" },
        HttpStatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  })
  .get("/details/:placeId", async (c) => {
    const placeId = c.req.param("placeId");

    if (!placeId) {
      return c.json(
        { error: "Place ID is required" },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    try {
      const client = createGooglePlacesClient(c.env.GOOGLE_PLACES_API_KEY);
      const result = await client.getPlaceDetails(placeId);

      return c.json({ place: result }, HttpStatusCodes.OK);
    } catch (error) {
      console.error("Google Places details error:", error);
      return c.json(
        { error: "Failed to get place details" },
        HttpStatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  })
  .post("/venues", requireAuth, async (c) => {
    const body = (await c.req.json()) as { placeId?: string };
    const { placeId } = body;

    if (!placeId) {
      return c.json(
        { error: "placeId is required" },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    try {
      const client = createGooglePlacesClient(c.env.GOOGLE_PLACES_API_KEY);
      const place = await client.getPlaceDetails(placeId);
      const db = createDb(c.env.DB);

      const { city, state, postalCode } = parseAddress(place.address);

      const newVenue = await db
        .insert(venue)
        .values({
          addressLine1: place.address,
          city,
          country: "US",
          googlePlaceId: placeId,
          id: crypto.randomUUID(),
          latitude: place.latitude,
          longitude: place.longitude,
          name: place.name,
          photoUrl: place.photoUrl,
          postalCode,
          rating: place.rating,
          state,
          userRatingsTotal: place.userRatingsTotal,
        })
        .onConflictDoNothing({ target: venue.googlePlaceId })
        .returning();

      if (!newVenue[0]) {
        const existing = await db
          .select()
          .from(venue)
          .where(eq(venue.googlePlaceId, placeId))
          .limit(1);

        return c.json(
          { error: "Venue already exists", venue: existing[0] },
          HttpStatusCodes.CONFLICT
        );
      }

      return c.json({ venue: newVenue[0] }, HttpStatusCodes.CREATED);
    } catch (error) {
      console.error("Create venue error:", error);
      return c.json(
        { error: "Failed to create venue from place" },
        HttpStatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  });
