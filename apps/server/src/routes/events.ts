import { zValidator } from "@hono/zod-validator";
import { createDb } from "@rallycaststv/db";
import { event } from "@rallycaststv/db/schema/domain";
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { z } from "zod";

import { createId } from "../lib/ids";
import type { AppEnv } from "../lib/types";
import { requireAuth } from "../middleware/auth";

const eventFields = z.object({
  capacity: z.number().int().positive().optional(),
  description: z.string().max(2000).optional(),
  endsAt: z.coerce.date().optional(),
  eventType: z
    .enum(["open_play", "tournament", "clinic", "league"])
    .default("open_play"),
  name: z.string().min(1).max(160),
  startsAt: z.coerce.date(),
  status: z
    .enum(["draft", "published", "cancelled", "completed"])
    .default("draft"),
  venueId: z.string().min(1).optional(),
});

const eventSchema = eventFields.refine(
  (data) => !data.endsAt || data.endsAt > data.startsAt,
  {
    message: "Event must end after it starts.",
    path: ["endsAt"],
  }
);

const updateEventSchema = eventFields
  .partial()
  .refine(
    (data) => !data.endsAt || !data.startsAt || data.endsAt > data.startsAt,
    {
      message: "Event must end after it starts.",
      path: ["endsAt"],
    }
  );

export const eventsRouter = new Hono<AppEnv>()
  .get("/", async (c) => {
    const db = createDb(c.env.DB);
    const events = await db
      .select()
      .from(event)
      .where(eq(event.status, "published"))
      .orderBy(desc(event.startsAt))
      .limit(50);

    return c.json({ events }, HttpStatusCodes.OK);
  })
  .post("/", requireAuth, zValidator("json", eventSchema), async (c) => {
    const db = createDb(c.env.DB);
    const { user } = c.var.authSession;
    const data = c.req.valid("json");
    const record = {
      id: createId(),
      organizerUserId: user.id,
      ...data,
    };

    await db.insert(event).values(record);

    return c.json({ event: record }, HttpStatusCodes.CREATED);
  })
  .get("/:id", async (c) => {
    const db = createDb(c.env.DB);
    const [record] = await db
      .select()
      .from(event)
      .where(eq(event.id, c.req.param("id")))
      .limit(1);

    if (!record) {
      return c.json({ message: "Event not found" }, HttpStatusCodes.NOT_FOUND);
    }

    return c.json({ event: record }, HttpStatusCodes.OK);
  })
  .patch(
    "/:id",
    requireAuth,
    zValidator("json", updateEventSchema),
    async (c) => {
      const db = createDb(c.env.DB);
      const id = c.req.param("id");
      const data = c.req.valid("json");

      await db
        .update(event)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(event.id, id));

      return c.json({ id, ...data }, HttpStatusCodes.OK);
    }
  );
