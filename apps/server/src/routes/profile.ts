import { zValidator } from "@hono/zod-validator";
import { createDb } from "@rallycaststv/db";
import { user } from "@rallycaststv/db/schema/auth";
import { userProfile } from "@rallycaststv/db/schema/domain";
import { and, eq, ne } from "drizzle-orm";
import { Hono } from "hono";
import type { Context } from "hono";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { z } from "zod";

import { isPlatformAdminEmail } from "../lib/admin";
import { BloomFilter } from "../lib/bloom";
import {
  scheduleSearchDocumentIndex,
  upsertSearchDocument,
} from "../lib/search-index";
import type { AppEnv } from "../lib/types";
import { requireAuth } from "../middleware/auth";

const profileSchema = z.object({
  accountTier: z.enum(["free", "premium"]).optional(),
  age: z.number().int().min(1).max(120).optional(),
  bio: z.string().max(1000).optional(),
  homeCity: z.string().max(120).optional(),
  homeCountry: z.string().max(2).optional(),
  homeCourtName: z.string().max(200).optional(),
  homeLatitude: z.number().min(-90).max(90).optional(),
  homeLongitude: z.number().min(-180).max(180).optional(),
  homeState: z.string().max(80).optional(),
  isCaster: z.boolean().optional(),
  isOrganizer: z.boolean().optional(),
  isPlayer: z.boolean().optional(),
  name: z.string().min(1).max(100).optional(),
  onboardingStatus: z.enum(["pending", "complete"]).optional(),
  radarAddressId: z.string().max(160).optional(),
  radarPlaceId: z.string().max(160).optional(),
  skillLevel: z
    .enum(["beginner", "intermediate", "advanced", "pro"])
    .optional(),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(
      /^[a-zA-Z0-9_]+$/u,
      "Username can only contain alphanumeric characters and underscores"
    )
    .optional(),
});

const onboardingSchema = profileSchema.extend({
  onboardingStatus: z.enum(["pending", "complete"]).default("complete"),
});

const defaultProfile = (userId: string) => ({
  onboardingStatus: "pending" as const,
  userId,
});

const adminProfilePatch = {
  accountTier: "premium" as const,
  bio: "Official RallyCasts account for hosted events, featured brackets, and platform announcements.",
  isOrganizer: true,
  isPlayer: true,
  onboardingStatus: "complete" as const,
};

const indexProfile = async (
  c: Context<AppEnv>,
  db: ReturnType<typeof createDb>,
  profile: typeof userProfile.$inferSelect,
  userRecord: typeof user.$inferSelect
) => {
  if (profile.onboardingStatus !== "complete") {
    return;
  }
  const searchRecord = await upsertSearchDocument(db, {
    content: [
      profile.bio,
      profile.skillLevel ? `${profile.skillLevel} pickleball player` : null,
      profile.homeCourtName,
      profile.homeCity,
      profile.homeState,
    ]
      .filter(Boolean)
      .join(". "),
    entityId: userRecord.id,
    entityType: "profile",
    metadata: {
      homeCity: profile.homeCity,
      homeState: profile.homeState,
      skillLevel: profile.skillLevel,
    },
    title: userRecord.name,
  });
  scheduleSearchDocumentIndex(() => c.executionCtx, db, c.env, searchRecord);
};

const ensureAdminProfile = async (
  db: ReturnType<typeof createDb>,
  userId: string
) => {
  const record = {
    ...adminProfilePatch,
    updatedAt: new Date(),
    userId,
  };

  await db.insert(userProfile).values(record).onConflictDoUpdate({
    set: record,
    target: userProfile.userId,
  });

  const [profile] = await db
    .select()
    .from(userProfile)
    .where(eq(userProfile.userId, userId))
    .limit(1);

  return profile;
};

export const profileRouter = new Hono<AppEnv>()
  .use(requireAuth)
  .get("/check-username", async (c) => {
    const usernameQuery = c.req.query("username")?.trim().toLowerCase();
    if (!usernameQuery) {
      return c.json({ available: false }, HttpStatusCodes.BAD_REQUEST);
    }

    const db = createDb(c.env.DB);
    const allUsers = await db
      .select({ username: user.username })
      .from(user)
      .all();
    const bloom = new BloomFilter(1000, 3);
    for (const u of allUsers) {
      if (u.username) {
        bloom.add(u.username.toLowerCase());
      }
    }

    if (!bloom.has(usernameQuery)) {
      return c.json(
        { available: true, source: "bloom_filter" },
        HttpStatusCodes.OK
      );
    }

    const [existing] = await db
      .select()
      .from(user)
      .where(eq(user.username, usernameQuery))
      .limit(1);

    return c.json(
      { available: !existing, source: "database" },
      HttpStatusCodes.OK
    );
  })
  .get("/me", async (c) => {
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    const isPlatformAdmin = isPlatformAdminEmail(authUser.email, c.env);
    if (isPlatformAdmin) {
      const profile = await ensureAdminProfile(db, authUser.id);

      return c.json(
        { isPlatformAdmin, profile, user: authUser },
        HttpStatusCodes.OK
      );
    }

    const [profile] = await db
      .select()
      .from(userProfile)
      .where(eq(userProfile.userId, authUser.id))
      .limit(1);

    const [userRecord] = await db
      .select()
      .from(user)
      .where(eq(user.id, authUser.id))
      .limit(1);

    if (!profile) {
      const draft = defaultProfile(authUser.id);
      await db.insert(userProfile).values(draft).onConflictDoNothing();

      return c.json(
        {
          isPlatformAdmin,
          profile: {
            ...draft,
            accountTier: "free",
            isCaster: false,
            isOrganizer: false,
            isPlayer: true,
          },
          user: userRecord ?? authUser,
        },
        HttpStatusCodes.OK
      );
    }

    return c.json(
      { isPlatformAdmin, profile, user: userRecord ?? authUser },
      HttpStatusCodes.OK
    );
  })
  .patch("/me", zValidator("json", profileSchema), async (c) => {
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    const data = c.req.valid("json");

    // If username is provided, check if it's already taken by someone else
    if (data.username !== undefined) {
      const cleanUsername = data.username.trim().toLowerCase();
      const [existing] = await db
        .select()
        .from(user)
        .where(and(eq(user.username, cleanUsername), ne(user.id, authUser.id)))
        .limit(1);

      if (existing) {
        return c.json(
          { message: "Username is already taken" },
          HttpStatusCodes.CONFLICT
        );
      }
    }

    // Update user table details if provided
    if (data.name !== undefined || data.username !== undefined) {
      const updateData: Record<string, unknown> = {};
      if (data.name !== undefined) {
        updateData.name = data.name.trim();
      }
      if (data.username !== undefined) {
        updateData.username = data.username.trim().toLowerCase();
        updateData.displayUsername = data.username.trim();
      }
      await db.update(user).set(updateData).where(eq(user.id, authUser.id));
    }

    // Filter out user fields from the profile update
    const { name: _name, username: _username, ...profileData } = data;

    const isPlatformAdmin = isPlatformAdminEmail(authUser.email, c.env);
    const record = {
      ...profileData,
      ...(isPlatformAdmin ? adminProfilePatch : {}),
      updatedAt: new Date(),
      userId: authUser.id,
    };

    await db.insert(userProfile).values(record).onConflictDoUpdate({
      set: record,
      target: userProfile.userId,
    });

    const [profile] = await db
      .select()
      .from(userProfile)
      .where(eq(userProfile.userId, authUser.id))
      .limit(1);

    const [userRecord] = await db
      .select()
      .from(user)
      .where(eq(user.id, authUser.id))
      .limit(1);

    if (profile && userRecord) {
      await indexProfile(c, db, profile, userRecord);
    }

    return c.json(
      { profile, user: userRecord ?? authUser },
      HttpStatusCodes.OK
    );
  })
  .post("/onboarding", zValidator("json", onboardingSchema), async (c) => {
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    const data = c.req.valid("json");
    const isPlatformAdmin = isPlatformAdminEmail(authUser.email, c.env);
    const record = {
      ...data,
      ...(isPlatformAdmin ? adminProfilePatch : {}),
      updatedAt: new Date(),
      userId: authUser.id,
    };

    await db.insert(userProfile).values(record).onConflictDoUpdate({
      set: record,
      target: userProfile.userId,
    });

    const [profile] = await db
      .select()
      .from(userProfile)
      .where(eq(userProfile.userId, authUser.id))
      .limit(1);

    const [userRecord] = await db
      .select()
      .from(user)
      .where(eq(user.id, authUser.id))
      .limit(1);
    if (profile && userRecord) {
      await indexProfile(c, db, profile, userRecord);
    }

    return c.json({ profile }, HttpStatusCodes.OK);
  });
