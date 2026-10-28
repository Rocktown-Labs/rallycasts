import { zValidator } from "@hono/zod-validator";
import { createDb } from "@rallycaststv/db";
import { pushToken } from "@rallycaststv/db/schema/domain";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { z } from "zod";

import { createId } from "../lib/ids";
import { countActivePushTokens } from "../lib/push";
import type { AppEnv } from "../lib/types";
import { requireAuth } from "../middleware/auth";

const registerSchema = z.object({
  deviceId: z.string().max(160).optional(),
  platform: z.enum(["ios", "android", "unknown"]).default("unknown"),
  token: z
    .string()
    .min(20)
    .max(300)
    .regex(
      /^(?:Exponent|Expo)PushToken\[[^\]]+\]$/u,
      "Expected an Expo push token"
    ),
});

const unregisterSchema = z.object({
  token: z.string().min(20).max(300),
});

/**
 * Device push tokens are tied to the signed-in user. A token is unique across
 * the platform, so signing into a second account on the same device moves the
 * token instead of creating a duplicate delivery path.
 */
export const pushRouter = new Hono<AppEnv>()
  .post(
    "/register",
    requireAuth,
    zValidator("json", registerSchema),
    async (c) => {
      const db = createDb(c.env.DB);
      const { user } = c.var.authSession;
      const data = c.req.valid("json");
      const now = new Date();

      await db
        .insert(pushToken)
        .values({
          createdAt: now,
          deviceId: data.deviceId,
          id: createId(),
          lastSeenAt: now,
          platform: data.platform,
          token: data.token,
          updatedAt: now,
          userId: user.id,
        })
        .onConflictDoUpdate({
          set: {
            deviceId: data.deviceId,
            disabledAt: null,
            lastSeenAt: now,
            platform: data.platform,
            updatedAt: now,
            userId: user.id,
          },
          target: pushToken.token,
        });

      return c.json({ registered: true }, HttpStatusCodes.OK);
    }
  )
  .post(
    "/unregister",
    requireAuth,
    zValidator("json", unregisterSchema),
    async (c) => {
      const db = createDb(c.env.DB);
      const { user } = c.var.authSession;
      const { token } = c.req.valid("json");

      await db
        .delete(pushToken)
        .where(and(eq(pushToken.token, token), eq(pushToken.userId, user.id)));

      return c.json({ unregistered: true }, HttpStatusCodes.OK);
    }
  )
  .get("/status", requireAuth, async (c) => {
    const db = createDb(c.env.DB);
    const { user } = c.var.authSession;
    const devices = await countActivePushTokens(db, user.id);
    return c.json({ devices }, HttpStatusCodes.OK);
  });
