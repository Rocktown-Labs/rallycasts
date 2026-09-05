import { createDb } from "@rallycaststv/db";
import {
  event,
  eventPayment,
  eventRegistration,
  organization,
  organizationMember,
  webhookEvent,
} from "@rallycaststv/db/schema/domain";
import { and, eq, inArray, sql } from "drizzle-orm";
import { Hono } from "hono";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { processAdBudgetCompleted } from "../lib/ads";
import { createId } from "../lib/ids";
import { readJsonPayload } from "../lib/json";
import { createNotification } from "../lib/notifications";
import type { AppEnv } from "../lib/types";
import { requireAuth } from "../middleware/auth";
import { requireVerifiedAuth } from "../middleware/security";

const STRIPE_API_VERSION = "2026-07-29.dahlia";
const APPLICATION_FEE_BASIS_POINTS = 500;
const STRIPE_REQUEST_TIMEOUT_MS = 10_000;

const getRecord = (
  value: unknown,
  key: string
): Record<string, unknown> | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const property = (value as Record<string, unknown>)[key];
  return property && typeof property === "object"
    ? (property as Record<string, unknown>)
    : null;
};

const getString = (value: unknown, key: string): string | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const property = (value as Record<string, unknown>)[key];
  return typeof property === "string" ? property : null;
};

const getNumber = (value: unknown, key: string): number | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const property = (value as Record<string, unknown>)[key];
  return typeof property === "number" ? property : null;
};

const stripeJson = async <T>(
  path: string,
  secret: string,
  body: Record<string, unknown>
): Promise<T> => {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    STRIPE_REQUEST_TIMEOUT_MS
  );
  try {
    const response = await fetch(`https://api.stripe.com${path}`, {
      body: JSON.stringify(body),
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
        "Stripe-Version": STRIPE_API_VERSION,
      },
      method: "POST",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Stripe request failed (${response.status})`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
};

export const stripeForm = async <T>(
  path: string,
  secret: string,
  values: Record<string, string>,
  idempotencyKey?: string
): Promise<T> => {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    STRIPE_REQUEST_TIMEOUT_MS
  );
  try {
    const response = await fetch(`https://api.stripe.com${path}`, {
      body: new URLSearchParams(values),
      headers: {
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Stripe-Version": STRIPE_API_VERSION,
      },
      method: "POST",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Stripe request failed (${response.status})`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
};

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

const verifyStripeSignature = async (
  payload: string,
  header: string | undefined,
  secret: string
): Promise<boolean> => {
  if (!header) {
    return false;
  }
  const parts = new Map(
    header.split(",").map((part) => {
      const [key, value] = part.split("=", 2);
      return [key, value] as const;
    })
  );
  const timestamp = parts.get("t");
  const signature = parts.get("v1");
  const timestampSeconds = Number(timestamp);
  const signatureBytes = signature ? hexToBytes(signature) : null;
  if (
    !timestamp ||
    !signatureBytes ||
    !Number.isFinite(timestampSeconds) ||
    Math.abs(Date.now() / 1000 - timestampSeconds) > 300
  ) {
    return false;
  }
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["verify"]
  );
  return crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes as BufferSource,
    new TextEncoder().encode(`${timestamp}.${payload}`)
  );
};

// oxlint-disable-next-line complexity -- Payment validation and registration reconciliation are intentionally explicit.
const processCheckoutCompleted = async (
  db: ReturnType<typeof createDb>,
  session: Record<string, unknown>,
  stripeSecret?: string
) => {
  const metadata = getRecord(session, "metadata");
  const registrationId = metadata
    ? getString(metadata, "registration_id")
    : null;
  if (!registrationId) {
    return;
  }
  const sessionId = getString(session, "id");
  const paymentIntentId = getString(session, "payment_intent");
  const clientReferenceId = getString(session, "client_reference_id");
  const paymentStatus = getString(session, "payment_status");
  const mode = getString(session, "mode");
  const currency = getString(session, "currency");
  const paidAmountCents = getNumber(session, "amount_total");
  const [pendingRegistration] = await db
    .select()
    .from(eventRegistration)
    .where(eq(eventRegistration.id, registrationId))
    .limit(1);
  if (!pendingRegistration) {
    return;
  }
  const [eventRecord] = await db
    .select()
    .from(event)
    .where(eq(event.id, pendingRegistration.eventId))
    .limit(1);
  const metadataEventId = metadata ? getString(metadata, "event_id") : null;
  if (
    !eventRecord ||
    !sessionId ||
    !paymentIntentId ||
    clientReferenceId !== registrationId ||
    metadataEventId !== eventRecord.id ||
    paymentStatus !== "paid" ||
    mode !== "payment" ||
    currency !== eventRecord.currency ||
    paidAmountCents !== eventRecord.entryFeeCents ||
    (pendingRegistration.stripeCheckoutSessionId !== null &&
      pendingRegistration.stripeCheckoutSessionId !== sessionId)
  ) {
    return;
  }
  if (pendingRegistration.paymentStatus === "paid") {
    return;
  }
  const [pendingPayment] = await db
    .select()
    .from(eventPayment)
    .where(eq(eventPayment.registrationId, registrationId))
    .limit(1);
  if (!pendingPayment) {
    throw new Error("Payment record is missing for checkout session");
  }
  if (
    pendingPayment.amountCents !== eventRecord.entryFeeCents ||
    !["pending", "succeeded"].includes(pendingPayment.status) ||
    (pendingPayment.stripeCheckoutSessionId !== null &&
      pendingPayment.stripeCheckoutSessionId !== sessionId) ||
    (pendingPayment.stripePaymentIntentId !== null &&
      pendingPayment.stripePaymentIntentId !== paymentIntentId)
  ) {
    return;
  }
  if (eventRecord.status === "cancelled") {
    if (!stripeSecret) {
      throw new Error("Stripe is required to refund a cancelled event");
    }
    const refund = await stripeForm<Record<string, unknown>>(
      "/v1/refunds",
      stripeSecret,
      { payment_intent: paymentIntentId },
      `refund/${pendingPayment.id}`
    );
    const refundId = getString(refund, "id");
    if (!refundId) {
      throw new Error("Stripe returned an invalid refund");
    }
    const [refundedPayment] = await db
      .update(eventPayment)
      .set({
        status: "refunded",
        stripePaymentIntentId: paymentIntentId,
        stripeRefundId: refundId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(eventPayment.id, pendingPayment.id),
          inArray(eventPayment.status, ["pending", "succeeded"])
        )
      )
      .returning({ id: eventPayment.id });
    if (!refundedPayment) {
      return;
    }
    await db
      .update(eventRegistration)
      .set({
        paymentStatus: "refunded",
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(eq(eventRegistration.id, registrationId));
    await createNotification(db, {
      body: `Your ${eventRecord.name} registration was refunded because the event was cancelled.`,
      entityId: eventRecord.id,
      entityType: "event",
      href: `/events/${eventRecord.id}`,
      title: "Cancelled event payment refunded",
      type: "event",
      userId: pendingRegistration.userId,
    });
    return;
  }
  const registrationStatusExpression =
    eventRecord.capacity === null
      ? "registered"
      : sql`CASE WHEN (
          SELECT COUNT(*)
          FROM event_registration AS active_registration
          WHERE active_registration.event_id = ${pendingRegistration.eventId}
            AND active_registration.id != ${registrationId}
            AND active_registration.status NOT IN ('cancelled', 'pending_payment')
        ) < ${eventRecord.capacity} THEN 'registered' ELSE 'waitlisted' END`;
  const [succeededPayment] = await db
    .update(eventPayment)
    .set({
      status: "succeeded",
      stripePaymentIntentId: paymentIntentId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(eventPayment.registrationId, registrationId),
        inArray(eventPayment.status, ["pending", "succeeded"])
      )
    )
    .returning({ id: eventPayment.id });
  if (!succeededPayment) {
    return;
  }
  const [registration] = await db
    .update(eventRegistration)
    .set({
      paidAmountCents,
      paymentStatus: "paid",
      status:
        registrationStatusExpression as typeof eventRegistration.$inferInsert.status,
      stripeCheckoutSessionId: sessionId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(eventRegistration.id, registrationId),
        eq(eventRegistration.paymentStatus, "pending")
      )
    )
    .returning();
  const registrationStatus =
    registration?.status === "waitlisted" ? "waitlisted" : "registered";
  if (!registration) {
    return;
  }
  await createNotification(db, {
    body:
      registrationStatus === "waitlisted"
        ? "Your payment is confirmed. The field is full, so you are on the paid waitlist."
        : "Your payment is confirmed and your tournament spot is secured.",
    entityId: registration.eventId,
    entityType: "event",
    href: `/events/${registration.eventId}`,
    title:
      registrationStatus === "waitlisted"
        ? "Tournament waitlist confirmed"
        : "Tournament registration confirmed",
    type: "event",
    userId: registration.userId,
  });
};

export const stripeRouter = new Hono<AppEnv>()
  .get("/status", (c) =>
    c.json(
      {
        accountsApi: "v2",
        checkout: "hosted",
        configured: Boolean(c.env.STRIPE_SECRET_KEY),
        payments: "destination_charges",
      },
      HttpStatusCodes.OK
    )
  )
  .post(
    "/connect/:organizationId/onboarding",
    requireAuth,
    requireVerifiedAuth,
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
      const organizationId = c.req.param("organizationId");
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
            eq(organizationMember.userId, authUser.id)
          )
        )
        .limit(1);
      if (!membership || membership.role === "editor") {
        return c.json({ message: "Forbidden" }, HttpStatusCodes.FORBIDDEN);
      }

      let accountId = membership.organization.stripeAccountId;
      if (!accountId) {
        const account = await stripeJson<Record<string, unknown>>(
          "/v2/core/accounts",
          secret,
          {
            configuration: {
              recipient: {
                capabilities: {
                  stripe_balance: { stripe_transfers: { requested: true } },
                },
              },
            },
            contact_email: authUser.email,
            dashboard: "express",
            defaults: {
              responsibilities: {
                fees_collector: "application",
                losses_collector: "application",
              },
            },
            display_name: membership.organization.name,
          }
        );
        const createdAccountId = getString(account, "id");
        if (!createdAccountId) {
          return c.json(
            { message: "Stripe returned an invalid account" },
            HttpStatusCodes.BAD_GATEWAY
          );
        }
        accountId = createdAccountId;
        await db
          .update(organization)
          .set({
            stripeAccountId: accountId,
            stripeOnboardingStatus: "pending",
          })
          .where(eq(organization.id, organizationId));
      }

      const appUrl =
        c.env.CORS_ORIGIN?.split(",")[0] ?? "http://localhost:3001";
      const link = await stripeJson<Record<string, unknown>>(
        "/v2/core/account_links",
        secret,
        {
          account: accountId,
          use_case: {
            account_onboarding: {
              collection_options: { fields: "eventually_due" },
              configurations: ["recipient"],
              refresh_url: `${appUrl}/events/organizers/${membership.organization.slug}/manage?stripe=refresh`,
              return_url: `${appUrl}/events/organizers/${membership.organization.slug}/manage?stripe=return`,
            },
            type: "account_onboarding",
          },
        }
      );
      const linkUrl = getString(link, "url");
      if (!linkUrl) {
        return c.json(
          { message: "Stripe returned an invalid onboarding link" },
          HttpStatusCodes.BAD_GATEWAY
        );
      }
      return c.json({ url: linkUrl }, HttpStatusCodes.OK);
    }
  )
  // oxlint-disable-next-line complexity -- Checkout validates identity, capacity, and payment configuration before creating a session.
  .post(
    "/events/:eventId/checkout",
    requireAuth,
    requireVerifiedAuth,
    // eslint-disable-next-line complexity -- Checkout validates identity, capacity, and payment configuration before creating a session.
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
      const eventId = c.req.param("eventId");
      const [record] = await db
        .select({ event, organization })
        .from(event)
        .leftJoin(organization, eq(event.organizationId, organization.id))
        .where(eq(event.id, eventId))
        .limit(1);
      if (!record || record.event.status !== "published") {
        return c.json(
          { message: "Event not found" },
          HttpStatusCodes.NOT_FOUND
        );
      }
      if (record.event.entryFeeCents <= 0) {
        return c.json(
          { message: "This event does not require payment" },
          HttpStatusCodes.BAD_REQUEST
        );
      }
      if (
        record.event.registrationDeadline &&
        record.event.registrationDeadline.getTime() < Date.now()
      ) {
        return c.json(
          { message: "Registration is closed" },
          HttpStatusCodes.CONFLICT
        );
      }

      const [existing] = await db
        .select()
        .from(eventRegistration)
        .where(
          and(
            eq(eventRegistration.eventId, eventId),
            eq(eventRegistration.userId, authUser.id)
          )
        )
        .limit(1);
      if (existing?.paymentStatus === "paid") {
        return c.json(
          { message: "You are already registered" },
          HttpStatusCodes.CONFLICT
        );
      }
      const registrationId = existing?.id ?? createId();
      const registrationWrite = existing
        ? db
            .update(eventRegistration)
            .set({
              paymentStatus: "pending",
              status: "pending_payment",
              updatedAt: new Date(),
            })
            .where(eq(eventRegistration.id, registrationId))
        : db.insert(eventRegistration).values({
            eventId,
            id: registrationId,
            paymentStatus: "pending",
            status: "pending_payment",
            userId: authUser.id,
          });
      await registrationWrite;

      const applicationFeeCents = Math.round(
        (record.event.entryFeeCents * APPLICATION_FEE_BASIS_POINTS) / 10_000
      );
      const appUrl =
        c.env.CORS_ORIGIN?.split(",")[0] ?? "http://localhost:3001";
      const values: Record<string, string> = {
        cancel_url: `${appUrl}/events/${eventId}?checkout=cancelled`,
        client_reference_id: registrationId,
        customer_email: authUser.email,
        integration_identifier: `rallycasts-checkout-${registrationId
          .replaceAll(/[^a-z]/giu, "")
          .toLowerCase()
          .padEnd(8, "a")
          .slice(0, 8)}`,
        "line_items[0][price_data][currency]": record.event.currency,
        "line_items[0][price_data][product_data][name]": record.event.name,
        "line_items[0][price_data][unit_amount]": String(
          record.event.entryFeeCents
        ),
        "line_items[0][quantity]": "1",
        "metadata[event_id]": eventId,
        "metadata[registration_id]": registrationId,
        mode: "payment",
        submit_type: "book",
        success_url: `${appUrl}/events/${eventId}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      };
      if (record.organization?.stripeAccountId) {
        values["payment_intent_data[application_fee_amount]"] =
          String(applicationFeeCents);
        values["payment_intent_data[transfer_data][destination]"] =
          record.organization.stripeAccountId;
      }
      const session = await stripeForm<Record<string, unknown>>(
        "/v1/checkout/sessions",
        secret,
        values,
        `checkout/${registrationId}`
      );
      const sessionId = getString(session, "id");
      const checkoutUrl = getString(session, "url");
      if (!(sessionId && checkoutUrl)) {
        return c.json(
          { message: "Stripe returned an invalid checkout session" },
          HttpStatusCodes.BAD_GATEWAY
        );
      }
      await db
        .update(eventRegistration)
        .set({ stripeCheckoutSessionId: sessionId, updatedAt: new Date() })
        .where(eq(eventRegistration.id, registrationId));
      await db
        .insert(eventPayment)
        .values({
          amountCents: record.event.entryFeeCents,
          applicationFeeCents: record.organization?.stripeAccountId
            ? applicationFeeCents
            : 0,
          eventId,
          id: createId(),
          registrationId,
          stripeCheckoutSessionId: sessionId,
          userId: authUser.id,
        })
        .onConflictDoUpdate({
          set: {
            amountCents: record.event.entryFeeCents,
            applicationFeeCents: record.organization?.stripeAccountId
              ? applicationFeeCents
              : 0,
            eventId,
            stripeCheckoutSessionId: sessionId,
            updatedAt: new Date(),
          },
          target: eventPayment.registrationId,
        });
      return c.json({ checkoutUrl }, HttpStatusCodes.CREATED);
    }
  )
  .post(
    "/events/:eventId/refund",
    requireAuth,
    requireVerifiedAuth,
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
      const eventId = c.req.param("eventId");
      const [record] = await db
        .select({
          event,
          payment: eventPayment,
          registration: eventRegistration,
        })
        .from(eventRegistration)
        .innerJoin(event, eq(eventRegistration.eventId, event.id))
        .innerJoin(
          eventPayment,
          eq(eventPayment.registrationId, eventRegistration.id)
        )
        .where(
          and(
            eq(eventRegistration.eventId, eventId),
            eq(eventRegistration.userId, authUser.id),
            eq(eventRegistration.paymentStatus, "paid"),
            eq(eventPayment.status, "succeeded")
          )
        )
        .limit(1);
      if (!record?.payment.stripePaymentIntentId) {
        return c.json(
          { message: "Refundable payment not found" },
          HttpStatusCodes.NOT_FOUND
        );
      }
      const refundAllowed =
        record.event.status === "cancelled" ||
        (record.event.registrationDeadline
          ? Date.now() < record.event.registrationDeadline.getTime()
          : Date.now() < record.event.startsAt.getTime());
      if (!refundAllowed) {
        return c.json(
          { message: "The self-service refund deadline has passed" },
          HttpStatusCodes.CONFLICT
        );
      }
      const refund = await stripeForm<Record<string, unknown>>(
        "/v1/refunds",
        secret,
        { payment_intent: record.payment.stripePaymentIntentId },
        `refund/${record.payment.id}`
      );
      const refundId = getString(refund, "id");
      if (!refundId) {
        return c.json(
          { message: "Stripe returned an invalid refund" },
          HttpStatusCodes.BAD_GATEWAY
        );
      }
      const [refundedPayment] = await db
        .update(eventPayment)
        .set({
          status: "refunded",
          stripeRefundId: refundId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(eventPayment.id, record.payment.id),
            eq(eventPayment.status, "succeeded")
          )
        )
        .returning({ id: eventPayment.id });
      if (!refundedPayment) {
        return c.json({ refunded: true }, HttpStatusCodes.OK);
      }
      await db
        .update(eventRegistration)
        .set({
          paymentStatus: "refunded",
          status: "cancelled",
          updatedAt: new Date(),
        })
        .where(eq(eventRegistration.id, record.registration.id));
      await createNotification(db, {
        body: `Your ${record.event.name} registration was refunded in full.`,
        entityId: eventId,
        entityType: "event",
        href: `/events/${eventId}`,
        title: "Tournament refund submitted",
        type: "event",
        userId: authUser.id,
      });
      return c.json({ refunded: true }, HttpStatusCodes.OK);
    }
  )
  .post("/webhook", async (c) => {
    const secret = c.env.STRIPE_WEBHOOK_SECRET;
    const payload = await readJsonPayload(c.req.raw);
    if (
      !secret ||
      !(await verifyStripeSignature(
        payload.raw,
        c.req.header("Stripe-Signature"),
        secret
      ))
    ) {
      return c.json(
        { message: "Stripe webhook signature is missing or invalid" },
        HttpStatusCodes.UNAUTHORIZED
      );
    }
    if (!payload.ok) {
      return c.json(
        { message: "Invalid webhook payload" },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    const providerEventId = getString(payload.value, "id");
    const eventType = getString(payload.value, "type");
    if (!(providerEventId && eventType)) {
      return c.json(
        { message: "Invalid Stripe webhook payload" },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    const db = createDb(c.env.DB);
    const [inserted] = await db
      .insert(webhookEvent)
      .values({
        eventType,
        id: createId(),
        payloadJson: payload.raw,
        provider: "stripe",
        providerEventId,
      })
      .onConflictDoNothing()
      .returning({ id: webhookEvent.id });
    if (!inserted) {
      const [existing] = await db
        .select({ id: webhookEvent.id, status: webhookEvent.status })
        .from(webhookEvent)
        .where(
          and(
            eq(webhookEvent.provider, "stripe"),
            eq(webhookEvent.providerEventId, providerEventId)
          )
        )
        .limit(1);
      if (existing?.status === "processed") {
        return c.json({ received: true }, HttpStatusCodes.OK);
      }
      if (!existing) {
        return c.json(
          { message: "Webhook could not be recorded" },
          HttpStatusCodes.SERVICE_UNAVAILABLE
        );
      }
    }

    try {
      const data = getRecord(payload.value, "data");
      const object = data ? getRecord(data, "object") : null;
      if (
        [
          "checkout.session.completed",
          "checkout.session.async_payment_succeeded",
        ].includes(eventType) &&
        object
      ) {
        const handledByAds = await processAdBudgetCompleted(db, object);
        if (!handledByAds) {
          await processCheckoutCompleted(db, object, c.env.STRIPE_SECRET_KEY);
        }
      }
      await db
        .update(webhookEvent)
        .set({ processedAt: new Date(), status: "processed" })
        .where(
          and(
            eq(webhookEvent.provider, "stripe"),
            eq(webhookEvent.providerEventId, providerEventId)
          )
        );
    } catch (error) {
      await db
        .update(webhookEvent)
        .set({ status: "failed" })
        .where(
          and(
            eq(webhookEvent.provider, "stripe"),
            eq(webhookEvent.providerEventId, providerEventId)
          )
        );
      console.error(
        JSON.stringify({
          event: "stripe_webhook_processing_failed",
          message: error instanceof Error ? error.message : "unknown error",
          providerEventId,
        })
      );
      return c.json(
        { message: "Stripe webhook processing failed" },
        HttpStatusCodes.SERVICE_UNAVAILABLE
      );
    }

    return c.json({ eventType, received: true }, HttpStatusCodes.ACCEPTED);
  });
