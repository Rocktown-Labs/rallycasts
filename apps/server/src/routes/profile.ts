import { zValidator } from "@hono/zod-validator";
import { createDb } from "@rallycaststv/db";
import { userProfile } from "@rallycaststv/db/schema/domain";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { z } from "zod";

import { isPlatformAdminEmail } from "../lib/admin";
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
  onboardingStatus: z.enum(["pending", "complete"]).optional(),
  radarAddressId: z.string().max(160).optional(),
  radarPlaceId: z.string().max(160).optional(),
  skillLevel: z
    .enum(["beginner", "intermediate", "advanced", "pro"])
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
  .get("/me", async (c) => {
    const db = createDb(c.env.DB);
    const { user } = c.var.authSession;
    const isPlatformAdmin = isPlatformAdminEmail(user.email, c.env);
    if (isPlatformAdmin) {
      const profile = await ensureAdminProfile(db, user.id);

      return c.json({ isPlatformAdmin, profile, user }, HttpStatusCodes.OK);
    }

    const [profile] = await db
      .select()
      .from(userProfile)
      .where(eq(userProfile.userId, user.id))
      .limit(1);

    if (!profile) {
      const draft = defaultProfile(user.id);
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
          user,
        },
        HttpStatusCodes.OK
      );
    }

    return c.json({ isPlatformAdmin, profile, user }, HttpStatusCodes.OK);
  })
  .patch("/me", zValidator("json", profileSchema), async (c) => {
    const db = createDb(c.env.DB);
    const { user } = c.var.authSession;
    const data = c.req.valid("json");
    const isPlatformAdmin = isPlatformAdminEmail(user.email, c.env);
    const record = {
      ...data,
      ...(isPlatformAdmin ? adminProfilePatch : {}),
      updatedAt: new Date(),
      userId: user.id,
    };

    await db.insert(userProfile).values(record).onConflictDoUpdate({
      set: record,
      target: userProfile.userId,
    });

    const [profile] = await db
      .select()
      .from(userProfile)
      .where(eq(userProfile.userId, user.id))
      .limit(1);

    return c.json({ profile }, HttpStatusCodes.OK);
  })
  .post("/onboarding", zValidator("json", onboardingSchema), async (c) => {
    const db = createDb(c.env.DB);
    const { user } = c.var.authSession;
    const data = c.req.valid("json");
    const isPlatformAdmin = isPlatformAdminEmail(user.email, c.env);
    const record = {
      ...data,
      ...(isPlatformAdmin ? adminProfilePatch : {}),
      updatedAt: new Date(),
      userId: user.id,
    };

    await db.insert(userProfile).values(record).onConflictDoUpdate({
      set: record,
      target: userProfile.userId,
    });

    const [profile] = await db
      .select()
      .from(userProfile)
      .where(eq(userProfile.userId, user.id))
      .limit(1);

    return c.json({ profile }, HttpStatusCodes.OK);
  });
