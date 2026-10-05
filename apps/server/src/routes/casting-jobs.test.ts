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

const createJob = async (cookie: string) => {
  const response = await app.request(
    "/api/v1/casting-jobs",
    {
      body: JSON.stringify({
        priceCents: 2500,
        requestedHours: 2,
        startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }),
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      method: "POST",
    },
    env
  );

  expect(response.status).toBe(201);
  const body = (await response.json()) as { job: { id: string } };
  return body.job.id;
};

const patchStatus = (id: string, cookie: string, status: string) =>
  app.request(
    `/api/v1/casting-jobs/${id}/status`,
    {
      body: JSON.stringify({ status }),
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      method: "PATCH",
    },
    env
  );

describe("casting job status transitions", () => {
  it("lets the requester submit and cancel, but not complete", async () => {
    const requester = await signUp("Dana Requester");

    const submittedJobId = await createJob(requester.cookie);
    // Jobs are created as requested; restating the current status is a no-op.
    const restated = await patchStatus(
      submittedJobId,
      requester.cookie,
      "requested"
    );
    expect(restated.status).toBe(200);

    const cancelJobId = await createJob(requester.cookie);
    const cancelled = await patchStatus(
      cancelJobId,
      requester.cookie,
      "cancelled"
    );
    expect(cancelled.status).toBe(200);

    const reopened = await patchStatus(
      cancelJobId,
      requester.cookie,
      "requested"
    );
    expect(reopened.status).toBe(403);

    const completed = await patchStatus(
      await createJob(requester.cookie),
      requester.cookie,
      "completed"
    );
    expect(completed.status).toBe(403);
  });

  it("walks the caster through the on-site lifecycle in order", async () => {
    const requester = await signUp("Evan Requester");
    const caster = await signUp("Fay Caster");
    const stranger = await signUp("Gus Stranger");

    const jobId = await createJob(requester.cookie);
    await env.DB.prepare(
      "insert into caster_profile (user_id, display_name, status) values (?, ?, ?)"
    )
      .bind(caster.id, "Fay Caster", "active")
      .run();
    await env.DB.prepare(
      "update casting_job set caster_user_id = ?, status = ? where id = ?"
    )
      .bind(caster.id, "accepted", jobId)
      .run();

    const strangerAttempt = await patchStatus(
      jobId,
      stranger.cookie,
      "arrived"
    );
    expect(strangerAttempt.status).toBe(404);

    const skipAhead = await patchStatus(jobId, caster.cookie, "completed");
    expect(skipAhead.status).toBe(403);

    for (const status of ["arrived", "recording", "uploading", "completed"]) {
      // oxlint-disable-next-line eslint/no-await-in-loop -- sequential test setup
      const response = await patchStatus(jobId, caster.cookie, status);
      expect(response.status).toBe(200);
    }

    const afterComplete = await patchStatus(jobId, caster.cookie, "failed");
    expect(afterComplete.status).toBe(403);
  });
});

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
    "insert into casting_job (id, requester_user_id, caster_user_id, status, price_cents, requested_hours, starts_at, currency) values (?, ?, ?, 'accepted', 4000, 2, ?, 'usd')"
  )
    .bind(jobId, requester.id, caster.id, Date.now() + 86_400_000)
    .run();
  return { caster, jobId, requester };
};

describe("Casting payouts", () => {
  afterEach(() => vi.restoreAllMocks());

  it("pays an accepted job through Stripe with the 10% platform fee", async () => {
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
    expect(sent.get("payment_intent_data[transfer_data][destination]")).toBe(
      "acct_caster_1"
    );
    // 10% of 4000 cents
    expect(sent.get("payment_intent_data[application_fee_amount]")).toBe("400");
  });

  it("marks a job paid from a signed webhook and refunds on cancel", async () => {
    const { caster, jobId } = await setupPaidJobFixture();

    const payload = JSON.stringify({
      data: {
        object: {
          id: "cs_cast_2",
          metadata: { casting_job_id: jobId },
          mode: "payment",
          payment_intent: "pi_cast_1",
          payment_status: "paid",
        },
      },
      id: `evt_${crypto.randomUUID()}`,
      type: "checkout.session.completed",
    });
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
      {
        ...env,
        STRIPE_SECRET_KEY: "sk_test_value",
        STRIPE_WEBHOOK_SECRET: "stripe-webhook-secret",
      }
    );
    expect(webhookResponse.status).toBe(202);

    const paid = await env.DB.prepare(
      "select payment_status, stripe_payment_intent_id from casting_job where id = ?"
    )
      .bind(jobId)
      .first<{ payment_status: string; stripe_payment_intent_id: string }>();
    expect(paid?.payment_status).toBe("paid");
    expect(paid?.stripe_payment_intent_id).toBe("pi_cast_1");

    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Response.json({ id: "re_cast_1" })
    );
    const cancelResponse = await app.request(
      `/api/v1/casting-jobs/${jobId}/status`,
      {
        body: JSON.stringify({ status: "cancelled" }),
        headers: {
          "Content-Type": "application/json",
          Cookie: caster.cookie,
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

  it("refuses to pay before a caster's offer is accepted", async () => {
    const requester = await signUp("Kim Requester");
    await env.DB.prepare("update user set email_verified = 1 where id = ?")
      .bind(requester.id)
      .run();
    const jobId = `job-${crypto.randomUUID()}`;
    await env.DB.prepare(
      "insert into casting_job (id, requester_user_id, status, price_cents, requested_hours, starts_at, currency) values (?, ?, 'requested', 4000, 2, ?, 'usd')"
    )
      .bind(jobId, requester.id, Date.now() + 86_400_000)
      .run();

    const response = await app.request(
      `/api/v1/stripe/casting-jobs/${jobId}/pay`,
      { headers: { Cookie: requester.cookie }, method: "POST" },
      { ...env, STRIPE_SECRET_KEY: "sk_test_value" }
    );
    expect(response.status).toBe(409);
  });
});
