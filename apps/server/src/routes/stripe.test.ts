import { env } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";

import app from "../index";

const signUp = async () => {
  const username = `stripe${crypto.randomUUID().slice(0, 8)}`;
  const response = await app.request(
    "/api/auth/sign-up/email",
    {
      body: JSON.stringify({
        email: `${username}@example.com`,
        name: "Stripe Player",
        password: "password-12345678",
        username,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    env
  );
  const body = (await response.json()) as { user: { id: string } };
  return { cookie: response.headers.get("set-cookie") ?? "", id: body.user.id };
};

const promoteToAdmin = async (userId: string) => {
  await env.DB.prepare(
    "insert into user_profile (user_id, platform_role) values (?, 'admin') on conflict(user_id) do update set platform_role = 'admin'"
  )
    .bind(userId)
    .run();
  await env.DB.prepare("update user set email_verified = 1 where id = ?")
    .bind(userId)
    .run();
};

const signPayload = async (payload: string, timestamp: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode("stripe-webhook-secret"),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${payload}`)
  );
  return Array.from(new Uint8Array(signature), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
};

describe("Stripe tournament payments", () => {
  afterEach(() => vi.restoreAllMocks());

  it("confirms a paid registration only after a signed webhook", async () => {
    const player = await signUp();
    await promoteToAdmin(player.id);
    const eventId = `paid-event-${crypto.randomUUID()}`;
    await env.DB.prepare(
      "insert into event (id, name, organizer_user_id, starts_at, status, event_type, entry_fee_cents, currency) values (?, ?, ?, ?, 'published', 'tournament', 2500, 'usd')"
    )
      .bind(eventId, "Paid Open", player.id, Date.now() + 86_400_000)
      .run();
    const stripeFetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json({
        id: "cs_test_registration",
        url: "https://checkout.stripe.test/session",
      })
    );

    const checkoutResponse = await app.request(
      `/api/v1/stripe/events/${eventId}/checkout`,
      { headers: { Cookie: player.cookie }, method: "POST" },
      { ...env, STRIPE_SECRET_KEY: "sk_test_value" }
    );
    expect(checkoutResponse.status).toBe(201);
    const pending = await env.DB.prepare(
      "select id, status, payment_status from event_registration where event_id = ? and user_id = ?"
    )
      .bind(eventId, player.id)
      .first<{ id: string; payment_status: string; status: string }>();
    expect(pending).toMatchObject({
      payment_status: "pending",
      status: "pending_payment",
    });

    const payload = JSON.stringify({
      data: {
        object: {
          amount_total: 2500,
          client_reference_id: pending?.id,
          currency: "usd",
          id: "cs_test_registration",
          metadata: {
            event_id: eventId,
            registration_id: pending?.id,
          },
          mode: "payment",
          payment_intent: "pi_test_registration",
          payment_status: "paid",
        },
      },
      id: `evt_${crypto.randomUUID()}`,
      type: "checkout.session.completed",
    });
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = await signPayload(payload, timestamp);
    const webhookResponse = await app.request(
      "/api/v1/stripe/webhook",
      {
        body: payload,
        headers: {
          "Content-Type": "application/json",
          "Stripe-Signature": `t=${timestamp},v1=${signature}`,
        },
        method: "POST",
      },
      { ...env, STRIPE_WEBHOOK_SECRET: "stripe-webhook-secret" }
    );
    expect(webhookResponse.status).toBe(202);
    const confirmed = await env.DB.prepare(
      "select status, payment_status from event_registration where id = ?"
    )
      .bind(pending?.id)
      .first();
    expect(confirmed).toEqual({ payment_status: "paid", status: "registered" });

    stripeFetch.mockResolvedValueOnce(
      Response.json({ id: "re_test_registration" })
    );
    const refundResponse = await app.request(
      `/api/v1/stripe/events/${eventId}/refund`,
      { headers: { Cookie: player.cookie }, method: "POST" },
      { ...env, STRIPE_SECRET_KEY: "sk_test_value" }
    );
    expect(refundResponse.status).toBe(200);
    const refunded = await env.DB.prepare(
      "select status, payment_status from event_registration where id = ?"
    )
      .bind(pending?.id)
      .first();
    expect(refunded).toEqual({
      payment_status: "refunded",
      status: "cancelled",
    });
  });
});
