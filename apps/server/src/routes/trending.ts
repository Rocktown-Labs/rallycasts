import { createDb } from "@rallycaststv/db";
import { user } from "@rallycaststv/db/schema/auth";
import {
  event,
  userProfile,
  venue,
  video,
} from "@rallycaststv/db/schema/domain";
import { and, desc, eq, gte, inArray, isNotNull, lte } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { Hono } from "hono";
import type { Context } from "hono";
import * as HttpStatusCodes from "stoker/http-status-codes";

import {
  getDisplaySponsorships,
  adsSecret,
  signDisplayTracking,
} from "../lib/ads";
import { haversineDistance } from "../lib/geo";
import { syncVenueGeofence } from "../lib/geofence-sync";
import {
  GooglePlacesClient,
  VENUE_DISCOVERY_VERSION,
} from "../lib/google-places";
import { createId } from "../lib/ids";
import { toPublicVenue, toPublicVideo } from "../lib/public-data";
import { syncVenueSearchDocument } from "../lib/search-index";
import type { AppEnv } from "../lib/types";

const DEFAULT_VENUE_RADIUS = 50;
const EVENT_RADIUS = 200;
const VIDEO_RADIUS = 500;
const PLAYER_RADIUS = 100;
const MILES_PER_LATITUDE_DEGREE = 69;
const MAX_LOCATION_CANDIDATES = 100;
const TRENDING_VENUE_LIMIT = 8;
const TRENDING_VENUE_VIEW_ALL_LIMIT = 48;
const TRENDING_VENUE_MAX_FETCH_LIMIT = 96;
const MIN_VENUE_RADIUS = 5;
const MAX_VENUE_RADIUS = 100;
const GOOGLE_NEARBY_RADIUS_CAP_METERS = 50_000;
const METERS_PER_MILE = 1609;

type DbVenue = typeof venue.$inferSelect;
type TrendingDbVenue = DbVenue & {
  distanceMiles?: number;
  source?: "rallycasts";
};
type TrendingVenue = TrendingDbVenue | GoogleDiscoveryVenue;
type GoogleDiscoveryVenue = Partial<DbVenue> & {
  distanceMiles: number;
  externalUrl: string;
  googlePlaceId: string;
  id: string;
  latitude: number;
  longitude: number;
  name: string;
  openNow?: boolean;
  source: "google_places";
};

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

const getGoogleMapsUrl = (placeId: string, lat: number, lng: number) => {
  const url = new URL("https://www.google.com/maps/search/");
  url.searchParams.set("api", "1");
  url.searchParams.set("query", `${lat},${lng}`);
  url.searchParams.set("query_place_id", placeId);
  return url.toString();
};

const parseCityState = (address: string) => {
  const parts = address.split(",").map((part) => part.trim());
  const stateZip = parts.at(-2) ?? "";
  const state = stateZip.match(/\b[A-Z]{2}\b/u)?.[0] ?? stateZip;
  const city = parts.length > 2 ? (parts.at(-3) ?? null) : null;

  return { city, state };
};

const getGoogleDiscoveryVenues = async (
  c: Context<AppEnv>,
  lat: number,
  lng: number,
  radiusMiles: number,
  limit: number
): Promise<GoogleDiscoveryVenue[]> => {
  if (!c.env.GOOGLE_PLACES_API_KEY) {
    return [];
  }

  try {
    const client = new GooglePlacesClient(c.env.GOOGLE_PLACES_API_KEY);
    const places = await client.searchNearby(
      lat,
      lng,
      Math.min(radiusMiles * METERS_PER_MILE, GOOGLE_NEARBY_RADIUS_CAP_METERS)
    );
    return places
      .map((place) => {
        const distanceMiles = haversineDistance(
          lat,
          lng,
          place.latitude,
          place.longitude
        );
        const location = parseCityState(place.address);

        return {
          city: location.city,
          country: "US",
          courtCount: null,
          distanceMiles,
          externalUrl: getGoogleMapsUrl(
            place.placeId,
            place.latitude,
            place.longitude
          ),
          googlePlaceId: place.placeId,
          id: `google:${place.placeId}`,
          latitude: place.latitude,
          longitude: place.longitude,
          name: place.name,
          openNow: place.openNow,
          photoUrl: place.photoUrl,
          rating: place.rating,
          source: "google_places" as const,
          state: location.state,
          userRatingsTotal: place.userRatingsTotal,
          venueType: "park" as const,
        };
      })
      .filter((place) => place.distanceMiles <= radiusMiles)
      .toSorted((left, right) => left.distanceMiles - right.distanceMiles)
      .slice(0, limit);
  } catch (error) {
    console.error("Google Places trending parks error:", error);
    return [];
  }
};

const normalizeVenueName = (name: string) =>
  name.toLowerCase().replaceAll(/[^a-z0-9]/gu, "");

export const mergeTrendingVenues = (
  databaseVenues: TrendingDbVenue[],
  googleVenues: GoogleDiscoveryVenue[],
  limit = TRENDING_VENUE_LIMIT
): TrendingVenue[] => {
  const databasePlaceIds = new Set(
    databaseVenues.flatMap((record) =>
      record.googlePlaceId ? [record.googlePlaceId] : []
    )
  );
  const databaseNames = new Set(
    databaseVenues.map((record) => normalizeVenueName(record.name))
  );
  const uniqueGoogleVenues = googleVenues.filter(
    (record) =>
      !databasePlaceIds.has(record.googlePlaceId) &&
      !databaseNames.has(normalizeVenueName(record.name))
  );

  return [...databaseVenues, ...uniqueGoogleVenues]
    .toSorted(
      (left, right) =>
        (left.distanceMiles ?? Number.POSITIVE_INFINITY) -
        (right.distanceMiles ?? Number.POSITIVE_INFINITY)
    )
    .slice(0, limit);
};

type TrendingDb = ReturnType<typeof createDb>;

const sponsoredTrendingEvents = async (db: TrendingDb, secret: string) => {
  const sponsorships = await getDisplaySponsorships(db, {});
  return Promise.all(
    sponsorships.slice(0, 2).map(async (sponsorship) => ({
      ...sponsorship.event,
      adCampaignId: sponsorship.campaign.id,
      adCreativeId: sponsorship.creative.id,
      adTracking: await signDisplayTracking(
        secret,
        sponsorship.campaign.id,
        sponsorship.creative.id
      ),
      sponsored: true as const,
    }))
  );
};

const fetchNearbyTrendingVenues = async (
  c: Context<AppEnv>,
  db: TrendingDb,
  lat: number,
  lng: number,
  venueRadius: number,
  venueFetchLimit: number
): Promise<TrendingVenue[]> => {
  // 1. Check local D1 database first within radius
  const nearbyVenueCandidates = await db
    .select()
    .from(venue)
    .where(
      locationBounds(lat, lng, venueRadius, venue.latitude, venue.longitude)
    )
    .limit(MAX_LOCATION_CANDIDATES);

  const dbVenues = nearbyVenueCandidates
    .filter((row) =>
      withinRadius(lat, lng, row.latitude, row.longitude, venueRadius)
    )
    .toSorted(byDistance(lat, lng))
    .slice(0, venueFetchLimit)
    .map((record) => ({
      ...record,
      distanceMiles: haversineDistance(
        lat,
        lng,
        record.latitude ?? 0,
        record.longitude ?? 0
      ),
      source: "rallycasts" as const,
    }));

  let googleVenues: GoogleDiscoveryVenue[] = [];

  // 2. If D1 has no cached venues in this radius (or cached venues are older than 6 months,
  // or they were cached by an older discovery strategy), query Google Places
  // to discover & cache them into D1.
  const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000;
  const isStale =
    dbVenues.length > 0 &&
    dbVenues.every((v) => {
      const updated = v.updatedAt ? new Date(v.updatedAt).getTime() : 0;
      return Date.now() - updated > SIX_MONTHS_MS;
    });

  // Discovery-produced rows record the strategy version that found them.
  // When the strategy changes (new query terms, filters), existing caches
  // refresh once even if they are otherwise fresh.
  const discoveredRows = dbVenues.filter((v) => v.googlePlaceId);
  const isOutdatedDiscovery =
    discoveredRows.length > 0 &&
    discoveredRows.every(
      (v) => (v.discoveryVersion ?? 1) < VENUE_DISCOVERY_VERSION
    );

  if (dbVenues.length === 0 || isStale || isOutdatedDiscovery) {
    googleVenues = await getGoogleDiscoveryVenues(
      c,
      lat,
      lng,
      venueRadius,
      venueFetchLimit
    );

    // Stamp the area's existing discovery rows as checked under the current
    // strategy so this refresh runs once, not on every request.
    if (googleVenues && discoveredRows.length > 0) {
      try {
        await db
          .update(venue)
          .set({ discoveryVersion: VENUE_DISCOVERY_VERSION })
          .where(
            inArray(
              venue.id,
              discoveredRows.map((v) => v.id)
            )
          );
      } catch (error) {
        console.error("Failed to stamp venue discovery version:", error);
      }
    }

    // 3. Persist newly discovered venues to D1 so future visits within 50mi use cached data
    if (googleVenues.length > 0) {
      const existingGoogleIds = new Set(
        nearbyVenueCandidates.flatMap((v) =>
          v.googlePlaceId ? [v.googlePlaceId] : []
        )
      );
      const toCache = googleVenues
        .filter((gv) => !existingGoogleIds.has(gv.googlePlaceId))
        .map((gv) => ({
          addressLine1: gv.addressLine1 || null,
          city: gv.city || null,
          country: "US",
          createdAt: new Date(),
          discoveryVersion: VENUE_DISCOVERY_VERSION,
          googlePlaceId: gv.googlePlaceId,
          id: createId(),
          latitude: gv.latitude,
          longitude: gv.longitude,
          name: gv.name,
          photoUrl: gv.photoUrl || null,
          rating: gv.rating || null,
          state: gv.state || null,
          userRatingsTotal: gv.userRatingsTotal || null,
          venueType: "park" as const,
        }));

      if (toCache.length > 0) {
        try {
          await db.insert(venue).values(toCache).onConflictDoNothing();

          if (c.env.RADAR_SECRET_KEY) {
            for (const v of toCache) {
              try {
                // oxlint-disable-next-line eslint/no-await-in-loop -- external API sync, sequential to respect rate limits
                await syncVenueGeofence(c.env.RADAR_SECRET_KEY, {
                  courtCount: 0,
                  id: v.id,
                  latitude: v.latitude,
                  longitude: v.longitude,
                  name: v.name,
                });
              } catch (radarError) {
                console.warn("Failed to sync venue to Radar:", radarError);
              }
            }
          }

          for (const v of toCache) {
            try {
              // oxlint-disable-next-line eslint/no-await-in-loop -- external API sync, sequential to respect rate limits
              await syncVenueSearchDocument(
                () => c.executionCtx,
                db,
                c.env,
                v as typeof venue.$inferSelect
              );
            } catch (searchError) {
              console.warn(
                "Failed to sync venue search document:",
                searchError
              );
            }
          }
        } catch (error) {
          console.error(
            "Failed to cache discovered Google venues to D1:",
            error
          );
        }
      }
    }
  }

  return mergeTrendingVenues(dbVenues, googleVenues, venueFetchLimit);
};

export const trendingRouter = new Hono<AppEnv>().get("/", async (c) => {
  const db = createDb(c.env.DB);
  const latParam = c.req.query("lat");
  const lngParam = c.req.query("lng");
  const radiusParam = c.req.query("radius");
  const venueLimitParam = c.req.query("venueLimit");
  const venuePageParam = c.req.query("venuePage");
  const venuePageSizeParam = c.req.query("venuePageSize");

  const lat = latParam ? Number(latParam) : undefined;
  const lng = lngParam ? Number(lngParam) : undefined;
  const parsedVenueRadius = radiusParam
    ? Number(radiusParam)
    : DEFAULT_VENUE_RADIUS;
  const venueRadius = Math.min(
    Math.max(
      Number.isFinite(parsedVenueRadius)
        ? parsedVenueRadius
        : DEFAULT_VENUE_RADIUS,
      MIN_VENUE_RADIUS
    ),
    MAX_VENUE_RADIUS
  );
  const parsedVenueLimit = venueLimitParam
    ? Math.trunc(Number(venueLimitParam))
    : TRENDING_VENUE_LIMIT;
  const requestedVenueLimit = Math.min(
    Math.max(
      Number.isFinite(parsedVenueLimit)
        ? parsedVenueLimit
        : TRENDING_VENUE_LIMIT,
      TRENDING_VENUE_LIMIT
    ),
    TRENDING_VENUE_VIEW_ALL_LIMIT
  );
  const parsedVenuePage = venuePageParam
    ? Math.trunc(Number(venuePageParam))
    : 1;
  const venuePage = Math.max(
    Number.isFinite(parsedVenuePage) ? parsedVenuePage : 1,
    1
  );
  const parsedVenuePageSize = venuePageSizeParam
    ? Math.trunc(Number(venuePageSizeParam))
    : requestedVenueLimit;
  const venuePageSize = Math.min(
    Math.max(
      Number.isFinite(parsedVenuePageSize)
        ? parsedVenuePageSize
        : requestedVenueLimit,
      TRENDING_VENUE_LIMIT
    ),
    TRENDING_VENUE_VIEW_ALL_LIMIT
  );
  const venueOffset = (venuePage - 1) * venuePageSize;
  const venueFetchLimit = Math.min(
    Math.max(requestedVenueLimit, venueOffset + venuePageSize + 1),
    TRENDING_VENUE_MAX_FETCH_LIMIT
  );

  const hasLocation =
    lat !== undefined &&
    !Number.isNaN(lat) &&
    lng !== undefined &&
    !Number.isNaN(lng);

  let videos: (typeof video.$inferSelect)[];
  let events: (typeof event.$inferSelect)[];
  let venues: TrendingVenue[];
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
    venues = await fetchNearbyTrendingVenues(
      c,
      db,
      lat,
      lng,
      venueRadius,
      venueFetchLimit
    );

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
          eq(video.status, "ready"),
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
            .where(
              and(eq(video.status, "ready"), eq(video.visibility, "public"))
            )
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
          eq(userProfile.onboardingStatus, "complete"),
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
            .where(
              and(
                eq(userProfile.isPlayer, true),
                eq(userProfile.onboardingStatus, "complete")
              )
            )
            .limit(6);
  } else {
    videos = await db
      .select()
      .from(video)
      .where(and(eq(video.status, "ready"), eq(video.visibility, "public")))
      .orderBy(desc(video.publishedAt))
      .limit(12);

    events = await db
      .select()
      .from(event)
      .where(eq(event.status, "published"))
      .orderBy(desc(event.startsAt))
      .limit(6);

    venues = await db.select().from(venue).limit(venueFetchLimit);
    if (venues.length === 0) {
      venues = await fetchNearbyTrendingVenues(
        c,
        db,
        35.2506,
        -91.7362,
        venueRadius,
        venueFetchLimit
      );
    }

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
      .where(
        and(
          eq(userProfile.isPlayer, true),
          eq(userProfile.onboardingStatus, "complete")
        )
      )
      .limit(6);
  }

  const venueTotalCount = venues.length;
  const paginatedVenues = venues.slice(
    venueOffset,
    venueOffset + venuePageSize
  );

  return c.json(
    {
      events,
      players,
      sponsoredEvents: await sponsoredTrendingEvents(db, adsSecret(c.env)),
      venuePagination: {
        hasNextPage: venueOffset + venuePageSize < venueTotalCount,
        hasPreviousPage: venuePage > 1,
        page: venuePage,
        pageSize: venuePageSize,
        totalCount: venueTotalCount,
      },
      venueRadius,
      venues: paginatedVenues.map(toPublicVenue),
      videos: videos.map(toPublicVideo),
    },
    HttpStatusCodes.OK
  );
});
