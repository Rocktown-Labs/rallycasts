import { createDb } from "@rallycaststv/db";
import { user } from "@rallycaststv/db/schema/auth";
import {
  challenge,
  post,
  userProfile,
  video,
} from "@rallycaststv/db/schema/domain";
import { and, desc, eq, like, or } from "drizzle-orm";
import { Hono } from "hono";
import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppEnv } from "../lib/types";

const searchPattern = (query: string | undefined) => `%${query ?? ""}%`;

export const playersRouter = new Hono<AppEnv>()
  .get("/", async (c) => {
    const db = createDb(c.env.DB);
    const query = c.req.query("q");
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
      .where(
        query
          ? or(
              like(user.name, searchPattern(query)),
              like(user.username, searchPattern(query)),
              like(userProfile.homeCity, searchPattern(query))
            )
          : eq(userProfile.isPlayer, true)
      )
      .orderBy(desc(userProfile.updatedAt))
      .limit(50);

    return c.json({ players }, HttpStatusCodes.OK);
  })
  .get("/:username", async (c) => {
    const db = createDb(c.env.DB);
    const username = c.req.param("username");

    const [player] = await db
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
      .from(user)
      .leftJoin(userProfile, eq(userProfile.userId, user.id))
      .where(eq(user.username, username))
      .limit(1);

    if (!player) {
      return c.json({ message: "Player not found" }, HttpStatusCodes.NOT_FOUND);
    }

    const playerVideos = await db
      .select()
      .from(video)
      .where(eq(video.ownerUserId, player.id))
      .orderBy(desc(video.createdAt))
      .limit(20);

    const playerPhotos = await db
      .select()
      .from(video)
      .where(
        and(eq(video.ownerUserId, player.id), eq(video.mediaType, "photo"))
      )
      .orderBy(desc(video.createdAt))
      .limit(20);

    const playerChallenges = await db
      .select({
        casted: challenge.isCasted,
        castingSplitMode: challenge.castingSplitMode,
        challengedUserId: challenge.challengedUserId,
        challengerUserId: challenge.challengerUserId,
        createdAt: challenge.createdAt,
        id: challenge.id,
        matchMode: challenge.matchMode,
        message: challenge.message,
        partnerUserId: challenge.partnerUserId,
        result: challenge.result,
        scheduledAt: challenge.scheduledAt,
        status: challenge.status,
        updatedAt: challenge.updatedAt,
        venueId: challenge.venueId,
        videoUrl: challenge.videoUrl,
      })
      .from(challenge)
      .where(
        or(
          eq(challenge.challengerUserId, player.id),
          eq(challenge.challengedUserId, player.id)
        )
      )
      .orderBy(desc(challenge.createdAt))
      .limit(20);

    const playerPosts = await db
      .select()
      .from(post)
      .where(eq(post.userId, player.id))
      .orderBy(desc(post.createdAt))
      .limit(20);

    return c.json(
      {
        challenges: playerChallenges,
        photos: playerPhotos,
        player,
        posts: playerPosts,
        videos: playerVideos,
      },
      HttpStatusCodes.OK
    );
  });
