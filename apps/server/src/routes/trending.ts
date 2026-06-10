import { createDb } from "@rallycaststv/db";
import { user } from "@rallycaststv/db/schema/auth";
import {
  event,
  userProfile,
  venue,
  video,
} from "@rallycaststv/db/schema/domain";
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppEnv } from "../lib/types";

export const trendingRouter = new Hono<AppEnv>().get("/", async (c) => {
  const db = createDb(c.env.DB);
  const videos = await db
    .select()
    .from(video)
    .where(eq(video.visibility, "public"))
    .orderBy(desc(video.publishedAt))
    .limit(12);
  const venues = await db.select().from(venue).limit(8);
  const events = await db
    .select()
    .from(event)
    .where(eq(event.status, "published"))
    .orderBy(desc(event.startsAt))
    .limit(6);
  const players = await db
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
