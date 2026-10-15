import { zValidator } from "@hono/zod-validator";
import { createDb } from "@rallycaststv/db";
import { league } from "@rallycaststv/db/schema/leagues";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { z } from "zod";

import { createId } from "../lib/ids";
import type { AppEnv } from "../lib/types";
import { requireAuth } from "../middleware/auth";

const leagueFields = z.object({
  casterMode: z.enum(["none", "optional", "required"]).default("optional"),
  entryFeeCents: z.number().int().min(0).max(1_000_000).default(0),
  format: z.enum([
    "singles",
    "doubles_fixed",
    "squad_ab",
    "mlp_draft",
    "ladder",
  ]),
  isVideoLeague: z.boolean().default(true),
  locationLabel: z.string().trim().min(1).max(160),
  matchWindowDays: z.number().int().min(1).max(30).default(7),
  maxUnits: z.number().int().min(2).max(128),
  name: z.string().trim().min(1).max(160),
  registrationMode: z
    .enum(["direct", "draft_live", "draft_async", "rolling_pool"])
    .default("direct"),
  seasonWeeks: z.number().int().min(1).max(52).default(6),
  startTrigger: z.enum(["on_full", "scheduled", "manual"]).default("on_full"),
  status: z
    .enum([
      "recruiting",
      "drafting",
      "active",
      "playoffs",
      "completed",
      "cancelled",
    ])
    .default("recruiting"),
});

const updateLeagueSchema = leagueFields.partial();

const getOwnedLeague = async (
  db: ReturnType<typeof createDb>,
  id: string,
  userId: string
) => {
  const [record] = await db
    .select()
    .from(league)
    .where(and(eq(league.id, id), eq(league.hostUserId, userId)))
    .limit(1);
  return record;
};

export const leaguesRouter = new Hono<AppEnv>()
  .get("/", async (c) => {
    const db = createDb(c.env.DB);
    const leagues = await db
      .select()
      .from(league)
      .where(eq(league.status, "recruiting"))
      .orderBy(desc(league.createdAt))
      .limit(50);

    return c.json({ leagues }, HttpStatusCodes.OK);
  })
  .get("/mine", requireAuth, async (c) => {
    const db = createDb(c.env.DB);
    const { user } = c.var.authSession;
    const leagues = await db
      .select()
      .from(league)
      .where(eq(league.hostUserId, user.id))
      .orderBy(desc(league.createdAt))
      .limit(100);

    return c.json({ leagues }, HttpStatusCodes.OK);
  })
  .post("/", requireAuth, zValidator("json", leagueFields), async (c) => {
    const db = createDb(c.env.DB);
    const { user } = c.var.authSession;
    const data = c.req.valid("json");
    const id = createId();
    const record = {
      ...data,
      createdAt: new Date(),
      currentUnits: 0,
      hostUserId: user.id,
      id,
      status: data.status,
      updatedAt: new Date(),
    };
    const [created] = await db.insert(league).values(record).returning();

    return c.json({ league: created }, HttpStatusCodes.CREATED);
  })
  .get("/:id", requireAuth, async (c) => {
    const db = createDb(c.env.DB);
    const { user } = c.var.authSession;
    const record = await getOwnedLeague(db, c.req.param("id"), user.id);
    if (!record) {
      return c.json({ message: "League not found" }, HttpStatusCodes.NOT_FOUND);
    }
    return c.json({ league: record }, HttpStatusCodes.OK);
  })
  .patch(
    "/:id",
    requireAuth,
    zValidator("json", updateLeagueSchema),
    async (c) => {
      const db = createDb(c.env.DB);
      const { user } = c.var.authSession;
      const id = c.req.param("id");
      const existing = await getOwnedLeague(db, id, user.id);
      if (!existing) {
        return c.json(
          { message: "League not found" },
          HttpStatusCodes.NOT_FOUND
        );
      }

      const [updated] = await db
        .update(league)
        .set({ ...c.req.valid("json"), updatedAt: new Date() })
        .where(eq(league.id, id))
        .returning();

      return c.json({ league: updated }, HttpStatusCodes.OK);
    }
  );
