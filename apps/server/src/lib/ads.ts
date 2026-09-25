import type { createDb } from "@rallycaststv/db";
import {
  adCampaign,
  adCreative,
  adDailyStat,
  adPayment,
  event,
  video,
} from "@rallycaststv/db/schema/domain";
import { and, eq, inArray } from "drizzle-orm";

type Db = ReturnType<typeof createDb>;

export type AdPlacement = "display" | "preroll";
export type AdEventKind =
  | "click"
  | "complete"
  | "firstQuartile"
  | "impression"
  | "midpoint"
  | "start"
  | "thirdQuartile";

export interface AdEventMessage {
  at: number;
  campaignId: string;
  creativeId: string;
  eid: string;
  kind: AdEventKind;
  placement: AdPlacement;
  viewerHash?: string;
}

export interface AdDecideContext {
  city?: string | null;
  excludeCampaignIds?: string[];
  limit?: number;
  placement: AdPlacement;
  skillLevel?: string | null;
  state?: string | null;
  venueId?: string | null;
}

export interface DecidedAd {
  campaign: typeof adCampaign.$inferSelect;
  creative: typeof adCreative.$inferSelect;
  event: typeof event.$inferSelect;
}

export const MIN_DISPLAY_CPM_CENTS = 100;
export const MIN_VIDEO_CPM_CENTS = 500;
export const MAX_PREROLL_SECONDS = 30;
export const PREROLL_SKIP_AFTER_SECONDS = 5;
export const BEACON_TTL_MS = 24 * 60 * 60 * 1000;

export const utcDay = (at: Date | number = Date.now()) =>
  new Date(at).toISOString().slice(0, 10);

const matchesTargeting = (
  campaign: typeof adCampaign.$inferSelect,
  context: AdDecideContext
) => {
  if (
    campaign.city &&
    context.city?.toLowerCase() !== campaign.city.toLowerCase()
  ) {
    return false;
  }
  if (
    campaign.state &&
    context.state?.toLowerCase() !== campaign.state.toLowerCase()
  ) {
    return false;
  }
  if (campaign.skillLevel && context.skillLevel !== campaign.skillLevel) {
    return false;
  }
  if (campaign.venueId && context.venueId !== campaign.venueId) {
    return false;
  }
  return true;
};

const inFlight = (campaign: typeof adCampaign.$inferSelect, now: number) => {
  if (campaign.startsAt && campaign.startsAt.getTime() > now) {
    return false;
  }
  if (campaign.endsAt && campaign.endsAt.getTime() < now) {
    return false;
  }
  return true;
};

/** Spend for a bucket avoids fractional-cent drift: floor(impressions * cpm / 1000). */
export const bucketSpendCents = (
  impressions: number,
  cpmCents: number
): number => Math.floor((impressions * cpmCents) / 1000);

export const campaignCpmFor = (
  campaign: typeof adCampaign.$inferSelect,
  placement: AdPlacement
): number =>
  placement === "preroll" ? campaign.videoCpmCents : campaign.cpmCents;

/**
 * Pick eligible sponsored events for a placement. Editorial search/feed
 * ranking is never consulted here, so ad spend cannot corrupt the
 * Vectorize cosine space. Callers append results with `sponsored: true`.
 */
export const decideAds = async (
  db: Db,
  context: AdDecideContext
): Promise<DecidedAd[]> => {
  const now = Date.now();
  const limit = Math.max(1, Math.min(context.limit ?? 2, 6));
  const excluded = new Set(context.excludeCampaignIds);
  const creativeKind = context.placement === "preroll" ? "preroll" : "display";

  const candidates = await db
    .select({ campaign: adCampaign, creative: adCreative, event })
    .from(adCampaign)
    .innerJoin(event, eq(adCampaign.eventId, event.id))
    .innerJoin(
      adCreative,
      and(
        eq(adCreative.campaignId, adCampaign.id),
        eq(adCreative.kind, creativeKind),
        eq(adCreative.status, "active")
      )
    )
    .where(eq(adCampaign.status, "active"));

  const eligible = candidates.filter(
    ({ campaign, event: eventRecord }) =>
      !excluded.has(campaign.id) &&
      (campaign.placements === "both" ||
        campaign.placements === context.placement) &&
      inFlight(campaign, now) &&
      matchesTargeting(campaign, context) &&
      eventRecord.status === "published"
  );

  if (eligible.length === 0) {
    return [];
  }

  const today = utcDay(now);
  const stats = await db
    .select()
    .from(adDailyStat)
    .where(
      and(
        inArray(
          adDailyStat.campaignId,
          eligible.map(({ campaign }) => campaign.id)
        ),
        eq(adDailyStat.day, today)
      )
    );
  const spentTodayByCampaign = new Map<string, number>();
  for (const row of stats) {
    spentTodayByCampaign.set(
      row.campaignId,
      (spentTodayByCampaign.get(row.campaignId) ?? 0) + row.spentCents
    );
  }

  return eligible
    .filter(({ campaign }) => {
      const budgetCap = Math.min(
        campaign.totalBudgetCents,
        campaign.fundedCents
      );
      if (campaign.spentCents >= budgetCap) {
        return false;
      }
      return (
        (spentTodayByCampaign.get(campaign.id) ?? 0) < campaign.dailyBudgetCents
      );
    })
    .map(({ campaign, creative, event: eventRecord }) => {
      const spentToday = spentTodayByCampaign.get(campaign.id) ?? 0;
      const pacingNeed =
        1 - spentToday / Math.max(campaign.dailyBudgetCents, 1);
      return { campaign, creative, event: eventRecord, pacingNeed };
    })
    .toSorted(
      (left, right) =>
        right.pacingNeed - left.pacingNeed ||
        left.campaign.createdAt.getTime() - right.campaign.createdAt.getTime()
    )
    .slice(0, limit)
    .map(({ campaign, creative, event: eventRecord }) => ({
      campaign,
      creative,
      event: eventRecord,
    }));
};

export const getDisplaySponsorships = (
  db: Db,
  context: {
    city?: string | null;
    skillLevel?: string | null;
    state?: string | null;
    venueId?: string | null;
  }
) => decideAds(db, { ...context, limit: 3, placement: "display" });

export const prerollMediaUrlFor = (
  creative: typeof adCreative.$inferSelect,
  playbackId: string | null | undefined
): string | null => {
  if (creative.kind !== "preroll" || !playbackId) {
    return null;
  }
  return `https://stream.mux.com/${playbackId}/medium.mp4`;
};

export const resolvePrerollPlaybackId = async (
  db: Db,
  creative: typeof adCreative.$inferSelect
): Promise<string | null> => {
  if (!creative.videoId) {
    return null;
  }
  const [row] = await db
    .select({ muxPlaybackId: video.muxPlaybackId })
    .from(video)
    .where(
      and(
        eq(video.id, creative.videoId),
        eq(video.status, "ready"),
        eq(video.visibility, "public")
      )
    )
    .limit(1);
  return row?.muxPlaybackId ?? null;
};

const hmacKey = (secret: string) =>
  crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign", "verify"]
  );

/**
 * HMAC secret for ad beacons and viewer hashing. A dedicated AD_BEACON_SECRET
 * keeps ad-path verification separate from the auth secret; falls back to
 * BETTER_AUTH_SECRET when unset so existing deployments keep working.
 * NOTE: configuring a fresh AD_BEACON_SECRET invalidates signed beacons
 * issued under the old key (they expire within 24h regardless).
 */
export const adsSecret = (env: {
  AD_BEACON_SECRET?: string;
  BETTER_AUTH_SECRET: string;
}): string => env.AD_BEACON_SECRET || env.BETTER_AUTH_SECRET;

const bytesToHex = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

const hexToBytes = (value: string): Uint8Array | null => {
  if (value.length % 2 !== 0 || !/^[a-f\d]+$/iu.test(value)) {
    return null;
  }
  return new Uint8Array(
    Array.from({ length: value.length / 2 }, (_, index) =>
      Number.parseInt(value.slice(index * 2, index * 2 + 2), 16)
    )
  );
};

export interface SignedBeaconParams {
  c: string;
  cr: string;
  ev: AdEventKind | "vast";
  exp: string;
  p: AdPlacement;
  sig?: string;
}

/** Sign VAST tracking / click URLs so beacons cannot be forged client-side. */
export const signBeaconParams = async (
  secret: string,
  params: Omit<SignedBeaconParams, "sig">
): Promise<string> => {
  const payload = `${params.c}.${params.cr}.${params.p}.${params.ev}.${params.exp}`;
  const key = await hmacKey(secret);
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))
  );
  return bytesToHex(signature);
};

export const verifyBeaconParams = async (
  secret: string,
  params: SignedBeaconParams
): Promise<boolean> => {
  if (
    !(
      params.c &&
      params.cr &&
      params.p &&
      params.ev &&
      params.exp &&
      params.sig
    )
  ) {
    return false;
  }
  if (Number(params.exp) < Date.now()) {
    return false;
  }
  const signature = hexToBytes(params.sig);
  if (!signature) {
    return false;
  }
  const payload = `${params.c}.${params.cr}.${params.p}.${params.ev}.${params.exp}`;
  const key = await hmacKey(secret);
  // crypto.subtle.verify compares in constant time; never hand-roll a loop.
  return crypto.subtle.verify(
    "HMAC",
    key,
    signature as BufferSource,
    new TextEncoder().encode(payload)
  );
};

export interface DisplayAdTracking {
  click: Required<SignedBeaconParams>;
  impression: Required<SignedBeaconParams>;
}

/**
 * Pre-sign display impression/click beacon params so sponsored payloads can
 * ship forge-proof tracking tokens to clients.
 */
export const signDisplayTracking = async (
  secret: string,
  campaignId: string,
  creativeId: string
): Promise<DisplayAdTracking> => {
  const exp = String(Date.now() + BEACON_TTL_MS);
  const signFor = async (ev: "click" | "impression") => ({
    c: campaignId,
    cr: creativeId,
    ev,
    exp,
    p: "display" as const,
    sig: await signBeaconParams(secret, {
      c: campaignId,
      cr: creativeId,
      ev,
      exp,
      p: "display",
    }),
  });
  return {
    click: await signFor("click"),
    impression: await signFor("impression"),
  };
};

export const hashViewer = async (
  secret: string,
  ip: string | null | undefined,
  userAgent: string | null | undefined
): Promise<string | undefined> => {
  if (!ip && !userAgent) {
    return undefined;
  }
  const key = await hmacKey(secret);
  const digest = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(`${ip ?? ""}.${userAgent ?? ""}`)
    )
  );
  return bytesToHex(digest).slice(0, 16);
};

interface AnalyticsEngineBinding {
  writeDataPoint: (point: {
    blobs?: string[];
    doubles?: number[];
    indexes?: string[];
  }) => Promise<unknown> | unknown;
}

export interface AdsAggregateResult {
  clicks: number;
  completedCampaignIds: string[];
  impressions: number;
}

interface DailyBucketDelta {
  campaignId: string;
  clicks: number;
  day: string;
  impressions: number;
  placement: AdPlacement;
}

const upsertDailyBucket = async (
  db: Db,
  campaign: typeof adCampaign.$inferSelect,
  group: DailyBucketDelta
) => {
  const [existing] = await db
    .select()
    .from(adDailyStat)
    .where(
      and(
        eq(adDailyStat.campaignId, group.campaignId),
        eq(adDailyStat.day, group.day),
        eq(adDailyStat.placement, group.placement)
      )
    )
    .limit(1);
  const totalImpressions = (existing?.impressions ?? 0) + group.impressions;
  const totalClicks = (existing?.clicks ?? 0) + group.clicks;
  const spent = bucketSpendCents(
    totalImpressions,
    campaignCpmFor(campaign, group.placement)
  );
  await db
    .insert(adDailyStat)
    .values({
      campaignId: group.campaignId,
      clicks: totalClicks,
      day: group.day,
      impressions: totalImpressions,
      placement: group.placement,
      spentCents: spent,
    })
    .onConflictDoUpdate({
      set: {
        clicks: totalClicks,
        impressions: totalImpressions,
        spentCents: spent,
        updatedAt: new Date(),
      },
      target: [adDailyStat.campaignId, adDailyStat.day, adDailyStat.placement],
    });
};

const rollUpCampaignSpend = async (
  db: Db,
  campaignById: Map<string, typeof adCampaign.$inferSelect>,
  touchedCampaigns: Set<string>
) => {
  const completedCampaignIds: string[] = [];
  for (const campaignId of touchedCampaigns) {
    const stats = await db
      .select({ spentCents: adDailyStat.spentCents })
      .from(adDailyStat)
      .where(eq(adDailyStat.campaignId, campaignId));
    let spent = 0;
    for (const row of stats) {
      spent += row.spentCents;
    }
    const campaign = campaignById.get(campaignId);
    const cap = campaign
      ? Math.min(campaign.totalBudgetCents, campaign.fundedCents)
      : 0;
    if (campaign && campaign.status === "active" && spent >= cap) {
      await db
        .update(adCampaign)
        .set({ spentCents: spent, status: "completed", updatedAt: new Date() })
        .where(eq(adCampaign.id, campaignId));
      completedCampaignIds.push(campaignId);
    } else {
      await db
        .update(adCampaign)
        .set({ spentCents: spent, updatedAt: new Date() })
        .where(eq(adCampaign.id, campaignId));
    }
  }
  return completedCampaignIds;
};

const writeAdsTelemetry = async (
  env: { ADS_ANALYTICS?: AnalyticsEngineBinding },
  messages: AdEventMessage[]
) => {
  if (!env.ADS_ANALYTICS) {
    return;
  }
  try {
    for (const message of messages) {
      await env.ADS_ANALYTICS.writeDataPoint({
        blobs: [
          message.campaignId,
          message.creativeId,
          message.placement,
          message.kind,
          utcDay(message.at),
        ],
        doubles: [1],
        indexes: [message.campaignId],
      });
    }
  } catch {
    // Telemetry must never fail billing aggregation.
  }
};

/**
 * Fold beacon events into `ad_daily_stat` buckets and roll spend up to the
 * campaign. Spend per bucket is recomputed from totals so fractional CPMs
 * never drift. Best-effort telemetry goes to Analytics Engine; D1 is truth.
 */
export const aggregateAdEvents = async (
  db: Db,
  env: { ADS_ANALYTICS?: AnalyticsEngineBinding },
  messages: AdEventMessage[]
): Promise<AdsAggregateResult> => {
  const seen = new Set<string>();
  const fresh = messages.filter((message) => {
    if (!message.eid || seen.has(message.eid)) {
      return false;
    }
    seen.add(message.eid);
    return true;
  });
  if (fresh.length === 0) {
    return { clicks: 0, completedCampaignIds: [], impressions: 0 };
  }

  const campaignIds = [...new Set(fresh.map((message) => message.campaignId))];
  const campaigns = await db
    .select()
    .from(adCampaign)
    .where(inArray(adCampaign.id, campaignIds));
  const campaignById = new Map(campaigns.map((row) => [row.id, row]));
  const valid = fresh.filter((message) => campaignById.has(message.campaignId));

  const groups = new Map<
    string,
    {
      campaignId: string;
      clicks: number;
      day: string;
      impressions: number;
      placement: AdPlacement;
    }
  >();
  for (const message of valid) {
    const day = utcDay(message.at);
    const key = `${message.campaignId}.${day}.${message.placement}`;
    const group = groups.get(key) ?? {
      campaignId: message.campaignId,
      clicks: 0,
      day,
      impressions: 0,
      placement: message.placement,
    };
    if (message.kind === "click") {
      group.clicks += 1;
    } else if (message.kind === "impression" || message.kind === "start") {
      group.impressions += 1;
    }
    groups.set(key, group);
  }

  let impressions = 0;
  let clicks = 0;
  const touchedCampaigns = new Set<string>();
  for (const group of groups.values()) {
    impressions += group.impressions;
    clicks += group.clicks;
    const campaign = campaignById.get(group.campaignId);
    if (!campaign) {
      continue;
    }
    await upsertDailyBucket(db, campaign, group);
    touchedCampaigns.add(group.campaignId);
  }

  const completedCampaignIds = await rollUpCampaignSpend(
    db,
    campaignById,
    touchedCampaigns
  );
  await writeAdsTelemetry(env, valid);

  return { clicks, completedCampaignIds, impressions };
};

const sessionString = (
  session: Record<string, unknown>,
  key: string
): string | null => {
  const value = session[key];
  return typeof value === "string" ? value : null;
};

const sessionNumber = (
  session: Record<string, unknown>,
  key: string
): number | null => {
  const value = session[key];
  return typeof value === "number" ? value : null;
};

/**
 * Settle a prepaid ad-budget Checkout session. Returns true when the session
 * belonged to ads (so the caller can skip tournament reconciliation).
 */
export const processAdBudgetCompleted = async (
  db: Db,
  session: Record<string, unknown>
): Promise<boolean> => {
  const metadata = session.metadata as Record<string, unknown> | undefined;
  if (!metadata || metadata.type !== "ad_budget") {
    return false;
  }
  const campaignId =
    typeof metadata.ad_campaign_id === "string"
      ? metadata.ad_campaign_id
      : null;
  const paymentId =
    typeof metadata.ad_payment_id === "string" ? metadata.ad_payment_id : null;
  const sessionId = sessionString(session, "id");
  const paymentStatus = sessionString(session, "payment_status");
  const mode = sessionString(session, "mode");
  const currency = sessionString(session, "currency");
  const amountTotal = sessionNumber(session, "amount_total");
  if (
    !(campaignId && paymentId && sessionId) ||
    paymentStatus !== "paid" ||
    mode !== "payment"
  ) {
    return true;
  }

  const [payment] = await db
    .select()
    .from(adPayment)
    .where(eq(adPayment.id, paymentId))
    .limit(1);
  if (
    !payment ||
    payment.campaignId !== campaignId ||
    payment.status === "succeeded" ||
    payment.amountCents !== amountTotal ||
    currency !== "usd"
  ) {
    return true;
  }

  await db
    .update(adPayment)
    .set({
      status: "succeeded",
      stripeCheckoutSessionId: sessionId,
      updatedAt: new Date(),
    })
    .where(eq(adPayment.id, paymentId));
  const [campaign] = await db
    .select()
    .from(adCampaign)
    .where(eq(adCampaign.id, campaignId))
    .limit(1);
  if (campaign) {
    await db
      .update(adCampaign)
      .set({
        fundedCents: campaign.fundedCents + payment.amountCents,
        updatedAt: new Date(),
      })
      .where(eq(adCampaign.id, campaignId));
  }
  return true;
};
