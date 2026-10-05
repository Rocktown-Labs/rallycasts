import type { createDb } from "@rallycaststv/db";
import { userProfile, userSubscription } from "@rallycaststv/db/schema/domain";
import { eq } from "drizzle-orm";

import { createId } from "./ids";

/**
 * RallyCasts Pro plan. Prices live in Stripe as Price objects with stable
 * lookup keys; changing a price means bumping the key version so the old
 * price keeps serving existing subscribers until they churn.
 */
export const PRO_MONTHLY_PRICE_CENTS = 1499;
export const PRO_ANNUAL_PRICE_CENTS = 11_999;
export const PRO_TRIAL_DAYS = 7;
export const PRO_PRODUCT_NAME = "RallyCasts Pro";
const PRO_PRICE_LOOKUP_KEYS = {
  month: "rallycasts_pro_monthly_v1",
  year: "rallycasts_pro_annual_v1",
} as const;

export type ProInterval = "month" | "year";

/** Fetch a subscription object from Stripe by id (webhook support). */
export const fetchStripeSubscription = async (
  secret: string,
  subscriptionId: string
): Promise<Record<string, unknown> | null> => {
  const subscription = await stripeGetJson<Record<string, unknown>>(
    `/v1/subscriptions/${encodeURIComponent(subscriptionId)}`,
    secret
  );
  return subscription ?? null;
};

/**
 * Entitled subscription statuses. past_due keeps Pro active through
 * Stripe's retry window so a failed card does not yank features instantly.
 */
export const proEntitled = (status: string): boolean =>
  status === "active" || status === "trialing" || status === "past_due";

export const proPriceCents = (interval: ProInterval): number =>
  interval === "year" ? PRO_ANNUAL_PRICE_CENTS : PRO_MONTHLY_PRICE_CENTS;

type StripeObject = Record<string, unknown>;

export const stripeGetJson = async <T>(
  path: string,
  secret: string,
  params: Record<string, string> = {}
): Promise<T> => {
  const url = new URL(`https://api.stripe.com${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (!response.ok) {
    throw new Error(`Stripe request failed (${response.status})`);
  }
  return (await response.json()) as T;
};

const stripePostForm = async <T>(
  path: string,
  secret: string,
  values: Record<string, string>
): Promise<T> => {
  const response = await fetch(`https://api.stripe.com${path}`, {
    body: new URLSearchParams(values),
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Stripe request failed (${response.status})`);
  }
  return (await response.json()) as T;
};

const findProProduct = async (secret: string): Promise<StripeObject | null> => {
  const products = await stripeGetJson<{ data?: StripeObject[] }>(
    "/v1/products",
    secret,
    { limit: "100" }
  );
  return (
    (products.data ?? []).find((product) => {
      const metadata = product.metadata as Record<string, string> | undefined;
      return metadata?.plan === "rallycasts_pro";
    }) ?? null
  );
};

/**
 * Resolve the Stripe Price for a Pro interval, creating the product and
 * price on first use. Idempotent: repeated calls reuse the same objects.
 */
export const ensureProPriceId = async (
  secret: string,
  interval: ProInterval
): Promise<string> => {
  let product = await findProProduct(secret);
  let productId =
    typeof product?.id === "string" ? (product.id as string) : null;

  if (!productId) {
    product = await stripePostForm<StripeObject>("/v1/products", secret, {
      "metadata[plan]": "rallycasts_pro",
      name: PRO_PRODUCT_NAME,
    });
    productId =
      typeof product.id === "string"
        ? (product.id as string)
        : (() => {
            throw new Error("Stripe returned an invalid product");
          })();
  }

  const lookupKey = PRO_PRICE_LOOKUP_KEYS[interval];
  const prices = await stripeGetJson<{ data?: StripeObject[] }>(
    "/v1/prices",
    secret,
    { active: "true", limit: "100", product: productId }
  );
  const existing = (prices.data ?? []).find(
    (price) => price.lookup_key === lookupKey
  );
  if (existing && typeof existing.id === "string") {
    return existing.id as string;
  }

  const created = await stripePostForm<StripeObject>("/v1/prices", secret, {
    currency: "usd",
    lookup_key: lookupKey,
    "metadata[interval]": interval,
    "metadata[plan]": "rallycasts_pro",
    product: productId,
    [`recurring[interval]`]: interval,
    unit_amount: String(proPriceCents(interval)),
  });
  if (typeof created.id !== "string") {
    throw new TypeError("Stripe returned an invalid price");
  }
  return created.id;
};

/**
 * Pro plan entitlement for a user: reads the subscription row and never
 * trusts the profile flag on its own.
 */
export const userProEntitled = async (
  db: ReturnType<typeof createDb>,
  userId: string
): Promise<boolean> => {
  const [subscription] = await db
    .select({ status: userSubscription.status })
    .from(userSubscription)
    .where(eq(userSubscription.userId, userId))
    .limit(1);
  return subscription ? proEntitled(subscription.status) : false;
};

const intervalForPriceId = async (
  secret: string,
  priceId: string
): Promise<ProInterval> => {
  const price = await stripeGetJson<StripeObject>(
    `/v1/prices/${encodeURIComponent(priceId)}`,
    secret
  );
  const recurring = price.recurring as { interval?: string } | undefined;
  return recurring?.interval === "year" ? "year" : "month";
};

/**
 * Extract the stable fields we track from a Stripe subscription object.
 * Returns null when the object is missing the identity fields we need.
 */
const secondsOrNull = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseSubscriptionFields = (
  subscription: StripeObject
): {
  cancelAtPeriodEnd: boolean;
  customerId: null | string;
  currentPeriodEndSeconds: number;
  priceId: null | string;
  status: string;
  subscriptionId: null | string;
  trialEndSeconds: number;
  userId: null | string;
} => {
  const items = subscription.items as { data?: StripeObject[] } | undefined;
  const firstPrice = items?.data?.[0]?.price as StripeObject | undefined;
  const metadata = subscription.metadata as Record<string, string> | undefined;
  return {
    cancelAtPeriodEnd: subscription.cancel_at_period_end === true,
    currentPeriodEndSeconds: secondsOrNull(subscription.current_period_end),
    customerId:
      typeof subscription.customer === "string" ? subscription.customer : null,
    priceId: typeof firstPrice?.id === "string" ? firstPrice.id : null,
    status: typeof subscription.status === "string" ? subscription.status : "",
    subscriptionId:
      typeof subscription.id === "string" ? subscription.id : null,
    trialEndSeconds: secondsOrNull(subscription.trial_end),
    userId: metadata?.userId ?? null,
  };
};

/**
 * Sync a Stripe subscription object into the subscription row and the
 * profile entitlement flag. Called from the webhook for every lifecycle
 * event; safe to run repeatedly.
 */
export const syncSubscriptionFromStripe = async (
  db: ReturnType<typeof createDb>,
  secret: string,
  subscription: StripeObject
): Promise<void> => {
  const fields = parseSubscriptionFields(subscription);
  const { subscriptionId, customerId, priceId } = fields;
  if (!(subscriptionId && customerId && priceId)) {
    return;
  }

  let { userId } = fields;
  if (!userId) {
    const [existing] = await db
      .select({ userId: userSubscription.userId })
      .from(userSubscription)
      .where(eq(userSubscription.stripeSubscriptionId, subscriptionId))
      .limit(1);
    ({ userId } = existing ?? { userId: null });
  }
  if (!userId) {
    return;
  }

  const interval = await intervalForPriceId(secret, priceId);
  const values = {
    cancelAtPeriodEnd: fields.cancelAtPeriodEnd,
    currentPeriodEnd: new Date(fields.currentPeriodEndSeconds * 1000),
    interval,
    priceId,
    status: proEntitled(fields.status)
      ? (fields.status as "active" | "past_due" | "trialing")
      : ("canceled" as const),
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    trialEndsAt: fields.trialEndSeconds
      ? new Date(fields.trialEndSeconds * 1000)
      : null,
    updatedAt: new Date(),
    userId,
  };

  const [existingRow] = await db
    .select({ id: userSubscription.id })
    .from(userSubscription)
    .where(eq(userSubscription.stripeSubscriptionId, subscriptionId))
    .limit(1);

  await (existingRow
    ? db
        .update(userSubscription)
        .set(values)
        .where(eq(userSubscription.id, existingRow.id))
    : db.insert(userSubscription).values({ id: createId(), ...values }));

  // The subscription sync is the only writer of the entitlement flag for
  // non-admin users. The profile row is created lazily on first use, so
  // a subscriber that never fetched their profile still gets tracked.
  const entitled = proEntitled(values.status);
  const [profile] = await db
    .select({ id: userProfile.userId })
    .from(userProfile)
    .where(eq(userProfile.userId, userId))
    .limit(1);
  const accountTier = entitled ? ("premium" as const) : ("free" as const);
  await (profile
    ? db
        .update(userProfile)
        .set({ accountTier })
        .where(eq(userProfile.userId, userId))
    : db
        .insert(userProfile)
        .values({ accountTier, userId })
        .onConflictDoNothing());
};
