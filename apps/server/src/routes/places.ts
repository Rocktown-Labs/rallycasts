import { createDb } from "@rallycaststv/db";
import { Hono } from "hono";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { createGooglePlacesClient } from "../lib/google-places";
import type { AppEnv } from "../lib/types";
import { findOrCreateVenueFromGooglePlace } from "../lib/venues";
import { requireAuth } from "../middleware/auth";

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
      const db = createDb(c.env.DB);
      const createdVenue = await findOrCreateVenueFromGooglePlace({
        db,
        env: c.env,
        getExecutionContext: () => {
          try {
            return c.executionCtx;
          } catch {
            // Hono app.request tests may not provide an ExecutionContext.
          }
        },
        placeId,
        userId: c.var.authSession.user.id,
      });

      return c.json({ venue: createdVenue }, HttpStatusCodes.CREATED);
    } catch (error) {
      console.error("Create venue error:", error);
      return c.json(
        { error: "Failed to create venue from place" },
        HttpStatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  });
