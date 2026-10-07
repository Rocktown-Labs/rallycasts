import { zValidator } from "@hono/zod-validator";
import { createDb } from "@rallycaststv/db";
import {
  casterProfile,
  castingJob,
  castingJobOffer,
} from "@rallycaststv/db/schema/domain";
import { and, eq, or } from "drizzle-orm";
import type { Context } from "hono";
import { Hono } from "hono";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { z } from "zod";

import { createId } from "../lib/ids";
import type { AppEnv } from "../lib/types";
import { requireAuth } from "../middleware/auth";
import { stripeForm } from "../routes/stripe";

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

/** Grace period after a job's start time before a no-show re-dispatch. */
const NO_SHOW_GRACE_MS = 30 * 60 * 1000;

/**
 * Money side effects of a status change, extracted from the route so the
 * handler stays simple: completing a paid job pays the caster out of
 * escrow, cancelling a paid job refunds the requester. Returns an error
 * response when the money move fails, so the status never flips.
 */
const settleCastingStatusChange = async (
  c: Context<AppEnv>,
  db: ReturnType<typeof createDb>,
  jobId: string,
  job: {
    applicationFeeCents: number;
    casterUserId: null | string;
    chargedCents: number;
    currency: string;
    paidOutAt: Date | null;
    paymentStatus: string;
    priceCents: number;
    stripePaymentIntentId: null | string;
  },
  status: CastingJobStatus
): Promise<Response | null> => {
  const secret = c.env.STRIPE_SECRET_KEY;
  if (
    status === "completed" &&
    job.paymentStatus === "paid" &&
    !job.paidOutAt
  ) {
    if (!secret) {
      return c.json(
        { message: "Stripe is not configured for payouts" },
        HttpStatusCodes.SERVICE_UNAVAILABLE
      );
    }
    const [caster] = await db
      .select({ stripeConnectAccountId: casterProfile.stripeConnectAccountId })
      .from(casterProfile)
      .where(eq(casterProfile.userId, job.casterUserId ?? ""))
      .limit(1);
    if (!caster?.stripeConnectAccountId) {
      return c.json(
        {
          message:
            "The caster needs a payout account before this job can be completed.",
        },
        HttpStatusCodes.CONFLICT
      );
    }
    const payoutCents = job.chargedCents - job.applicationFeeCents;
    try {
      const transfer = await stripeForm<Record<string, unknown>>(
        "/v1/transfers",
        secret,
        {
          amount: String(payoutCents),
          currency: job.currency,
          destination: caster.stripeConnectAccountId,
        }
      );
      const transferId = typeof transfer.id === "string" ? transfer.id : null;
      await db
        .update(castingJob)
        .set({ paidOutAt: new Date(), stripeTransferId: transferId })
        .where(eq(castingJob.id, jobId));
      return null;
    } catch {
      return c.json(
        { message: "Caster payout failed; the job was not completed" },
        HttpStatusCodes.BAD_GATEWAY
      );
    }
  }

  // A cancelled job with money still in escrow gets refunded before the
  // status flips, so a failed refund can never strand a payment. Jobs
  // that already paid the caster are terminal and can never land here.
  if (
    status === "cancelled" &&
    job.paymentStatus === "paid" &&
    !job.paidOutAt &&
    job.stripePaymentIntentId
  ) {
    if (!secret) {
      return c.json(
        { message: "Stripe is not configured for refunds" },
        HttpStatusCodes.SERVICE_UNAVAILABLE
      );
    }
    try {
      await stripeForm<Record<string, unknown>>("/v1/refunds", secret, {
        payment_intent: job.stripePaymentIntentId,
      });
    } catch {
      return c.json(
        { message: "Refund failed; the job was not cancelled" },
        HttpStatusCodes.BAD_GATEWAY
      );
    }
    await db
      .update(castingJob)
      .set({
        paymentStatus: "refunded" as const,
        refundedAt: new Date(),
      })
      .where(eq(castingJob.id, jobId));
  }
  return null;
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
        applicationFeeCents: castingJob.applicationFeeCents,
        casterUserId: castingJob.casterUserId,
        chargedCents: castingJob.chargedCents,
        currency: castingJob.currency,
        paidOutAt: castingJob.paidOutAt,
        paymentStatus: castingJob.paymentStatus,
        priceCents: castingJob.priceCents,
        requesterUserId: castingJob.requesterUserId,
        status: castingJob.status,
        stripePaymentIntentId: castingJob.stripePaymentIntentId,
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

    const settlementError = await settleCastingStatusChange(
      c,
      db,
      id,
      job,
      status
    );
    if (settlementError) {
      return settlementError;
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
        // Paid jobs are dispatched only to payout-ready casters, and only
        // after the requester paid: the escrowed money must be transferable
        // when the job completes.
        const [job] = await db
          .select({
            paymentStatus: castingJob.paymentStatus,
            priceCents: castingJob.priceCents,
          })
          .from(castingJob)
          .where(eq(castingJob.id, id))
          .limit(1);
        if ((job?.priceCents ?? 0) > 0) {
          if (job?.paymentStatus !== "paid") {
            return c.json(
              {
                message:
                  "This job is waiting on the requester's payment. It can be claimed once paid.",
              },
              HttpStatusCodes.CONFLICT
            );
          }
          const [caster] = await db
            .select({
              stripeConnectAccountId: casterProfile.stripeConnectAccountId,
            })
            .from(casterProfile)
            .where(eq(casterProfile.userId, user.id))
            .limit(1);
          if (!caster?.stripeConnectAccountId) {
            return c.json(
              {
                message: "Set up payouts before claiming paid casting jobs.",
              },
              HttpStatusCodes.CONFLICT
            );
          }
        }
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
  )
  .post("/:id/redispatch", async (c) => {
    const db = createDb(c.env.DB);
    const { user } = c.var.authSession;
    const id = c.req.param("id");

    const [job] = await db
      .select({
        requesterUserId: castingJob.requesterUserId,
        startsAt: castingJob.startsAt,
        status: castingJob.status,
      })
      .from(castingJob)
      .where(eq(castingJob.id, id))
      .limit(1);
    if (!job || job.requesterUserId !== user.id) {
      return c.json(
        { message: "Casting job not found" },
        HttpStatusCodes.NOT_FOUND
      );
    }
    if (job.status !== "accepted") {
      return c.json(
        {
          message:
            "Only an accepted job can be re-dispatched. Give your caster time to arrive first.",
        },
        HttpStatusCodes.CONFLICT
      );
    }
    // No-show window: the caster has 30 minutes past the start time to
    // mark themselves arrived before the job can go back into the pool.
    if (Date.now() < job.startsAt.getTime() + NO_SHOW_GRACE_MS) {
      return c.json(
        {
          message:
            "The no-show window opens 30 minutes after the start time. Give your caster a chance to arrive.",
        },
        HttpStatusCodes.CONFLICT
      );
    }

    await db
      .update(castingJob)
      .set({
        casterUserId: null,
        status: "requested",
        updatedAt: new Date(),
      })
      .where(eq(castingJob.id, id));

    return c.json({ id, status: "requested" }, HttpStatusCodes.OK);
  });
