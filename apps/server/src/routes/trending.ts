import { createDb } from "@rallycaststv/db";
import { user } from "@rallycaststv/db/schema/auth";
import {
  event,
  userProfile,
  venue,
  video,
} from "@rallycaststv/db/schema/domain";
import { and, desc, eq, gte, isNotNull, lte } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { Hono } from "hono";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { haversineDistance } from "../lib/geo";
import type { AppEnv } from "../lib/types";

const VENUE_RADIUS = 50;
const EVENT_RADIUS = 200;
const VIDEO_RADIUS = 500;
const PLAYER_RADIUS = 100;
const MILES_PER_LATITUDE_DEGREE = 69;
const MAX_LOCATION_CANDIDATES = 100;

const getBoundingBox = (lat: number, lng: number, radiusMiles: number) => {
  const latitudeDelta = radiusMiles / MILES_PER_LATITUDE_DEGREE;
  const longitudeDelta =
    radiusMiles /
    (MILES_PER_LATITUDE_DEGREE *
      Math.max(Math.cos((lat * Math.PI) / 180), 0.01));

  return {
    maxLat: lat + latitudeDelta,
    maxLng: lng + longitudeDelta,
    minLat: lat - latitudeDelta,
    minLng: lng - longitudeDelta,
  };
};

const locationBounds = (
  lat: number,
  lng: number,
  radiusMiles: number,
  latitudeColumn: SQLiteColumn,
  longitudeColumn: SQLiteColumn
) => {
  const box = getBoundingBox(lat, lng, radiusMiles);

  return and(
    isNotNull(latitudeColumn),
    isNotNull(longitudeColumn),
    gte(latitudeColumn, box.minLat),
    lte(latitudeColumn, box.maxLat),
    gte(longitudeColumn, box.minLng),
    lte(longitudeColumn, box.maxLng)
  );
};

const byDistance =
  (lat: number, lng: number) =>
  <
    T extends {
      latitude: number | null;
      longitude: number | null;
    },
  >(
    left: T,
    right: T
  ) =>
    haversineDistance(lat, lng, left.latitude ?? 0, left.longitude ?? 0) -
    haversineDistance(lat, lng, right.latitude ?? 0, right.longitude ?? 0);

const withinRadius = (
  lat: number,
  lng: number,
  itemLat: number | null,
  itemLng: number | null,
  radiusMiles: number
) =>
  itemLat !== null &&
  itemLng !== null &&
  haversineDistance(lat, lng, itemLat, itemLng) <= radiusMiles;

export const trendingRouter = new Hono<AppEnv>().get("/", async (c) => {
  const db = createDb(c.env.DB);
  const latParam = c.req.query("lat");
  const lngParam = c.req.query("lng");

  const lat = latParam ? Number.parseFloat(latParam) : undefined;
  const lng = lngParam ? Number.parseFloat(lngParam) : undefined;

  const hasLocation =
    lat !== undefined &&
    !Number.isNaN(lat) &&
    lng !== undefined &&
    !Number.isNaN(lng);

  let videos: (typeof video.$inferSelect)[];
  let events: (typeof event.$inferSelect)[];
  let venues: (typeof venue.$inferSelect)[];
  let players: {
    bio: string | null;
    displayUsername: string | null;
    homeCity: string | null;
    homeState: string | null;
    id: string;
    image: string | null;
    name: string;
    skillLevel: string | null;
    username: string | null;
  }[];

  if (hasLocation) {
    // Nearby venues (strictly local, within 50 miles)
    const nearbyVenueCandidates = await db
      .select()
      .from(venue)
      .where(
        locationBounds(lat, lng, VENUE_RADIUS, venue.latitude, venue.longitude)
      )
      .limit(MAX_LOCATION_CANDIDATES);

    venues = nearbyVenueCandidates
      .filter((row) =>
        withinRadius(lat, lng, row.latitude, row.longitude, VENUE_RADIUS)
      )
      .toSorted(byDistance(lat, lng))
      .slice(0, 8);

    // Nearby videos (broader, within 500 miles - state/region level)
    const nearbyVideoCandidates = await db
      .select({
        latitude: venue.latitude,
        longitude: venue.longitude,
        video,
      })
      .from(video)
      .innerJoin(venue, eq(video.venueId, venue.id))
      .where(
        and(
          eq(video.visibility, "public"),
          isNotNull(video.venueId),
          locationBounds(
            lat,
            lng,
            VIDEO_RADIUS,
            venue.latitude,
            venue.longitude
          )
        )
      )
      .orderBy(desc(video.publishedAt))
      .limit(MAX_LOCATION_CANDIDATES);

    const nearbyVideos = nearbyVideoCandidates
      .filter((row) =>
        withinRadius(lat, lng, row.latitude, row.longitude, VIDEO_RADIUS)
      )
      .map((row) => row.video)
      .slice(0, 12);

    videos =
      nearbyVideos.length > 0
        ? nearbyVideos
        : await db
            .select()
            .from(video)
            .where(eq(video.visibility, "public"))
            .orderBy(desc(video.publishedAt))
            .limit(12);

    // Nearby events (regional, within 200 miles)
    const nearbyEventCandidates = await db
      .select({
        event,
        latitude: venue.latitude,
        longitude: venue.longitude,
      })
      .from(event)
      .innerJoin(venue, eq(event.venueId, venue.id))
      .where(
        and(
          eq(event.status, "published"),
          isNotNull(event.venueId),
          locationBounds(
            lat,
            lng,
            EVENT_RADIUS,
            venue.latitude,
            venue.longitude
          )
        )
      )
      .orderBy(desc(event.startsAt))
      .limit(MAX_LOCATION_CANDIDATES);

    const nearbyEvents = nearbyEventCandidates
      .filter((row) =>
        withinRadius(lat, lng, row.latitude, row.longitude, EVENT_RADIUS)
      )
      .map((row) => row.event)
      .slice(0, 6);

    events =
      nearbyEvents.length > 0
        ? nearbyEvents
        : await db
            .select()
            .from(event)
            .where(eq(event.status, "published"))
            .orderBy(desc(event.startsAt))
            .limit(6);

    // Nearby players (within 100 miles)
    const nearbyPlayerCandidates = await db
      .select({
        bio: userProfile.bio,
        displayUsername: user.displayUsername,
        homeCity: userProfile.homeCity,
        homeLatitude: userProfile.homeLatitude,
        homeLongitude: userProfile.homeLongitude,
        homeState: userProfile.homeState,
        id: user.id,
        image: user.image,
        name: user.name,
        skillLevel: userProfile.skillLevel,
        username: user.username,
      })
      .from(userProfile)
      .innerJoin(user, eq(userProfile.userId, user.id))
      .where(
        and(
          eq(userProfile.isPlayer, true),
          locationBounds(
            lat,
            lng,
            PLAYER_RADIUS,
            userProfile.homeLatitude,
            userProfile.homeLongitude
          )
        )
      )
      .limit(MAX_LOCATION_CANDIDATES);

    const nearbyPlayers = nearbyPlayerCandidates
      .filter((row) =>
        withinRadius(
          lat,
          lng,
          row.homeLatitude,
          row.homeLongitude,
          PLAYER_RADIUS
        )
      )
      .toSorted(
        (left, right) =>
          haversineDistance(
            lat,
            lng,
            left.homeLatitude ?? 0,
            left.homeLongitude ?? 0
          ) -
          haversineDistance(
            lat,
            lng,
            right.homeLatitude ?? 0,
            right.homeLongitude ?? 0
          )
      )
      .slice(0, 6)
      .map(
        ({
          homeLatitude: _homeLatitude,
          homeLongitude: _homeLongitude,
          ...row
        }) => row
      );

    players =
      nearbyPlayers.length > 0
        ? nearbyPlayers
        : await db
            .select({
              bio: userProfile.bio,
              displayUsername: user.displayUsername,
              homeCity: userProfile.homeCity,
              homeState: userProfile.homeState,
              id: user.id,
              image: user.image,
              name: user.name,
              skillLevel: userProfile.skillLevel,
              username: user.username,
            })
            .from(userProfile)
            .innerJoin(user, eq(userProfile.userId, user.id))
            .where(eq(userProfile.isPlayer, true))
            .limit(6);
  } else {
    videos = await db
      .select()
      .from(video)
      .where(eq(video.visibility, "public"))
      .orderBy(desc(video.publishedAt))
      .limit(12);

    events = await db
      .select()
      .from(event)
      .where(eq(event.status, "published"))
      .orderBy(desc(event.startsAt))
      .limit(6);

    venues = await db.select().from(venue).limit(8);

    players = await db
      .select({
        bio: userProfile.bio,
        displayUsername: user.displayUsername,
        homeCity: userProfile.homeCity,
        homeState: userProfile.homeState,
        id: user.id,
        image: user.image,
        name: user.name,
        skillLevel: userProfile.skillLevel,
        username: user.username,
      })
      .from(userProfile)
      .innerJoin(user, eq(userProfile.userId, user.id))
      .where(eq(userProfile.isPlayer, true))
      .limit(6);
  }

  return c.json(
    {
      events,
      players,
      venues,
      videos,
    },
    HttpStatusCodes.OK
  );
});
