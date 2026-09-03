import { zValidator } from "@hono/zod-validator";
import { createDb } from "@rallycaststv/db";
import {
  casterAvailability,
  casterProfile,
  userProfile,
} from "@rallycaststv/db/schema/domain";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { z } from "zod";

import { createId } from "../lib/ids";
import type { AppEnv } from "../lib/types";
import { requireAuth } from "../middleware/auth";

const casterProfileSchema = z.object({
  baseLatitude: z.number().min(-90).max(90).optional(),
  baseLongitude: z.number().min(-180).max(180).optional(),
  bio: z.string().max(1000).optional(),
  displayName: z.string().min(1).max(100).optional(),
  hourlyRateCents: z.number().int().min(0).default(0),
  serviceRadiusMiles: z.number().int().min(1).max(250).default(25),
});

const availabilitySchema = z
  .object({
    endsAt: z.coerce.date(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    startsAt: z.coerce.date(),
  })
  .refine((data) => data.endsAt > data.startsAt, {
    message: "Availability must end after it starts.",
    path: ["endsAt"],
  });

export const castersRouter = new Hono<AppEnv>()
  .get("/", async (c) => {
    const db = createDb(c.env.DB);
    const casters = await db
      .select({
        bio: casterProfile.bio,
        displayName: casterProfile.displayName,
        hourlyRateCents: casterProfile.hourlyRateCents,
        serviceRadiusMiles: casterProfile.serviceRadiusMiles,
        status: casterProfile.status,
        userId: casterProfile.userId,
      })
      .from(casterProfile)
      .where(eq(casterProfile.status, "active"))
      .limit(50);

    return c.json({ casters }, HttpStatusCodes.OK);
  })
  .get("/me", requireAuth, async (c) => {
    const db = createDb(c.env.DB);
    const { user } = c.var.authSession;
    const [profile] = await db
      .select()
      .from(casterProfile)
      .where(eq(casterProfile.userId, user.id))
      .limit(1);

    return c.json({ caster: profile ?? null }, HttpStatusCodes.OK);
  })
  .post(
    "/",
    requireAuth,
    zValidator("json", casterProfileSchema),
    async (c) => {
      const db = createDb(c.env.DB);
      const { user } = c.var.authSession;
      const data = c.req.valid("json");
      const now = new Date();

      await db
        .insert(userProfile)
        .values({
          isCaster: true,
          updatedAt: now,
          userId: user.id,
        })
        .onConflictDoUpdate({
          set: {
            isCaster: true,
            updatedAt: now,
          },
          target: userProfile.userId,
        });

      const profile = {
        ...data,
        status: "pending" as const,
        updatedAt: now,
        userId: user.id,
      };

      await db.insert(casterProfile).values(profile).onConflictDoUpdate({
        set: profile,
        target: casterProfile.userId,
      });

      return c.json({ caster: profile }, HttpStatusCodes.CREATED);
    }
  )
  .patch(
    "/me",
    requireAuth,
    zValidator("json", casterProfileSchema.partial()),
    async (c) => {
      const db = createDb(c.env.DB);
      const { user } = c.var.authSession;
      const data = c.req.valid("json");

      await db
        .update(casterProfile)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(casterProfile.userId, user.id));

      const [profile] = await db
        .select()
        .from(casterProfile)
        .where(eq(casterProfile.userId, user.id))
        .limit(1);

      return c.json({ caster: profile ?? null }, HttpStatusCodes.OK);
    }
  )
  .post(
    "/availability",
    requireAuth,
    zValidator("json", availabilitySchema),
    async (c) => {
      const db = createDb(c.env.DB);
      const { user } = c.var.authSession;
      const data = c.req.valid("json");
      const [profile] = await db
        .select({ userId: casterProfile.userId })
        .from(casterProfile)
        .where(eq(casterProfile.userId, user.id))
        .limit(1);
      if (!profile) {
        return c.json(
          { message: "Caster profile required" },
          HttpStatusCodes.FORBIDDEN
        );
      }
      const availability = {
        casterUserId: user.id,
        id: createId(),
        ...data,
      };

      await db.insert(casterAvailability).values(availability);

      return c.json({ availability }, HttpStatusCodes.CREATED);
    }
  )
  .get("/:id", async (c) => {
    const db = createDb(c.env.DB);
    const userId = c.req.param("id");
    const [profile] = await db
      .select({
        bio: casterProfile.bio,
        displayName: casterProfile.displayName,
        hourlyRateCents: casterProfile.hourlyRateCents,
        serviceRadiusMiles: casterProfile.serviceRadiusMiles,
        status: casterProfile.status,
        userId: casterProfile.userId,
      })
      .from(casterProfile)
      .where(
        and(
          eq(casterProfile.userId, userId),
          eq(casterProfile.status, "active")
        )
      )
      .limit(1);

    if (!profile) {
      return c.json({ message: "Caster not found" }, HttpStatusCodes.NOT_FOUND);
    }

    return c.json({ caster: profile }, HttpStatusCodes.OK);
  });
