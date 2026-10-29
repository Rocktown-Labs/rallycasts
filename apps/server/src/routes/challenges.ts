import { zValidator } from "@hono/zod-validator";
import { createDb } from "@rallycaststv/db";
import { user } from "@rallycaststv/db/schema/auth";
import { challenge, venue } from "@rallycaststv/db/schema/domain";
import { and, desc, eq, or } from "drizzle-orm";
import { Hono } from "hono";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { z } from "zod";

import { createId } from "../lib/ids";
import { createNotification } from "../lib/notifications";
import type { AppEnv } from "../lib/types";
import { requireAuth } from "../middleware/auth";

const createChallengeSchema = z.object({
  castingSplitMode: z
    .enum(["challenger", "challenged", "split_evenly"])
    .default("challenger"),
  challengedUserId: z.string().min(1),
  courtLabel: z.string().trim().max(80).optional(),
  isCasted: z.boolean().default(false),
  matchMode: z.enum(["singles", "doubles"]).default("singles"),
  message: z.string().trim().max(500).optional(),
  partnerUserId: z.string().min(1).optional(),
  scheduledAt: z.coerce.date(),
  tipCents: z.number().int().min(0).max(100_000).default(0),
  venueId: z.string().min(1).optional(),
  venueLabel: z.string().trim().min(1).max(160),
});

const responseSchema = z.object({
  response: z.enum(["accepted", "declined", "cancelled"]),
});

const resultSchema = z.object({
  result: z.enum(["won", "lost", "draw"]),
});

export const challengesRouter = new Hono<AppEnv>()
  .get("/me", requireAuth, async (c) => {
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    const records = await db
      .select({
        challenge,
        venue: { id: venue.id, name: venue.name },
      })
      .from(challenge)
      .leftJoin(venue, eq(challenge.venueId, venue.id))
      .where(
        or(
          eq(challenge.challengerUserId, authUser.id),
          eq(challenge.challengedUserId, authUser.id),
          eq(challenge.partnerUserId, authUser.id)
        )
      )
      .orderBy(desc(challenge.createdAt));
    return c.json({ challenges: records }, HttpStatusCodes.OK);
  })
  .post(
    "/",
    requireAuth,
    zValidator("json", createChallengeSchema),
    async (c) => {
      const db = createDb(c.env.DB);
      const { user: authUser } = c.var.authSession;
      const data = c.req.valid("json");
      if (data.challengedUserId === authUser.id) {
        return c.json(
          { message: "You cannot challenge yourself" },
          HttpStatusCodes.BAD_REQUEST
        );
      }
      if (data.scheduledAt.getTime() <= Date.now()) {
        return c.json(
          { message: "Challenge time must be in the future" },
          HttpStatusCodes.BAD_REQUEST
        );
      }
      const [challengedPlayer] = await db
        .select({ id: user.id, name: user.name })
        .from(user)
        .where(eq(user.id, data.challengedUserId))
        .limit(1);
      if (!challengedPlayer) {
        return c.json(
          { message: "Player not found" },
          HttpStatusCodes.NOT_FOUND
        );
      }

      const record = {
        ...data,
        casterTipCents: data.tipCents,
        challengerUserId: authUser.id,
        id: createId(),
        paymentStatus: data.isCasted
          ? ("pending" as const)
          : ("not_required" as const),
        status: "issued" as const,
        tipCents: undefined,
      };
      await db.insert(challenge).values(record);
      await createNotification(
        db,
        {
          actorUserId: authUser.id,
          body: `${authUser.name} proposed ${data.matchMode} at ${data.courtLabel ?? "a court"}.`,
          entityId: record.id,
          entityType: "challenge",
          href: `/u/challenges/${record.id}`,
          title: "New match challenge",
          type: "challenge",
          userId: challengedPlayer.id,
        },
        c.env
      );
      return c.json({ challenge: record }, HttpStatusCodes.CREATED);
    }
  )
  .patch(
    "/:id/respond",
    requireAuth,
    zValidator("json", responseSchema),
    async (c) => {
      const db = createDb(c.env.DB);
      const { user: authUser } = c.var.authSession;
      const id = c.req.param("id");
      const { response } = c.req.valid("json");
      const [record] = await db
        .select()
        .from(challenge)
        .where(eq(challenge.id, id))
        .limit(1);
      if (!record) {
        return c.json(
          { message: "Challenge not found" },
          HttpStatusCodes.NOT_FOUND
        );
      }
      const canCancel =
        response === "cancelled" && record.challengerUserId === authUser.id;
      const canRespond =
        response !== "cancelled" && record.challengedUserId === authUser.id;
      if (!canCancel && !canRespond) {
        return c.json({ message: "Forbidden" }, HttpStatusCodes.FORBIDDEN);
      }
      if (!(["issued", "accepted"] as string[]).includes(record.status)) {
        return c.json(
          { message: "Challenge can no longer be changed" },
          HttpStatusCodes.CONFLICT
        );
      }
      const [updated] = await db
        .update(challenge)
        .set({ status: response, updatedAt: new Date() })
        .where(and(eq(challenge.id, id), eq(challenge.status, record.status)))
        .returning();
      if (!updated) {
        return c.json(
          { message: "Challenge changed while responding" },
          HttpStatusCodes.CONFLICT
        );
      }
      const notificationUserId =
        authUser.id === record.challengerUserId
          ? record.challengedUserId
          : record.challengerUserId;
      if (notificationUserId) {
        await createNotification(
          db,
          {
            actorUserId: authUser.id,
            body: `${authUser.name} ${response} the match challenge.`,
            entityId: id,
            entityType: "challenge",
            href: `/u/challenges/${id}`,
            title: `Challenge ${response}`,
            type: "challenge",
            userId: notificationUserId,
          },
          c.env
        );
      }
      return c.json({ challenge: updated }, HttpStatusCodes.OK);
    }
  )
  .patch(
    "/:id/result",
    requireAuth,
    zValidator("json", resultSchema),
    async (c) => {
      const db = createDb(c.env.DB);
      const { user: authUser } = c.var.authSession;
      const id = c.req.param("id");
      const { result } = c.req.valid("json");
      const [record] = await db
        .select()
        .from(challenge)
        .where(eq(challenge.id, id))
        .limit(1);
      if (!record) {
        return c.json(
          { message: "Challenge not found" },
          HttpStatusCodes.NOT_FOUND
        );
      }
      const canReport =
        record.challengerUserId === authUser.id ||
        record.challengedUserId === authUser.id;
      if (!canReport) {
        return c.json({ message: "Forbidden" }, HttpStatusCodes.FORBIDDEN);
      }
      if (!["accepted", "completed"].includes(record.status)) {
        return c.json(
          { message: "Only accepted challenges can be scored" },
          HttpStatusCodes.CONFLICT
        );
      }
      const [updated] = await db
        .update(challenge)
        .set({ result, status: "completed", updatedAt: new Date() })
        .where(eq(challenge.id, id))
        .returning();
      const notificationUserId =
        authUser.id === record.challengerUserId
          ? record.challengedUserId
          : record.challengerUserId;
      if (notificationUserId) {
        await createNotification(
          db,
          {
            actorUserId: authUser.id,
            body: `${authUser.name} reported a ${result} result for your match challenge.`,
            entityId: id,
            entityType: "challenge",
            href: `/u/challenges`,
            title: "Challenge result posted",
            type: "challenge",
            userId: notificationUserId,
          },
          c.env
        );
      }
      return c.json({ challenge: updated }, HttpStatusCodes.OK);
    }
  );
