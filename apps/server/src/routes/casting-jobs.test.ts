import { env } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";

import app from "../index";

const signUp = async (name: string) => {
  const username = name.toLowerCase().replaceAll(" ", "");
  const response = await app.request(
    "/api/auth/sign-up/email",
    {
      body: JSON.stringify({
        email: `${username}@example.com`,
        name,
        password: "password-12345678",
        username,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    env
  );

  expect(response.status).toBe(200);

  const cookie = response.headers.get("set-cookie");
  const body = (await response.json()) as { user: { id: string } };

  return { cookie: cookie ?? "", id: body.user.id };
};

const signStripeWebhook = async (payload: string) => {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode("stripe-webhook-secret"),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"]
  );
  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${payload}`)
  );
  const signature = Array.from(new Uint8Array(signatureBytes), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  return {
    headers: {
      "Content-Type": "application/json",
      "Stripe-Signature": `t=${timestamp},v1=${signature}`,
    },
  };
};

const setupPaidJobFixture = async () => {
  const requester = await signUp("Ivy Requester");
  const caster = await signUp("Jon Caster");
  await Promise.all(
    [requester.id, caster.id].map((userId) =>
      env.DB.prepare("update user set email_verified = 1 where id = ?")
        .bind(userId)
        .run()
    )
  );
  await env.DB.prepare(
    "insert into caster_profile (user_id, display_name, status, stripe_connect_account_id) values (?, ?, 'active', 'acct_caster_1')"
  )
    .bind(caster.id, "Jon Caster")
    .run();
  const jobId = `job-${crypto.randomUUID()}`;
  await env.DB.prepare(
    "insert into casting_job (id, requester_user_id, status, price_cents, requested_hours, starts_at, currency) values (?, ?, 'requested', 4000, 2, ?, 'usd')"
  )
    .bind(jobId, requester.id, Date.now() + 86_400_000)
    .run();
  return { caster, jobId, requester };
};

const markJobPaid = async (jobId: string) => {
  const payload = JSON.stringify({
    data: {
      object: {
        id: `cs_${jobId}`,
        metadata: { casting_job_id: jobId },
        mode: "payment",
        payment_intent: "pi_cast_1",
        payment_status: "paid",
      },
    },
    id: `evt_${crypto.randomUUID()}`,
    type: "checkout.session.completed",
  });
  const { headers } = await signStripeWebhook(payload);
  const response = await app.request(
    "/api/v1/stripe/webhook",
    {
      body: payload,
      headers,
      method: "POST",
    },
    {
      ...env,
      STRIPE_SECRET_KEY: "sk_test_value",
      STRIPE_WEBHOOK_SECRET: "stripe-webhook-secret",
    }
  );
  expect(response.status).toBe(202);
};

describe("Casting payouts", () => {
  afterEach(() => vi.restoreAllMocks());

  it("charges a new request up front into escrow with the fee stored", async () => {
    const { jobId, requester } = await setupPaidJobFixture();

    const stripeFetch = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input) => {
        const url = String(input);
        if (url === "https://api.stripe.com/v1/checkout/sessions") {
          return Response.json({
            id: "cs_cast_1",
            url: "https://checkout.stripe.test/cast",
          });
        }
        return Response.json({});
      });

    const payResponse = await app.request(
      `/api/v1/stripe/casting-jobs/${jobId}/pay`,
      { headers: { Cookie: requester.cookie }, method: "POST" },
      { ...env, STRIPE_SECRET_KEY: "sk_test_value" }
    );
    expect(payResponse.status).toBe(200);
    const body = (await payResponse.json()) as { url?: string };
    expect(body.url).toBe("https://checkout.stripe.test/cast");

    const createCall = stripeFetch.mock.calls.find((call) =>
      String(call[0]).endsWith("/v1/checkout/sessions")
    );
    const sent = new URLSearchParams(String(createCall?.[1]?.body));
    // Escrow: the charge lands on the platform with no destination and
    // no fee split; the caster is paid out only on completion.
    expect(sent.get("payment_intent_data[transfer_data][destination]")).toBe(
      null
    );
    expect(sent.get("payment_intent_data[application_fee_amount]")).toBe(null);
    expect(sent.get("line_items[0][price_data][unit_amount]")).toBe("4000");

    // The standard platform fee (10% of 4000) is stored for the payout.
    const stored = await env.DB.prepare(
      "select application_fee_cents, charged_cents from casting_job where id = ?"
    )
      .bind(jobId)
      .first<{ application_fee_cents: number; charged_cents: number }>();
    expect(stored?.application_fee_cents).toBe(400);
    expect(stored?.charged_cents).toBe(4000);
  });

  it("gives RallyCasts Pro members 5% off the casting charge", async () => {
    const { jobId, requester } = await setupPaidJobFixture();
    await env.DB.prepare(
      "insert into user_subscription (id, user_id, status, stripe_customer_id, stripe_subscription_id, interval, price_id, cancel_at_period_end) values (?, ?, 'active', 'cus_pro', 'sub_pro', 'month', 'price_pro', 0)"
    )
      .bind(`sub-${crypto.randomUUID()}`, requester.id)
      .run();

    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Response.json({
        id: "cs_cast_pro",
        url: "https://checkout.stripe.test/cast-pro",
      })
    );
    const payResponse = await app.request(
      `/api/v1/stripe/casting-jobs/${jobId}/pay`,
      { headers: { Cookie: requester.cookie }, method: "POST" },
      { ...env, STRIPE_SECRET_KEY: "sk_test_value" }
    );
    expect(payResponse.status).toBe(200);
    const stored = await env.DB.prepare(
      "select application_fee_cents, charged_cents from casting_job where id = ?"
    )
      .bind(jobId)
      .first<{ application_fee_cents: number; charged_cents: number }>();
    // Pro pays 5% less up front; the caster's 90% payout is unchanged, so
    // the platform's cut is the 5% difference.
    expect(stored?.charged_cents).toBe(3800);
    expect(stored?.application_fee_cents).toBe(200);
  });

  it("pays the caster out of escrow when the job completes", async () => {
    const { caster, jobId } = await setupPaidJobFixture();
    await markJobPaid(jobId);

    const paid = await env.DB.prepare(
      "select payment_status, stripe_payment_intent_id from casting_job where id = ?"
    )
      .bind(jobId)
      .first<{ payment_status: string; stripe_payment_intent_id: string }>();
    expect(paid?.payment_status).toBe("paid");
    expect(paid?.stripe_payment_intent_id).toBe("pi_cast_1");

    // The caster claims the job and walks the on-site lifecycle; completing
    // it from uploading pays the escrowed money out.
    await env.DB.prepare(
      "update casting_job set caster_user_id = ?, status = 'uploading', application_fee_cents = 400, charged_cents = 4000 where id = ?"
    )
      .bind(caster.id, jobId)
      .run();

    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Response.json({ id: "tr_cast_1" })
    );
    const completeResponse = await app.request(
      `/api/v1/casting-jobs/${jobId}/status`,
      {
        body: JSON.stringify({ status: "completed" }),
        headers: {
          "Content-Type": "application/json",
          Cookie: caster.cookie,
        },
        method: "PATCH",
      },
      { ...env, STRIPE_SECRET_KEY: "sk_test_value" }
    );
    expect(completeResponse.status).toBe(200);

    const transferCall = vi
      .spyOn(globalThis, "fetch")
      .mock.calls.find((call) => String(call[0]).endsWith("/v1/transfers"));
    expect(transferCall).toBeTruthy();
    const transfer = new URLSearchParams(String(transferCall?.[1]?.body));
    expect(transfer.get("amount")).toBe("3600");
    expect(transfer.get("destination")).toBe("acct_caster_1");

    const paidOut = await env.DB.prepare(
      "select status, payment_status, paid_out_at, stripe_transfer_id from casting_job where id = ?"
    )
      .bind(jobId)
      .first<{
        paid_out_at: number | null;
        payment_status: string;
        status: string;
        stripe_transfer_id: string | null;
      }>();
    expect(paidOut).toMatchObject({
      payment_status: "paid",
      status: "completed",
      stripe_transfer_id: "tr_cast_1",
    });
    expect(paidOut?.paid_out_at).not.toBeNull();
  });

  it("refunds the escrowed payment when a paid job is cancelled", async () => {
    const { jobId, requester } = await setupPaidJobFixture();
    await markJobPaid(jobId);

    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Response.json({ id: "re_cast_1" })
    );
    const cancelResponse = await app.request(
      `/api/v1/casting-jobs/${jobId}/status`,
      {
        body: JSON.stringify({ status: "cancelled" }),
        headers: {
          "Content-Type": "application/json",
          Cookie: requester.cookie,
        },
        method: "PATCH",
      },
      { ...env, STRIPE_SECRET_KEY: "sk_test_value" }
    );
    expect(cancelResponse.status).toBe(200);
    const refunded = await env.DB.prepare(
      "select status, payment_status from casting_job where id = ?"
    )
      .bind(jobId)
      .first<{ payment_status: string; status: string }>();
    expect(refunded).toEqual({
      payment_status: "refunded",
      status: "cancelled",
    });
  });

  it("re-dispatches an accepted job after the no-show window", async () => {
    const { caster, jobId, requester } = await setupPaidJobFixture();
    await env.DB.prepare(
      "update casting_job set caster_user_id = ?, status = 'accepted', starts_at = ? where id = ?"
    )
      .bind(caster.id, Date.now() - 3_600_000, jobId)
      .run();

    const tooEarly = await app.request(
      `/api/v1/casting-jobs/${jobId}/redispatch`,
      {
        body: JSON.stringify({ status: "accepted" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
      env
    );
    expect(tooEarly.status).toBe(401);

    const stranger = await signUp("Zia Stranger");
    const strangerResponse = await app.request(
      `/api/v1/casting-jobs/${jobId}/redispatch`,
      { headers: { Cookie: stranger.cookie }, method: "POST" },
      env
    );
    expect(strangerResponse.status).toBe(404);

    const redispatchResponse = await app.request(
      `/api/v1/casting-jobs/${jobId}/redispatch`,
      { headers: { Cookie: requester.cookie }, method: "POST" },
      env
    );
    expect(redispatchResponse.status).toBe(200);
    const redispatched = await env.DB.prepare(
      "select caster_user_id, status from casting_job where id = ?"
    )
      .bind(jobId)
      .first<{ caster_user_id: null | string; status: string }>();
    expect(redispatched).toEqual({ caster_user_id: null, status: "requested" });
  });

  it("re-dispatch is refused inside the no-show grace window", async () => {
    const { caster, jobId, requester } = await setupPaidJobFixture();
    await env.DB.prepare(
      "update casting_job set caster_user_id = ?, status = 'accepted', starts_at = ? where id = ?"
    )
      .bind(caster.id, Date.now() + 600_000, jobId)
      .run();

    const response = await app.request(
      `/api/v1/casting-jobs/${jobId}/redispatch`,
      { headers: { Cookie: requester.cookie }, method: "POST" },
      env
    );
    expect(response.status).toBe(409);
  });

  it("refuses to pay a job that is not awaiting payment", async () => {
    const { caster, jobId, requester } = await setupPaidJobFixture();
    await env.DB.prepare(
      "update casting_job set caster_user_id = ?, status = 'accepted' where id = ?"
    )
      .bind(caster.id, jobId)
      .run();

    const response = await app.request(
      `/api/v1/stripe/casting-jobs/${jobId}/pay`,
      { headers: { Cookie: requester.cookie }, method: "POST" },
      { ...env, STRIPE_SECRET_KEY: "sk_test_value" }
    );
    expect(response.status).toBe(409);
  });
});
