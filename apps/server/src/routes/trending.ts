import { createDb } from "@rallycaststv/db";
import { user } from "@rallycaststv/db/schema/auth";
import {
  event,
  userProfile,
  venue,
  video,
} from "@rallycaststv/db/schema/domain";
import { desc, eq, isNotNull, sql } from "drizzle-orm";
import { Hono } from "hono";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { EARTH_RADIUS_MILES } from "../lib/geo";
import type { AppEnv } from "../lib/types";

const VENUE_RADIUS = 50;
const EVENT_RADIUS = 200;
const VIDEO_RADIUS = 500;
const PLAYER_RADIUS = 100;

function distanceExpr(lat: number, lng: number) {
  return sql<number>`
    ${EARTH_RADIUS_MILES} * 2 * ASIN(
      SQRT(
        POWER(SIN((${lat} * ${Math.PI} / 180 - ${venue.latitude} * ${Math.PI} / 180) / 2), 2) +
        COS(${lat} * ${Math.PI} / 180) * COS(${venue.latitude} * ${Math.PI} / 180) *
        POWER(SIN((${lng} * ${Math.PI} / 180 - ${venue.longitude} * ${Math.PI} / 180) / 2), 2)
      )
    )
  `;
}

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
    const venueDistance = distanceExpr(lat, lng);

    // Nearby venues (strictly local, within 50 miles)
    venues = await db
      .select()
      .from(venue)
      .where(sql`${venueDistance} <= ${VENUE_RADIUS}`)
      .orderBy(sql`${venueDistance} ASC`)
      .limit(8);

    // Nearby videos (broader, within 500 miles - state/region level)
    const videoDistance = distanceExpr(lat, lng);
    const nearbyVideos = await db
      .select({ ...video })
      .from(video)
      .innerJoin(venue, eq(video.venueId, venue.id))
      .where(
        sql`${eq(video.visibility, "public")} AND ${isNotNull(video.venueId)} AND ${videoDistance} <= ${VIDEO_RADIUS}`
      )
      .orderBy(desc(video.publishedAt))
      .limit(12);

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
    const eventDistance = distanceExpr(lat, lng);
    const nearbyEvents = await db
      .select({ ...event })
      .from(event)
      .innerJoin(venue, eq(event.venueId, venue.id))
      .where(
        sql`${eq(event.status, "published")} AND ${isNotNull(event.venueId)} AND ${eventDistance} <= ${EVENT_RADIUS}`
      )
      .orderBy(desc(event.startsAt))
      .limit(6);

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
    const playerDistance = distanceExpr(lat, lng);
    const nearbyPlayers = await db
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
        sql`${eq(userProfile.isPlayer, true)} AND ${isNotNull(userProfile.homeLatitude)} AND ${isNotNull(userProfile.homeLongitude)} AND ${playerDistance} <= ${PLAYER_RADIUS}`
      )
      .orderBy(sql`${playerDistance} ASC`)
      .limit(6);

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
