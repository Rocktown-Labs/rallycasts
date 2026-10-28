import { createDb } from "@rallycaststv/db";
import { user } from "@rallycaststv/db/schema/auth";
import {
  challenge,
  creatorFollow,
  post,
  profileLike,
  userProfile,
  venue,
  video,
} from "@rallycaststv/db/schema/domain";
import { and, desc, eq, like, notLike, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { Hono } from "hono";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { toPublicVideo } from "../lib/public-data";
import type { AppEnv } from "../lib/types";
import { optionalAuth, requireAuth } from "../middleware/auth";

const searchPattern = (query: string | undefined) => `%${query ?? ""}%`;
const challengerTable = alias(user, "challenger");
const challengedTable = alias(user, "challenged");
const partnerTable = alias(user, "partner");

/** Seeded demo accounts never belong in people discovery. */
const DEMO_EMAIL_PATTERN = "%@rallycasts.demo";

const findPlayerIdByUsername = async (
  db: ReturnType<typeof createDb>,
  rawUsername: string
) => {
  const username = rawUsername.startsWith("@")
    ? rawUsername.slice(1)
    : rawUsername;
  const [record] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.username, username))
    .limit(1);
  return record?.id ?? null;
};

export const playersRouter = new Hono<AppEnv>()
  .get("/", async (c) => {
    const db = createDb(c.env.DB);
    const query = c.req.query("q");
    const role = c.req.query("role");

    const conditions = [];

    if (role === "organizer") {
      conditions.push(eq(userProfile.isOrganizer, true));
    } else if (role === "caster") {
      conditions.push(eq(userProfile.isCaster, true));
    } else {
      conditions.push(eq(userProfile.isPlayer, true));
    }
    conditions.push(
      eq(userProfile.onboardingStatus, "complete"),
      // Demo personas exist to fill test brackets; hide them from discovery.
      notLike(user.email, DEMO_EMAIL_PATTERN)
    );

    if (query) {
      conditions.push(
        or(
          like(user.name, searchPattern(query)),
          like(user.username, searchPattern(query)),
          like(userProfile.homeCity, searchPattern(query))
        )
      );
    }

    const players = await db
      .select({
        bio: userProfile.bio,
        displayUsername: user.displayUsername,
        homeCity: userProfile.homeCity,
        homeState: userProfile.homeState,
        id: user.id,
        image: user.image,
        name: user.name,
        onboardingStatus: userProfile.onboardingStatus,
        skillLevel: userProfile.skillLevel,
        username: user.username,
      })
      .from(userProfile)
      .innerJoin(user, eq(userProfile.userId, user.id))
      .where(and(...conditions))
      .orderBy(desc(userProfile.updatedAt))
      .limit(50);

    return c.json({ players }, HttpStatusCodes.OK);
  })
  .get("/:username", optionalAuth, async (c) => {
    const db = createDb(c.env.DB);
    const rawUsername = c.req.param("username");
    const username = rawUsername.startsWith("@")
      ? rawUsername.slice(1)
      : rawUsername;

    const [player] = await db
      .select({
        bio: userProfile.bio,
        displayUsername: user.displayUsername,
        homeCity: userProfile.homeCity,
        homeState: userProfile.homeState,
        id: user.id,
        image: user.image,
        name: user.name,
        onboardingStatus: userProfile.onboardingStatus,
        skillLevel: userProfile.skillLevel,
        username: user.username,
      })
      .from(user)
      .leftJoin(userProfile, eq(userProfile.userId, user.id))
      .where(
        and(
          eq(user.username, username),
          eq(userProfile.onboardingStatus, "complete")
        )
      )
      .limit(1);

    if (!player) {
      return c.json({ message: "Player not found" }, HttpStatusCodes.NOT_FOUND);
    }

    const playerVideos = await db
      .select()
      .from(video)
      .where(
        and(
          eq(video.ownerUserId, player.id),
          eq(video.status, "ready"),
          eq(video.visibility, "public")
        )
      )
      .orderBy(desc(video.createdAt))
      .limit(20);

    const playerPhotos = await db
      .select()
      .from(video)
      .where(
        and(
          eq(video.ownerUserId, player.id),
          eq(video.mediaType, "photo"),
          eq(video.status, "ready"),
          eq(video.visibility, "public")
        )
      )
      .orderBy(desc(video.createdAt))
      .limit(20);

    const playerChallenges = await db
      .select({
        casted: challenge.isCasted,
        castingSplitMode: challenge.castingSplitMode,
        challengedName: challengedTable.name,
        challengedUserId: challenge.challengedUserId,
        challengerName: challengerTable.name,
        challengerUserId: challenge.challengerUserId,
        createdAt: challenge.createdAt,
        id: challenge.id,
        matchMode: challenge.matchMode,
        partnerName: partnerTable.name,
        partnerUserId: challenge.partnerUserId,
        result: challenge.result,
        scheduledAt: challenge.scheduledAt,
        status: challenge.status,
        updatedAt: challenge.updatedAt,
        venueId: challenge.venueId,
        venueName: venue.name,
      })
      .from(challenge)
      .leftJoin(
        challengerTable,
        eq(challenge.challengerUserId, challengerTable.id)
      )
      .leftJoin(
        challengedTable,
        eq(challenge.challengedUserId, challengedTable.id)
      )
      .leftJoin(partnerTable, eq(challenge.partnerUserId, partnerTable.id))
      .leftJoin(venue, eq(challenge.venueId, venue.id))
      .where(
        and(
          or(
            eq(challenge.challengerUserId, player.id),
            eq(challenge.challengedUserId, player.id)
          ),
          eq(challenge.status, "completed")
        )
      )
      .orderBy(desc(challenge.createdAt))
      .limit(20);

    const [followerStats] = await db
      .select({ count: sql<number>`count(*)` })
      .from(creatorFollow)
      .where(eq(creatorFollow.creatorUserId, player.id));
    const [likeStats] = await db
      .select({ count: sql<number>`count(*)` })
      .from(profileLike)
      .where(eq(profileLike.profileUserId, player.id));
    const viewerId = c.var.authSession?.user?.id;
    let isLiked = false;
    if (viewerId) {
      const [likeRecord] = await db
        .select({ userId: profileLike.userId })
        .from(profileLike)
        .where(
          and(
            eq(profileLike.userId, viewerId),
            eq(profileLike.profileUserId, player.id)
          )
        )
        .limit(1);
      isLiked = Boolean(likeRecord);
    }
    let isFollowing = false;
    if (viewerId) {
      const [followRecord] = await db
        .select({ followerUserId: creatorFollow.followerUserId })
        .from(creatorFollow)
        .where(
          and(
            eq(creatorFollow.followerUserId, viewerId),
            eq(creatorFollow.creatorUserId, player.id)
          )
        )
        .limit(1);
      isFollowing = Boolean(followRecord);
    }
    const matchCount = playerChallenges.filter(
      (record) => record.status === "completed" || record.result
    ).length;
    let wins = 0;
    let losses = 0;
    for (const record of playerChallenges) {
      if (record.result === "won") {
        if (record.challengerUserId === player.id) {
          wins += 1;
        } else {
          losses += 1;
        }
      }
      if (record.result === "lost") {
        if (record.challengerUserId === player.id) {
          losses += 1;
        } else {
          wins += 1;
        }
      }
    }

    const playerPosts = await db
      .select()
      .from(post)
      .where(eq(post.userId, player.id))
      .orderBy(desc(post.createdAt))
      .limit(20);

    return c.json(
      {
        challenges: playerChallenges,
        photos: playerPhotos.map(toPublicVideo),
        player,
        posts: playerPosts,
        stats: {
          followersCount: followerStats?.count ?? 0,
          isFollowing,
          isLiked,
          likesCount: likeStats?.count ?? 0,
          losses,
          matchCount,
          wins,
        },
        videos: playerVideos.map(toPublicVideo),
      },
      HttpStatusCodes.OK
    );
  })
  .post("/:username/like", requireAuth, async (c) => {
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    const playerId = await findPlayerIdByUsername(db, c.req.param("username"));
    if (!playerId) {
      return c.json({ message: "Player not found" }, HttpStatusCodes.NOT_FOUND);
    }
    if (playerId === authUser.id) {
      return c.json(
        { message: "You cannot like your own profile" },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    await db
      .insert(profileLike)
      .values({
        createdAt: new Date(),
        profileUserId: playerId,
        userId: authUser.id,
      })
      .onConflictDoNothing();

    const [stats] = await db
      .select({ count: sql<number>`count(*)` })
      .from(profileLike)
      .where(eq(profileLike.profileUserId, playerId));

    return c.json(
      { liked: true, likesCount: stats?.count ?? 0 },
      HttpStatusCodes.OK
    );
  })
  .delete("/:username/like", requireAuth, async (c) => {
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    const playerId = await findPlayerIdByUsername(db, c.req.param("username"));
    if (!playerId) {
      return c.json({ message: "Player not found" }, HttpStatusCodes.NOT_FOUND);
    }

    await db
      .delete(profileLike)
      .where(
        and(
          eq(profileLike.userId, authUser.id),
          eq(profileLike.profileUserId, playerId)
        )
      );

    const [stats] = await db
      .select({ count: sql<number>`count(*)` })
      .from(profileLike)
      .where(eq(profileLike.profileUserId, playerId));

    return c.json(
      { liked: false, likesCount: stats?.count ?? 0 },
      HttpStatusCodes.OK
    );
  });
