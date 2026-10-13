import { zValidator } from "@hono/zod-validator";
import { createAuth } from "@rallycaststv/auth";
import { createDb } from "@rallycaststv/db";
import {
  adCampaign,
  adCreative,
  adDailyStat,
  adPayment,
  advertiser,
  event,
  organization,
  organizationMember,
  video,
} from "@rallycaststv/db/schema/domain";
import { and, desc, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { z } from "zod";

import { isPlatformAdminUser } from "../lib/admin";
import {
  BEACON_TTL_MS,
  MAX_PREROLL_SECONDS,
  MIN_DISPLAY_CPM_CENTS,
  MIN_VIDEO_CPM_CENTS,
  PREROLL_SKIP_AFTER_SECONDS,
  adsSecret,
  aggregateAdEvents,
  decideAds,
  hashViewer,
  prerollMediaUrlFor,
  resolvePrerollPlaybackId,
  signBeaconParams,
  verifyBeaconParams,
} from "../lib/ads";
import type { AdEventKind, AdEventMessage } from "../lib/ads";
import {
  buildEmptyVast,
  buildVastResponse,
  isAllowedVastMediaUrl,
} from "../lib/ads-vast";
import { createId } from "../lib/ids";
import { userProEntitled } from "../lib/subscriptions";
import type { AppEnv } from "../lib/types";
import { requireAuth } from "../middleware/auth";
import { requireVerifiedAuth } from "../middleware/security";
import { stripeForm } from "./stripe";

type Db = ReturnType<typeof createDb>;

const requireOrgManager = async (
  db: Db,
  organizationId: string,
  userId: string
) => {
  const [membership] = await db
    .select({ organization, role: organizationMember.role })
    .from(organizationMember)
    .innerJoin(
      organization,
      eq(organizationMember.organizationId, organization.id)
    )
    .where(
      and(
        eq(organizationMember.organizationId, organizationId),
        eq(organizationMember.userId, userId)
      )
    )
    .limit(1);
  if (!membership || membership.role === "editor") {
    return null;
  }
  return membership;
};

const getOrCreateAdvertiser = async (db: Db, organizationId: string) => {
  const [existing] = await db
    .select()
    .from(advertiser)
    .where(eq(advertiser.organizationId, organizationId))
    .limit(1);
  if (existing) {
    return existing;
  }
  const [created] = await db
    .insert(advertiser)
    .values({ id: createId(), organizationId })
    .onConflictDoNothing()
    .returning();
  if (created) {
    return created;
  }
  const [raced] = await db
    .select()
    .from(advertiser)
    .where(eq(advertiser.organizationId, organizationId))
    .limit(1);
  return raced ?? null;
};

type WaitUntilContext = Pick<ExecutionContext, "waitUntil">;

const enqueueAdEvent = async (
  c: { executionCtx: WaitUntilContext },
  env: AppEnv["Bindings"],
  db: Db,
  message: AdEventMessage
) => {
  if (env.ADS_EVENTS) {
    try {
      c.executionCtx.waitUntil(env.ADS_EVENTS.send(message));
      return;
    } catch {
      // Hono throws when an ExecutionContext is unavailable in local tests.
    }
  }
  await aggregateAdEvents(db, env, [message]);
};

const beaconBaseFor = (c: { req: { url: string } }) =>
  `${new URL(c.req.url).origin}/api/v1/ads/beacon`;

const signTrackingUrl = async (
  secret: string,
  base: string,
  params: { c: string; cr: string; ev: AdEventKind; p: "display" | "preroll" }
) => {
  const exp = String(Date.now() + BEACON_TTL_MS);
  const sig = await signBeaconParams(secret, { ...params, exp });
  const query = new URLSearchParams({
    c: params.c,
    cr: params.cr,
    ev: params.ev,
    exp,
    p: params.p,
    sig,
  });
  return `${base}?${query.toString()}`;
};

const campaignActionSchema = z.object({
  action: z.enum(["pause", "resume", "submit"]),
});

// Full editable field set for draft/rejected campaigns. The client sends the
// complete set (same shape as creation), so validation can be reused as-is.
const campaignEditSchema = z.object({
  city: z.string().max(120).optional(),
  cpmCents: z.number().int().optional(),
  creatives: z.array(z.record(z.string(), z.unknown())).min(1),
  dailyBudgetCents: z.number().int(),
  endsAt: z.string().optional(),
  eventId: z.string().min(1),
  name: z.string().min(1).max(160),
  placements: z.enum(["both", "display", "preroll"]),
  skillLevel: z
    .enum(["advanced", "beginner", "intermediate", "pro"])
    .optional(),
  startsAt: z.string().optional(),
  state: z.string().max(120).optional(),
  totalBudgetCents: z.number().int(),
  videoCpmCents: z.number().int().optional(),
});

const campaignPatchSchema = z.union([campaignActionSchema, campaignEditSchema]);

const topupSchema = z.object({
  amountCents: z.number().int().min(100).max(1_000_000),
});

const reviewSchema = z.object({
  approve: z.boolean(),
  reason: z.string().max(500).optional(),
});

export const adsRouter = new Hono<AppEnv>()
  .get("/vast", async (c) => {
    const db = createDb(c.env.DB);
    const placement = "preroll" as const;
    const context = {
      city: c.req.query("city") ?? null,
      limit: 1,
      placement,
      skillLevel: c.req.query("skillLevel") ?? null,
      state: c.req.query("state") ?? null,
      venueId:
        c.req.query("venueId") ??
        (await venueForVideo(db, c.req.query("videoId"))),
    };
    const [decided] = await decideAds(db, context);
    if (!decided || !c.env.BETTER_AUTH_SECRET) {
      return vastXml(c, buildEmptyVast());
    }

    // RallyCasts Pro is ad-free: entitled viewers never receive a preroll.
    if (c.env.BETTER_AUTH_SECRET) {
      const auth = createAuth(c.env.DB);
      const session = await auth.api.getSession({
        headers: c.req.raw.headers,
      });
      if (session?.user?.id) {
        const entitled = await userProEntitled(db, session.user.id);
        if (entitled) {
          return vastXml(c, buildEmptyVast());
        }
      }
    }

    const playbackId = await resolvePrerollPlaybackId(db, decided.creative);
    const mediaUrl = prerollMediaUrlFor(decided.creative, playbackId);
    if (!mediaUrl || !isAllowedVastMediaUrl(mediaUrl)) {
      return vastXml(c, buildEmptyVast());
    }

    const duration = await prerollDurationFor(db, decided.creative);
    const base = beaconBaseFor(c);
    const secret = adsSecret(c.env);
    const signFor = (ev: AdEventKind) =>
      signTrackingUrl(secret, base, {
        c: decided.campaign.id,
        cr: decided.creative.id,
        ev,
        p: placement,
      });
    const appOrigin = (c.env.CORS_ORIGIN?.split(",")[0] ?? "").trim();
    const xml = buildVastResponse({
      campaign: decided.campaign,
      clickThrough: `${appOrigin}/events/${decided.event.id}?utm_source=rallycasts_ads&utm_medium=preroll&utm_campaign=${decided.campaign.id}`,
      creative: decided.creative,
      durationSeconds: duration,
      impressionUrl: await signFor("impression"),
      mediaFileUrl: mediaUrl,
      skipAfterSeconds: PREROLL_SKIP_AFTER_SECONDS,
      title: decided.creative.title,
      trackingUrl: (trackingEvent) => `${base}?pending=${trackingEvent}`,
    });

    // Tracking URLs are async-signed; rebuild the quartile block with real URLs.
    const signedXml = await withSignedTracking(xml, base, signFor);
    return vastXml(c, signedXml);
  })
  .get("/beacon", async (c) => {
    const db = createDb(c.env.DB);
    const params = {
      c: c.req.query("c") ?? "",
      cr: c.req.query("cr") ?? "",
      ev: (c.req.query("ev") ?? "") as AdEventKind,
      exp: c.req.query("exp") ?? "",
      p: (c.req.query("p") ?? "") as "display" | "preroll",
      sig: c.req.query("sig"),
    };
    const validKinds: AdEventKind[] = [
      "click",
      "complete",
      "firstQuartile",
      "impression",
      "midpoint",
      "start",
      "thirdQuartile",
    ];
    if (
      !(params.p === "display" || params.p === "preroll") ||
      !validKinds.includes(params.ev) ||
      !(await verifyBeaconParams(adsSecret(c.env), params))
    ) {
      return c.json({ message: "Invalid beacon" }, HttpStatusCodes.BAD_REQUEST);
    }
    const viewerHash = await hashViewer(
      adsSecret(c.env),
      c.req.header("CF-Connecting-IP"),
      c.req.header("User-Agent")
    );
    await enqueueAdEvent(c, c.env, db, {
      at: Date.now(),
      campaignId: params.c,
      creativeId: params.cr,
      eid: createId(),
      kind: params.ev,
      placement: params.p,
      viewerHash,
    });
    return c.body(null, HttpStatusCodes.NO_CONTENT);
  })
  .post("/impressions", async (c) => {
    const db = createDb(c.env.DB);
    const body = (await c.req.json().catch(() => null)) as {
      c?: string;
      cr?: string;
      eid?: string;
      exp?: string;
      sig?: string;
    } | null;
    const signed = await verifySignedDisplayBeacon(c, db, body, "impression");
    if (!signed) {
      return c.json(
        { message: "Invalid impression" },
        HttpStatusCodes.BAD_REQUEST
      );
    }
    await enqueueAdEvent(c, c.env, db, {
      at: Date.now(),
      campaignId: signed.campaign.id,
      creativeId: signed.creative.id,
      eid: typeof body?.eid === "string" && body.eid ? body.eid : createId(),
      kind: "impression",
      placement: "display",
    });
    return c.json({ received: true }, HttpStatusCodes.ACCEPTED);
  })
  .post("/clicks", async (c) => {
    const db = createDb(c.env.DB);
    const body = (await c.req.json().catch(() => null)) as {
      c?: string;
      cr?: string;
      eid?: string;
      exp?: string;
      sig?: string;
    } | null;
    const signed = await verifySignedDisplayBeacon(c, db, body, "click");
    if (!signed) {
      return c.json({ message: "Invalid click" }, HttpStatusCodes.BAD_REQUEST);
    }
    await enqueueAdEvent(c, c.env, db, {
      at: Date.now(),
      campaignId: signed.campaign.id,
      creativeId: signed.creative.id,
      eid: typeof body?.eid === "string" && body.eid ? body.eid : createId(),
      kind: "click",
      placement: "display",
    });
    return c.json({ received: true }, HttpStatusCodes.ACCEPTED);
  })
  .get("/campaigns", requireAuth, async (c) => {
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    const organizationId = c.req.query("organizationId");
    if (!organizationId) {
      return c.json(
        { message: "organizationId is required" },
        HttpStatusCodes.BAD_REQUEST
      );
    }
    const isAdmin = await isPlatformAdminUser(db, authUser.id);
    const membership = await requireOrgManager(db, organizationId, authUser.id);
    if (!(isAdmin || membership)) {
      return c.json({ message: "Forbidden" }, HttpStatusCodes.FORBIDDEN);
    }
    const [account] = await db
      .select()
      .from(advertiser)
      .where(eq(advertiser.organizationId, organizationId))
      .limit(1);
    if (!account) {
      return c.json({ campaigns: [] }, HttpStatusCodes.OK);
    }
    const campaigns = await db
      .select()
      .from(adCampaign)
      .where(eq(adCampaign.advertiserId, account.id))
      .orderBy(desc(adCampaign.createdAt));

    // Delivery metrics and creatives come along so the Ads Manager can
    // render the campaigns table and detail view in one request.
    const campaignIds = campaigns.map((row) => row.id);
    const statRows =
      campaignIds.length > 0
        ? await db
            .select({
              campaignId: adDailyStat.campaignId,
              clicks: adDailyStat.clicks,
              impressions: adDailyStat.impressions,
            })
            .from(adDailyStat)
            .where(inArray(adDailyStat.campaignId, campaignIds))
        : [];
    const creativeRows =
      campaignIds.length > 0
        ? await db
            .select()
            .from(adCreative)
            .where(inArray(adCreative.campaignId, campaignIds))
        : [];
    const withDelivery = campaigns.map((row) => {
      let clicks = 0;
      let impressions = 0;
      for (const stat of statRows) {
        if (stat.campaignId === row.id) {
          clicks += stat.clicks;
          impressions += stat.impressions;
        }
      }
      return {
        ...row,
        clicks,
        creatives: creativeRows
          .filter((creative) => creative.campaignId === row.id)
          .map(({ campaignId: _campaignId, ...creative }) => creative),
        impressions,
      };
    });
    return c.json({ campaigns: withDelivery }, HttpStatusCodes.OK);
  })
  // oxlint-disable-next-line complexity -- Campaign creation validates budgets, flight, event ownership, and creatives.
  .post("/campaigns", requireAuth, requireVerifiedAuth, async (c) => {
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    const body = (await c.req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const organizationId =
      typeof body?.organizationId === "string" ? body.organizationId : "";
    const membership = await requireOrgManager(db, organizationId, authUser.id);
    if (!membership) {
      return c.json({ message: "Forbidden" }, HttpStatusCodes.FORBIDDEN);
    }

    const eventId = typeof body?.eventId === "string" ? body.eventId : "";
    const promotedEvent = await validateCampaignEvent(
      db,
      membership.organization.id,
      eventId
    );
    if (!promotedEvent.ok) {
      return c.json({ message: promotedEvent.error }, promotedEvent.status);
    }
    const eventRecord = promotedEvent.event;

    const validation = validateCampaignInput(body);
    if (!validation.ok) {
      return c.json({ message: validation.error }, HttpStatusCodes.BAD_REQUEST);
    }
    const creativeCheck = await validateCreatives(
      db,
      membership.organization.id,
      validation.creatives
    );
    if (!creativeCheck.ok) {
      return c.json(
        { message: creativeCheck.error },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    const account = await getOrCreateAdvertiser(db, membership.organization.id);
    if (!account || account.status !== "active") {
      return c.json(
        { message: "Advertiser account is not active" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    const campaignId = createId();
    await db.insert(adCampaign).values({
      advertiserId: account.id,
      city: validation.city,
      cpmCents: validation.cpmCents,
      createdByUserId: authUser.id,
      dailyBudgetCents: validation.dailyBudgetCents,
      endsAt: validation.endsAt,
      eventId: eventRecord.id,
      id: campaignId,
      name: validation.name,
      placements: validation.placements,
      skillLevel: validation.skillLevel,
      startsAt: validation.startsAt,
      state: validation.state,
      totalBudgetCents: validation.totalBudgetCents,
      venueId: validation.venueId,
      videoCpmCents: validation.videoCpmCents,
    });
    const creatives = creativeCheck.creatives.map((creative) => ({
      ...creative,
      campaignId,
      id: createId(),
    }));
    if (creatives.length > 0) {
      await db.insert(adCreative).values(creatives);
    }
    const [campaign] = await db
      .select()
      .from(adCampaign)
      .where(eq(adCampaign.id, campaignId))
      .limit(1);
    return c.json({ campaign }, HttpStatusCodes.CREATED);
  })
  .patch(
    "/campaigns/:id",
    requireAuth,
    requireVerifiedAuth,
    zValidator("json", campaignPatchSchema),
    async (c) => {
      const db = createDb(c.env.DB);
      const { user: authUser } = c.var.authSession;
      const campaignId = c.req.param("id");
      const body = c.req.valid("json");
      const [campaign] = await db
        .select({ adCampaign, advertiser })
        .from(adCampaign)
        .innerJoin(advertiser, eq(adCampaign.advertiserId, advertiser.id))
        .where(eq(adCampaign.id, campaignId))
        .limit(1)
        .then((rows) =>
          rows.map((row) => ({
            ...row.adCampaign,
            organizationId: row.advertiser.organizationId,
          }))
        );
      if (!campaign) {
        return c.json(
          { message: "Campaign not found" },
          HttpStatusCodes.NOT_FOUND
        );
      }
      const membership = await requireOrgManager(
        db,
        campaign.organizationId,
        authUser.id
      );
      if (!membership) {
        return c.json({ message: "Forbidden" }, HttpStatusCodes.FORBIDDEN);
      }

      if ("action" in body) {
        const result = await applyCampaignAction(
          db,
          campaignId,
          campaign,
          body.action
        );
        if ("error" in result) {
          return c.json({ message: result.error }, result.status);
        }
        return c.json({ status: result.status }, HttpStatusCodes.OK);
      }

      // Edit mode: only draft or rejected campaigns may be modified.
      if (!["draft", "rejected"].includes(campaign.status)) {
        return c.json(
          { message: "Only draft or rejected campaigns can be edited" },
          HttpStatusCodes.CONFLICT
        );
      }
      const promotedEvent = await validateCampaignEvent(
        db,
        membership.organization.id,
        body.eventId
      );
      if (!promotedEvent.ok) {
        return c.json({ message: promotedEvent.error }, promotedEvent.status);
      }
      const validation = validateCampaignInput(body);
      if (!validation.ok) {
        return c.json(
          { message: validation.error },
          HttpStatusCodes.BAD_REQUEST
        );
      }
      const creativeCheck = await validateCreatives(
        db,
        membership.organization.id,
        validation.creatives
      );
      if (!creativeCheck.ok) {
        return c.json(
          { message: creativeCheck.error },
          HttpStatusCodes.BAD_REQUEST
        );
      }

      await db
        .update(adCampaign)
        .set({
          // The edit payload is a full replacement of the editable fields,
          // so cleared optionals must be written as NULL — drizzle skips
          // undefined values, which would silently keep the old value.
          city: validation.city ?? null,
          cpmCents: validation.cpmCents,
          dailyBudgetCents: validation.dailyBudgetCents,
          endsAt: validation.endsAt ?? null,
          eventId: promotedEvent.event.id,
          name: validation.name,
          placements: validation.placements,
          skillLevel: validation.skillLevel ?? null,
          startsAt: validation.startsAt ?? null,
          state: validation.state ?? null,
          totalBudgetCents: validation.totalBudgetCents,
          updatedAt: new Date(),
          venueId: validation.venueId ?? null,
          videoCpmCents: validation.videoCpmCents,
        })
        .where(eq(adCampaign.id, campaignId));
      await db.delete(adCreative).where(eq(adCreative.campaignId, campaignId));
      if (creativeCheck.creatives.length > 0) {
        await db.insert(adCreative).values(
          creativeCheck.creatives.map((creative) => ({
            ...creative,
            campaignId,
            id: createId(),
          }))
        );
      }
      const [updated] = await db
        .select()
        .from(adCampaign)
        .where(eq(adCampaign.id, campaignId))
        .limit(1);
      return c.json({ campaign: updated }, HttpStatusCodes.OK);
    }
  )
  .post(
    "/campaigns/:id/topup",
    requireAuth,
    requireVerifiedAuth,
    zValidator("json", topupSchema),
    async (c) => {
      const secret = c.env.STRIPE_SECRET_KEY;
      if (!secret) {
        return c.json(
          { message: "Stripe is not configured" },
          HttpStatusCodes.SERVICE_UNAVAILABLE
        );
      }
      const db = createDb(c.env.DB);
      const { user: authUser } = c.var.authSession;
      const campaignId = c.req.param("id");
      const { amountCents } = c.req.valid("json");
      const [campaign] = await db
        .select({ adCampaign, advertiser })
        .from(adCampaign)
        .innerJoin(advertiser, eq(adCampaign.advertiserId, advertiser.id))
        .where(eq(adCampaign.id, campaignId))
        .limit(1)
        .then((rows) =>
          rows.map((row) => ({
            ...row.adCampaign,
            organizationId: row.advertiser.organizationId,
          }))
        );
      if (!campaign) {
        return c.json(
          { message: "Campaign not found" },
          HttpStatusCodes.NOT_FOUND
        );
      }
      const membership = await requireOrgManager(
        db,
        campaign.organizationId,
        authUser.id
      );
      if (!membership) {
        return c.json({ message: "Forbidden" }, HttpStatusCodes.FORBIDDEN);
      }

      const paymentId = createId();
      await db.insert(adPayment).values({
        amountCents,
        campaignId,
        id: paymentId,
        userId: authUser.id,
      });
      const appUrl =
        c.env.CORS_ORIGIN?.split(",")[0] ?? "http://localhost:3001";
      const session = await stripeForm<Record<string, unknown>>(
        "/v1/checkout/sessions",
        secret,
        {
          cancel_url: `${appUrl}/events/organizers/${membership.organization.slug}/manage?ad_topup=cancelled`,
          client_reference_id: paymentId,
          customer_email: authUser.email,
          "line_items[0][price_data][currency]": "usd",
          "line_items[0][price_data][product_data][name]": `Ad budget — ${campaign.name}`,
          "line_items[0][price_data][unit_amount]": String(amountCents),
          "line_items[0][quantity]": "1",
          "metadata[ad_campaign_id]": campaignId,
          "metadata[ad_payment_id]": paymentId,
          "metadata[type]": "ad_budget",
          mode: "payment",
          submit_type: "pay",
          success_url: `${appUrl}/events/organizers/${membership.organization.slug}/manage?ad_topup=success`,
        },
        `ad-topup/${paymentId}`
      );
      const sessionId = typeof session.id === "string" ? session.id : null;
      const checkoutUrl = typeof session.url === "string" ? session.url : null;
      if (!(sessionId && checkoutUrl)) {
        return c.json(
          { message: "Stripe returned an invalid checkout session" },
          HttpStatusCodes.BAD_GATEWAY
        );
      }
      await db
        .update(adPayment)
        .set({ stripeCheckoutSessionId: sessionId, updatedAt: new Date() })
        .where(eq(adPayment.id, paymentId));
      return c.json({ checkoutUrl }, HttpStatusCodes.CREATED);
    }
  )
  .post(
    "/campaigns/:id/review",
    requireAuth,
    zValidator("json", reviewSchema),
    async (c) => {
      const db = createDb(c.env.DB);
      const { user: authUser } = c.var.authSession;
      if (
        !authUser.emailVerified ||
        !(await isPlatformAdminUser(db, authUser.id))
      ) {
        return c.json({ message: "Forbidden" }, HttpStatusCodes.FORBIDDEN);
      }
      const campaignId = c.req.param("id");
      const body = c.req.valid("json");
      const [campaign] = await db
        .select()
        .from(adCampaign)
        .where(eq(adCampaign.id, campaignId))
        .limit(1);
      if (!campaign || campaign.status !== "pending_approval") {
        return c.json(
          { message: "Campaign is not awaiting review" },
          HttpStatusCodes.CONFLICT
        );
      }
      if (body.approve) {
        if (campaign.fundedCents <= 0) {
          return c.json(
            { message: "Campaign must be funded before activation" },
            HttpStatusCodes.CONFLICT
          );
        }
        await db
          .update(adCampaign)
          .set({
            rejectionReason: null,
            reviewedAt: new Date(),
            reviewedByUserId: authUser.id,
            status: "active",
            updatedAt: new Date(),
          })
          .where(eq(adCampaign.id, campaignId));
        return c.json({ status: "active" }, HttpStatusCodes.OK);
      }
      await db
        .update(adCampaign)
        .set({
          rejectionReason: body.reason ?? null,
          reviewedAt: new Date(),
          reviewedByUserId: authUser.id,
          status: "rejected",
          updatedAt: new Date(),
        })
        .where(eq(adCampaign.id, campaignId));
      return c.json({ status: "rejected" }, HttpStatusCodes.OK);
    }
  )
  .get("/campaigns/:id/stats", requireAuth, async (c) => {
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    const campaignId = c.req.param("id");
    const [campaign] = await db
      .select({ adCampaign, advertiser })
      .from(adCampaign)
      .innerJoin(advertiser, eq(adCampaign.advertiserId, advertiser.id))
      .where(eq(adCampaign.id, campaignId))
      .limit(1)
      .then((rows) =>
        rows.map((row) => ({
          ...row.adCampaign,
          organizationId: row.advertiser.organizationId,
        }))
      );
    if (!campaign) {
      return c.json(
        { message: "Campaign not found" },
        HttpStatusCodes.NOT_FOUND
      );
    }
    const isAdmin = await isPlatformAdminUser(db, authUser.id);
    const membership = await requireOrgManager(
      db,
      campaign.organizationId,
      authUser.id
    );
    if (!(isAdmin || membership)) {
      return c.json({ message: "Forbidden" }, HttpStatusCodes.FORBIDDEN);
    }
    const rows = await db
      .select()
      .from(adDailyStat)
      .where(eq(adDailyStat.campaignId, campaignId))
      .orderBy(desc(adDailyStat.day))
      .limit(30);
    const totals = { clicks: 0, impressions: 0, spentCents: 0 };
    for (const row of rows) {
      totals.clicks += row.clicks;
      totals.impressions += row.impressions;
      totals.spentCents += row.spentCents;
    }
    return c.json(
      {
        byDay: rows,
        campaign: {
          dailyBudgetCents: campaign.dailyBudgetCents,
          fundedCents: campaign.fundedCents,
          id: campaign.id,
          name: campaign.name,
          spentCents: campaign.spentCents,
          status: campaign.status,
          totalBudgetCents: campaign.totalBudgetCents,
        },
        totals,
      },
      HttpStatusCodes.OK
    );
  })
  .get("/pending", requireAuth, async (c) => {
    const db = createDb(c.env.DB);
    const { user: authUser } = c.var.authSession;
    if (
      !authUser.emailVerified ||
      !(await isPlatformAdminUser(db, authUser.id))
    ) {
      return c.json({ message: "Forbidden" }, HttpStatusCodes.FORBIDDEN);
    }
    const rows = await db
      .select({ adCampaign, event, organizationId: advertiser.organizationId })
      .from(adCampaign)
      .innerJoin(advertiser, eq(adCampaign.advertiserId, advertiser.id))
      .innerJoin(event, eq(adCampaign.eventId, event.id))
      .where(eq(adCampaign.status, "pending_approval"))
      .orderBy(desc(adCampaign.createdAt))
      .limit(50);
    return c.json({ campaigns: rows }, HttpStatusCodes.OK);
  });

export { getDisplaySponsorships } from "../lib/ads";

const vastXml = (
  c: {
    text: (
      body: string,
      status: 200,
      headers: Record<string, string>
    ) => Response;
  },
  xml: string
) =>
  c.text(xml, 200, {
    "Cache-Control": "no-store",
    "Content-Type": "application/xml",
  });

const venueForVideo = async (db: Db, videoId: string | undefined) => {
  if (!videoId) {
    return;
  }
  const [row] = await db
    .select({ venueId: video.venueId })
    .from(video)
    .where(eq(video.id, videoId))
    .limit(1);
  return row?.venueId ?? undefined;
};

const prerollDurationFor = async (
  db: Db,
  creative: typeof adCreative.$inferSelect
) => {
  if (!creative.videoId) {
    return 15;
  }
  const [row] = await db
    .select({ durationSeconds: video.durationSeconds })
    .from(video)
    .where(eq(video.id, creative.videoId))
    .limit(1);
  return Math.min(row?.durationSeconds ?? 15, MAX_PREROLL_SECONDS);
};

/** Replace placeholder quartile URLs with HMAC-signed tracking URLs. */
const withSignedTracking = async (
  xml: string,
  base: string,
  signFor: (event: AdEventKind) => Promise<string>
) => {
  let signed = xml;
  const events: AdEventKind[] = [
    "start",
    "firstQuartile",
    "midpoint",
    "thirdQuartile",
    "complete",
  ];
  for (const trackingEvent of events) {
    signed = signed.replaceAll(
      `${base}?pending=${trackingEvent}`,
      // oxlint-disable-next-line eslint/no-await-in-loop -- signature replacement chains on the previous result
      await signFor(trackingEvent)
    );
  }
  return signed;
};

type CampaignActionResult =
  | { error: string; status: typeof HttpStatusCodes.CONFLICT }
  | { status: "active" | "paused" | "pending_approval" };

/** Submit / pause / resume transitions shared by the campaign PATCH route. */
const applyCampaignAction = async (
  db: Db,
  campaignId: string,
  campaign: { status: string },
  action: "pause" | "resume" | "submit"
): Promise<CampaignActionResult> => {
  if (action === "submit") {
    if (!["draft", "rejected"].includes(campaign.status)) {
      return {
        error: "Only drafts can be submitted",
        status: HttpStatusCodes.CONFLICT,
      };
    }
    await db
      .update(adCampaign)
      .set({ status: "pending_approval", updatedAt: new Date() })
      .where(eq(adCampaign.id, campaignId));
    return { status: "pending_approval" };
  }
  if (!["active", "paused"].includes(campaign.status)) {
    return {
      error: "Only active campaigns can be paused or resumed",
      status: HttpStatusCodes.CONFLICT,
    };
  }
  const next = action === "pause" ? "paused" : "active";
  await db
    .update(adCampaign)
    .set({ status: next, updatedAt: new Date() })
    .where(eq(adCampaign.id, campaignId));
  return { status: next };
};

const isOrgMember = async (db: Db, organizationId: string, userId: string) => {
  const [row] = await db
    .select({ userId: organizationMember.userId })
    .from(organizationMember)
    .where(
      and(
        eq(organizationMember.organizationId, organizationId),
        eq(organizationMember.userId, userId)
      )
    )
    .limit(1);
  return Boolean(row);
};

/**
 * The campaign must promote a published event that belongs to the
 * organization. Shared by campaign creation and editing.
 */
const validateCampaignEvent = async (
  db: Db,
  organizationId: string,
  eventId: string
): Promise<
  | {
      error: string;
      ok: false;
      status:
        | typeof HttpStatusCodes.BAD_REQUEST
        | typeof HttpStatusCodes.FORBIDDEN;
    }
  | { event: typeof event.$inferSelect; ok: true }
> => {
  const [eventRecord] = await db
    .select()
    .from(event)
    .where(eq(event.id, eventId))
    .limit(1);
  if (!eventRecord || eventRecord.status !== "published") {
    return {
      error: "Promoted event must be published",
      ok: false,
      status: HttpStatusCodes.BAD_REQUEST,
    };
  }
  const ownsEvent =
    eventRecord.organizationId === organizationId ||
    (await isOrgMember(db, organizationId, eventRecord.organizerUserId));
  if (!ownsEvent) {
    return {
      error: "Event does not belong to this organization",
      ok: false,
      status: HttpStatusCodes.FORBIDDEN,
    };
  }
  return { event: eventRecord, ok: true };
};

interface CampaignInput {
  city?: string;
  cpmCents: number;
  creatives: unknown;
  dailyBudgetCents: number;
  endsAt?: Date;
  name: string;
  placements: "both" | "display" | "preroll";
  skillLevel?: "advanced" | "beginner" | "intermediate" | "pro";
  startsAt?: Date;
  state?: string;
  totalBudgetCents: number;
  venueId?: string;
  videoCpmCents: number;
}

const asOptionalString = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const asDate = (value: unknown) => {
  if (typeof value !== "string" || !value) {
    return;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "invalid" : date;
};

// oxlint-disable-next-line complexity -- Campaign input validates budgets, CPM floors, flight dates, targeting, and creative presence in one pass.
const validateCampaignInput = (
  body: Record<string, unknown> | null
): { error: string; ok: false } | ({ ok: true } & CampaignInput) => {
  const name = asOptionalString(body?.name);
  if (!name) {
    return { error: "Campaign name is required", ok: false };
  }
  const placements = body?.placements;
  if (
    !(
      placements === "display" ||
      placements === "preroll" ||
      placements === "both"
    )
  ) {
    return { error: "placements must be display, preroll, or both", ok: false };
  }
  const cpmCents =
    typeof body?.cpmCents === "number" ? Math.floor(body.cpmCents) : 500;
  const videoCpmCents =
    typeof body?.videoCpmCents === "number"
      ? Math.floor(body.videoCpmCents)
      : 1500;
  if (cpmCents < MIN_DISPLAY_CPM_CENTS) {
    return {
      error: `Display CPM must be at least $${MIN_DISPLAY_CPM_CENTS / 100}`,
      ok: false,
    };
  }
  if (videoCpmCents < MIN_VIDEO_CPM_CENTS) {
    return {
      error: `Video CPM must be at least $${MIN_VIDEO_CPM_CENTS / 100}`,
      ok: false,
    };
  }
  const dailyBudgetCents =
    typeof body?.dailyBudgetCents === "number"
      ? Math.floor(body.dailyBudgetCents)
      : 0;
  const totalBudgetCents =
    typeof body?.totalBudgetCents === "number"
      ? Math.floor(body.totalBudgetCents)
      : 0;
  if (!(dailyBudgetCents >= 100 && totalBudgetCents >= dailyBudgetCents)) {
    return {
      error: "Daily budget must be at least $1 and within the total budget",
      ok: false,
    };
  }
  const startsAt = asDate(body?.startsAt);
  const endsAt = asDate(body?.endsAt);
  if (startsAt === "invalid" || endsAt === "invalid") {
    return { error: "Invalid flight dates", ok: false };
  }
  if (startsAt && endsAt && endsAt.getTime() <= startsAt.getTime()) {
    return { error: "Campaign must end after it starts", ok: false };
  }
  const skillLevel = body?.skillLevel;
  if (
    skillLevel !== undefined &&
    !(
      skillLevel === "beginner" ||
      skillLevel === "intermediate" ||
      skillLevel === "advanced" ||
      skillLevel === "pro"
    )
  ) {
    return { error: "Invalid skill level targeting", ok: false };
  }
  const creatives = body?.creatives;
  if (!Array.isArray(creatives) || creatives.length === 0) {
    return { error: "At least one creative is required", ok: false };
  }
  return {
    city: asOptionalString(body?.city),
    cpmCents,
    creatives,
    dailyBudgetCents,
    endsAt,
    name: name.slice(0, 120),
    ok: true,
    placements,
    skillLevel: skillLevel as CampaignInput["skillLevel"],
    startsAt,
    state: asOptionalString(body?.state),
    totalBudgetCents,
    venueId: asOptionalString(body?.venueId),
    videoCpmCents,
  };
};

// oxlint-disable-next-line complexity -- Creative validation checks kind-specific Mux readiness, duration caps, and org ownership per item.
const validateCreatives = async (
  db: Db,
  organizationId: string,
  creatives: unknown
): Promise<
  | { error: string; ok: false }
  | { ok: true; creatives: Omit<typeof adCreative.$inferInsert, "id">[] }
> => {
  if (!Array.isArray(creatives)) {
    return { error: "Creatives must be a list", ok: false };
  }
  const validated: Omit<typeof adCreative.$inferInsert, "id">[] = [];
  for (const raw of creatives.slice(0, 4)) {
    const item = raw as Record<string, unknown>;
    const { kind } = item;
    if (!(kind === "display" || kind === "preroll")) {
      return { error: "Creative kind must be display or preroll", ok: false };
    }
    const title = typeof item.title === "string" ? item.title.trim() : "";
    if (!title) {
      return { error: "Creative title is required", ok: false };
    }
    const ctaPath =
      typeof item.ctaPath === "string" && item.ctaPath.startsWith("/")
        ? item.ctaPath.slice(0, 200)
        : undefined;
    if (kind === "display") {
      const imageUrl =
        typeof item.imageUrl === "string" &&
        item.imageUrl.startsWith("https://")
          ? item.imageUrl.slice(0, 500)
          : undefined;
      validated.push({
        body:
          typeof item.body === "string" ? item.body.slice(0, 280) : undefined,
        campaignId: "",
        imageUrl,
        kind,
        title: title.slice(0, 120),
        ...(ctaPath ? { ctaPath } : {}),
      });
      continue;
    }
    const videoId = typeof item.videoId === "string" ? item.videoId : "";
    if (!videoId) {
      return { error: "Preroll creatives require a video", ok: false };
    }
    // oxlint-disable-next-line eslint/no-await-in-loop -- signature replacement chains on the previous result
    const [clip] = await db
      .select()
      .from(video)
      .where(eq(video.id, videoId))
      .limit(1);
    if (
      !clip ||
      clip.status !== "ready" ||
      clip.visibility !== "public" ||
      !clip.muxPlaybackId
    ) {
      return {
        error: "Sponsor clip must be a public, ready Mux video",
        ok: false,
      };
    }
    if (clip.durationSeconds && clip.durationSeconds > MAX_PREROLL_SECONDS) {
      return {
        error: `Sponsor clips must be ${MAX_PREROLL_SECONDS}s or shorter`,
        ok: false,
      };
    }
    // oxlint-disable-next-line eslint/no-await-in-loop -- signature replacement chains on the previous result
    if (!(await isOrgMember(db, organizationId, clip.ownerUserId))) {
      return {
        error: "Sponsor clip must belong to your organization",
        ok: false,
      };
    }
    validated.push({
      campaignId: "",
      kind,
      title: title.slice(0, 120),
      videoId: clip.id,
      ...(ctaPath ? { ctaPath } : {}),
    });
  }
  if (validated.length === 0) {
    return { error: "At least one creative is required", ok: false };
  }
  return { creatives: validated, ok: true };
};

/**
 * Display beacons must carry the HMAC-signed params issued with the sponsored
 * payload (see signDisplayTracking); unsigned campaign/creative IDs are
 * rejected so spend cannot be forged.
 */
const verifySignedDisplayBeacon = async (
  c: { env: AppEnv["Bindings"] },
  db: Db,
  body:
    | { c?: string; cr?: string; exp?: string; sig?: string }
    | null
    | undefined,
  kind: "click" | "impression"
) => {
  if (
    !body ||
    typeof body.c !== "string" ||
    typeof body.cr !== "string" ||
    typeof body.exp !== "string" ||
    typeof body.sig !== "string"
  ) {
    return null;
  }
  const verified = await verifyBeaconParams(adsSecret(c.env), {
    c: body.c,
    cr: body.cr,
    ev: kind,
    exp: body.exp,
    p: "display",
    sig: body.sig,
  });
  if (!verified) {
    return null;
  }
  const [row] = await db
    .select({ campaign: adCampaign, creative: adCreative })
    .from(adCampaign)
    .innerJoin(adCreative, eq(adCreative.campaignId, adCampaign.id))
    .where(
      and(
        eq(adCampaign.id, body.c),
        eq(adCreative.id, body.cr),
        eq(adCampaign.status, "active"),
        eq(adCreative.status, "active")
      )
    )
    .limit(1);
  return row ?? null;
};
