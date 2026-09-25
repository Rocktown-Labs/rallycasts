import { zValidator } from "@hono/zod-validator";
import { createDb } from "@rallycaststv/db";
import { castingJob, castingJobOffer } from "@rallycaststv/db/schema/domain";
import { and, eq, or } from "drizzle-orm";
import { Hono } from "hono";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { z } from "zod";

import { createId } from "../lib/ids";
import type { AppEnv } from "../lib/types";
import { requireAuth } from "../middleware/auth";

const castingJobSchema = z
  .object({
    challengeId: z.string().min(1).optional(),
    currency: z.string().length(3).default("usd"),
    endsAt: z.coerce.date().optional(),
    notes: z.string().max(1000).optional(),
    priceCents: z.number().int().min(0).default(0),
    requestedHours: z.number().positive(),
    startsAt: z.coerce.date(),
    venueId: z.string().min(1).optional(),
  })
  .refine((data) => !data.endsAt || data.endsAt > data.startsAt, {
    message: "Casting job must end after it starts.",
    path: ["endsAt"],
  });

const statusSchema = z.object({
  status: z.enum([
    "draft",
    "requested",
    "offered",
    "accepted",
    "declined",
    "cancelled",
    "arrived",
    "recording",
    "uploading",
    "completed",
    "failed",
  ]),
});

const offerResponseSchema = z.object({
  status: z.enum(["accepted", "declined"]),
});

type CastingJobStatus = z.infer<typeof statusSchema>["status"];

/**
 * Role-based status transition matrix. The requester drives the booking
 * lifecycle (draft → requested → cancelled); the assigned caster drives the
 * on-site lifecycle (accepted → arrived → recording → uploading → completed).
 * Terminal states (completed, failed, cancelled, declined) have no exits.
 * Either party may cancel a non-terminal job.
 */
const REQUESTER_TRANSITIONS: Record<CastingJobStatus, CastingJobStatus[]> = {
  accepted: ["cancelled"],
  arrived: ["cancelled"],
  cancelled: [],
  completed: [],
  declined: [],
  draft: ["requested", "cancelled"],
  failed: [],
  offered: ["cancelled"],
  recording: ["cancelled"],
  requested: ["draft", "cancelled"],
  uploading: ["cancelled"],
};

const CASTER_TRANSITIONS: Record<CastingJobStatus, CastingJobStatus[]> = {
  accepted: ["arrived", "cancelled"],
  arrived: ["recording", "failed", "cancelled"],
  cancelled: [],
  completed: [],
  declined: [],
  draft: [],
  failed: [],
  offered: ["accepted", "declined"],
  recording: ["uploading", "failed", "cancelled"],
  requested: [],
  uploading: ["completed", "failed", "cancelled"],
};

export const castingJobsRouter = new Hono<AppEnv>()
  .use(requireAuth)
  .get("/", async (c) => {
    const db = createDb(c.env.DB);
    const { user } = c.var.authSession;
    const jobs = await db
      .select()
      .from(castingJob)
      .where(
        or(
          eq(castingJob.requesterUserId, user.id),
          eq(castingJob.casterUserId, user.id)
        )
      )
      .limit(100);

    return c.json({ jobs }, HttpStatusCodes.OK);
  })
  .post("/", zValidator("json", castingJobSchema), async (c) => {
    const db = createDb(c.env.DB);
    const { user } = c.var.authSession;
    const data = c.req.valid("json");
    const job = {
      id: createId(),
      requesterUserId: user.id,
      ...data,
    };

    await db.insert(castingJob).values(job);

    return c.json({ job }, HttpStatusCodes.CREATED);
  })
  .get("/:id", async (c) => {
    const db = createDb(c.env.DB);
    const { user } = c.var.authSession;
    const id = c.req.param("id");
    const [job] = await db
      .select()
      .from(castingJob)
      .where(
        and(
          eq(castingJob.id, id),
          or(
            eq(castingJob.requesterUserId, user.id),
            eq(castingJob.casterUserId, user.id)
          )
        )
      )
      .limit(1);

    if (!job) {
      return c.json(
        { message: "Casting job not found" },
        HttpStatusCodes.NOT_FOUND
      );
    }

    return c.json({ job }, HttpStatusCodes.OK);
  })
  .patch("/:id/status", zValidator("json", statusSchema), async (c) => {
    const db = createDb(c.env.DB);
    const { user } = c.var.authSession;
    const id = c.req.param("id");
    const { status } = c.req.valid("json");

    const [job] = await db
      .select({
        casterUserId: castingJob.casterUserId,
        requesterUserId: castingJob.requesterUserId,
        status: castingJob.status,
      })
      .from(castingJob)
      .where(
        and(
          eq(castingJob.id, id),
          or(
            eq(castingJob.requesterUserId, user.id),
            eq(castingJob.casterUserId, user.id)
          )
        )
      )
      .limit(1);

    if (!job) {
      return c.json(
        { message: "Casting job not found" },
        HttpStatusCodes.NOT_FOUND
      );
    }

    const isRequester = job.requesterUserId === user.id;
    const isCaster = job.casterUserId === user.id;
    if (job.status === status) {
      return c.json({ id, status }, HttpStatusCodes.OK);
    }
    const allowed = [
      ...(isRequester ? (REQUESTER_TRANSITIONS[job.status] ?? []) : []),
      ...(isCaster ? (CASTER_TRANSITIONS[job.status] ?? []) : []),
    ];
    if (!allowed.includes(status)) {
      return c.json(
        { message: "This status change is not allowed" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    await db
      .update(castingJob)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(castingJob.id, id));

    return c.json({ id, status }, HttpStatusCodes.OK);
  })
  .post(
    "/:id/offers/:offerId/respond",
    zValidator("json", offerResponseSchema),
    async (c) => {
      const db = createDb(c.env.DB);
      const { user } = c.var.authSession;
      const id = c.req.param("id");
      const offerId = c.req.param("offerId");
      const { status } = c.req.valid("json");
      const now = new Date();

      await db
        .update(castingJobOffer)
        .set({
          respondedAt: now,
          status,
          updatedAt: now,
        })
        .where(
          and(
            eq(castingJobOffer.id, offerId),
            eq(castingJobOffer.jobId, id),
            eq(castingJobOffer.casterUserId, user.id)
          )
        );

      if (status === "accepted") {
        await db
          .update(castingJob)
          .set({
            casterUserId: user.id,
            status: "accepted",
            updatedAt: now,
          })
          .where(eq(castingJob.id, id));
      }

      return c.json({ id: offerId, status }, HttpStatusCodes.OK);
    }
  );
