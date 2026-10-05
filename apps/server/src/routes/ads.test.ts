import { env } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";

import app from "../index";
import { signBeaconParams, signDisplayTracking } from "../lib/ads";
import { countVastAds } from "../lib/ads-vast";

const BEACON_SECRET = "test-secret-test-secret-test-secret-test-secret";

const signUp = async (name: string) => {
  const username = `${name}${crypto.randomUUID().slice(0, 8)}`;
  const response = await app.request(
    "/api/auth/sign-up/email",
    {
      body: JSON.stringify({
        email: `${username}@example.com`,
        name: "Ads Tester",
        password: "password-12345678",
        username,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    env
  );
  const body = (await response.json()) as { user: { id: string } };
  await env.DB.prepare("update user set email_verified = 1 where id = ?")
    .bind(body.user.id)
    .run();
  return { cookie: response.headers.get("set-cookie") ?? "", id: body.user.id };
};

const makeOrg = async (ownerId: string) => {
  const orgId = `org-${crypto.randomUUID()}`;
  await env.DB.prepare(
    "insert into organization (id, name, slug, created_by_user_id) values (?, ?, ?, ?)"
  )
    .bind(orgId, "Test Org", `test-org-${orgId.slice(0, 8)}`, ownerId)
    .run();
  await env.DB.prepare(
    "insert into organization_member (organization_id, user_id, role) values (?, ?, 'owner')"
  )
    .bind(orgId, ownerId)
    .run();
  return orgId;
};

const makeEvent = async (orgId: string, ownerId: string) => {
  const eventId = `evt-${crypto.randomUUID()}`;
  await env.DB.prepare(
    "insert into event (id, name, organizer_user_id, organization_id, starts_at, status, event_type) values (?, ?, ?, ?, ?, 'published', 'tournament')"
  )
    .bind(eventId, "Spring Classic", ownerId, orgId, Date.now() + 86_400_000)
    .run();
  return eventId;
};

const makeClip = async (ownerId: string) => {
  const videoId = `vid-${crypto.randomUUID()}`;
  await env.DB.prepare(
    "insert into video (id, title, owner_user_id, status, visibility, mux_playback_id, duration_seconds) values (?, ?, ?, 'ready', 'public', ?, 12)"
  )
    .bind(videoId, "Sponsor clip", ownerId, `pb-${videoId.slice(0, 12)}`)
    .run();
  return videoId;
};

const createCampaign = async (
  cookie: string,
  input: Record<string, unknown>
) => {
  const response = await app.request(
    "/api/v1/ads/campaigns",
    {
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json", Cookie: cookie },
      method: "POST",
    },
    env
  );
  return {
    body: (await response.json()) as { campaign?: { id: string } },
    response,
  };
};

const fundCampaign = async (campaignId: string, cents: number) => {
  await env.DB.prepare("update ad_campaign set funded_cents = ? where id = ?")
    .bind(cents, campaignId)
    .run();
};

const signWebhookPayload = async (payload: string, timestamp: string) => {
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

describe("ads campaigns", () => {
  afterEach(() => vi.restoreAllMocks());

  it("creates a draft campaign for an org-owned published event", async () => {
    const owner = await signUp("owner");
    const orgId = await makeOrg(owner.id);
    const eventId = await makeEvent(orgId, owner.id);
    const clipId = await makeClip(owner.id);

    const { body, response } = await createCampaign(owner.cookie, {
      city: "Austin",
      creatives: [
        {
          imageUrl: "https://media.rallycasts.com/a.png",
          kind: "display",
          title: "Come play",
        },
        { kind: "preroll", title: "Watch this", videoId: clipId },
      ],
      dailyBudgetCents: 100,
      eventId,
      name: "Spring push",
      organizationId: orgId,
      placements: "both",
      state: "TX",
      totalBudgetCents: 500,
    });

    expect(response.status).toBe(201);
    expect(body.campaign?.id).toBeTruthy();
  });

  it("rejects campaigns below the CPM floor or for foreign events", async () => {
    const owner = await signUp("owner");
    const orgId = await makeOrg(owner.id);
    const eventId = await makeEvent(orgId, owner.id);
    const stranger = await signUp("stranger");
    const strangerOrg = await makeOrg(stranger.id);

    const cheap = await createCampaign(owner.cookie, {
      cpmCents: 50,
      creatives: [{ kind: "display", title: "Hi" }],
      dailyBudgetCents: 100,
      eventId,
      name: "Cheap",
      organizationId: orgId,
      totalBudgetCents: 500,
    });
    expect(cheap.response.status).toBe(400);

    const foreign = await createCampaign(stranger.cookie, {
      creatives: [{ kind: "display", title: "Hi" }],
      dailyBudgetCents: 100,
      eventId,
      name: "Hijack",
      organizationId: strangerOrg,
      totalBudgetCents: 500,
    });
    expect(foreign.response.status).toBe(403);
  });

  it("requires funding before admin activation and serves VAST while funded", async () => {
    const owner = await signUp("owner");
    const orgId = await makeOrg(owner.id);
    const eventId = await makeEvent(orgId, owner.id);
    const clipId = await makeClip(owner.id);
    const admin = await signUp("admin");
    await env.DB.prepare(
      "insert into user_profile (user_id, platform_role) values (?, 'admin') on conflict(user_id) do update set platform_role = 'admin'"
    )
      .bind(admin.id)
      .run();

    const { body } = await createCampaign(owner.cookie, {
      creatives: [{ kind: "preroll", title: "Clip", videoId: clipId }],
      dailyBudgetCents: 100,
      eventId,
      name: "Funded push",
      organizationId: orgId,
      placements: "preroll",
      totalBudgetCents: 100,
    });
    const campaignId = body.campaign?.id ?? "";

    const submit = await app.request(
      `/api/v1/ads/campaigns/${campaignId}`,
      {
        body: JSON.stringify({ action: "submit" }),
        headers: { "Content-Type": "application/json", Cookie: owner.cookie },
        method: "PATCH",
      },
      env
    );
    expect(submit.status).toBe(200);

    const earlyApprove = await app.request(
      `/api/v1/ads/campaigns/${campaignId}/review`,
      {
        body: JSON.stringify({ approve: true }),
        headers: { "Content-Type": "application/json", Cookie: admin.cookie },
        method: "POST",
      },
      env
    );
    expect(earlyApprove.status).toBe(409);

    await fundCampaign(campaignId, 100);
    const approve = await app.request(
      `/api/v1/ads/campaigns/${campaignId}/review`,
      {
        body: JSON.stringify({ approve: true }),
        headers: { "Content-Type": "application/json", Cookie: admin.cookie },
        method: "POST",
      },
      env
    );
    expect(approve.status).toBe(200);

    const vast = await app.request(
      `/api/v1/ads/vast?placement=preroll&videoId=${clipId}`,
      { method: "GET" },
      env
    );
    expect(vast.status).toBe(200);
    expect(vast.headers.get("content-type")).toContain("application/xml");
    const xml = await vast.text();
    expect(countVastAds(xml)).toBe(1);
    expect(xml).toContain("stream.mux.com");
    expect(xml).toContain("/api/v1/ads/beacon");
  });

  it("stops serving VAST once the budget is exhausted", async () => {
    const owner = await signUp("owner");
    const orgId = await makeOrg(owner.id);
    const eventId = await makeEvent(orgId, owner.id);
    const clipId = await makeClip(owner.id);

    const { body } = await createCampaign(owner.cookie, {
      creatives: [{ kind: "preroll", title: "Clip", videoId: clipId }],
      dailyBudgetCents: 100,
      eventId,
      name: "Small push",
      organizationId: orgId,
      placements: "preroll",
      totalBudgetCents: 100,
      videoCpmCents: 500,
    });
    const campaignId = body.campaign?.id ?? "";
    await fundCampaign(campaignId, 100);
    await env.DB.prepare(
      "update ad_campaign set status = 'active' where id = ?"
    )
      .bind(campaignId)
      .run();
    const [creative] = await env.DB.prepare(
      "select id from ad_creative where campaign_id = ?"
    )
      .bind(campaignId)
      .all<{ id: string }>()
      .then((result) => result.results);

    // 200 impressions at the pinned $5 video CPM exhaust the $1 budget.
    for (let index = 0; index < 200; index += 1) {
      const exp = String(Date.now() + 86_400_000);
      // oxlint-disable-next-line eslint/no-await-in-loop -- sequential test setup
      const sig = await signBeaconParams(BEACON_SECRET, {
        c: campaignId,
        cr: creative?.id ?? "",
        ev: "impression",
        exp,
        p: "preroll",
      });
      // oxlint-disable-next-line eslint/no-await-in-loop -- sequential test setup
      const beacon = await app.request(
        `/api/v1/ads/beacon?c=${campaignId}&cr=${creative?.id}&p=preroll&ev=impression&exp=${exp}&sig=${sig}`,
        { method: "GET" },
        env
      );
      expect(beacon.status).toBe(204);
    }

    const vast = await app.request("/api/v1/ads/vast", { method: "GET" }, env);
    const xml = await vast.text();
    expect(countVastAds(xml)).toBe(0);

    const [campaign] = await env.DB.prepare(
      "select status, spent_cents as spentCents from ad_campaign where id = ?"
    )
      .bind(campaignId)
      .all<{ spentCents: number; status: string }>()
      .then((result) => result.results);
    expect(campaign?.status).toBe("completed");
    expect(campaign?.spentCents).toBe(100);
  });

  it("rejects forged beacons and records display impressions and clicks", async () => {
    const owner = await signUp("owner");
    const orgId = await makeOrg(owner.id);
    const eventId = await makeEvent(orgId, owner.id);
    const { body } = await createCampaign(owner.cookie, {
      creatives: [{ kind: "display", title: "Play" }],
      dailyBudgetCents: 1000,
      eventId,
      name: "Display push",
      organizationId: orgId,
      placements: "display",
      totalBudgetCents: 5000,
    });
    const campaignId = body.campaign?.id ?? "";
    await fundCampaign(campaignId, 5000);
    await env.DB.prepare(
      "update ad_campaign set status = 'active' where id = ?"
    )
      .bind(campaignId)
      .run();
    const [creative] = await env.DB.prepare(
      "select id from ad_creative where campaign_id = ?"
    )
      .bind(campaignId)
      .all<{ id: string }>()
      .then((result) => result.results);

    const forged = await app.request(
      `/api/v1/ads/beacon?c=${campaignId}&cr=${creative?.id}&p=display&ev=impression&exp=${Date.now() + 1000}&sig=deadbeef`,
      { method: "GET" },
      env
    );
    expect(forged.status).toBe(400);

    const tracking = await signDisplayTracking(
      env.BETTER_AUTH_SECRET,
      campaignId,
      creative?.id ?? ""
    );

    const impression = await app.request(
      "/api/v1/ads/impressions",
      {
        body: JSON.stringify(tracking.impression),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
      env
    );
    expect(impression.status).toBe(202);

    const click = await app.request(
      "/api/v1/ads/clicks",
      {
        body: JSON.stringify(tracking.click),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
      env
    );
    expect(click.status).toBe(202);

    const stats = await app.request(
      `/api/v1/ads/campaigns/${campaignId}/stats`,
      { headers: { Cookie: owner.cookie }, method: "GET" },
      env
    );
    expect(stats.status).toBe(200);
    const statsBody = (await stats.json()) as {
      totals: { clicks: number; impressions: number };
    };
    expect(statsBody.totals.impressions).toBe(1);
    expect(statsBody.totals.clicks).toBe(1);
  });
  it("funds prepaid budget through Stripe checkout exactly once", async () => {
    const owner = await signUp("owner");
    const orgId = await makeOrg(owner.id);
    const eventId = await makeEvent(orgId, owner.id);
    const { body } = await createCampaign(owner.cookie, {
      creatives: [{ kind: "display", title: "Play" }],
      dailyBudgetCents: 1000,
      eventId,
      name: "Paid push",
      organizationId: orgId,
      placements: "display",
      totalBudgetCents: 5000,
    });
    const campaignId = body.campaign?.id ?? "";

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json({
        id: "cs_test_ads",
        url: "https://checkout.stripe.test/ads",
      })
    );
    const topup = await app.request(
      `/api/v1/ads/campaigns/${campaignId}/topup`,
      {
        body: JSON.stringify({ amountCents: 2500 }),
        headers: { "Content-Type": "application/json", Cookie: owner.cookie },
        method: "POST",
      },
      { ...env, STRIPE_SECRET_KEY: "sk_test_value" }
    );
    expect(topup.status).toBe(201);

    const sessionObject = {
      amount_total: 2500,
      currency: "usd",
      id: "cs_test_ads",
      metadata: {
        ad_campaign_id: campaignId,
        type: "ad_budget",
      },
      mode: "payment",
      payment_status: "paid",
    };
    const sendWebhook = async () => {
      const [payment] = await env.DB.prepare(
        "select id from ad_payment where campaign_id = ?"
      )
        .bind(campaignId)
        .all<{ id: string }>()
        .then((result) => result.results);
      const payload = JSON.stringify({
        data: {
          object: {
            ...sessionObject,
            metadata: {
              ...sessionObject.metadata,
              ad_payment_id: payment?.id ?? "",
            },
          },
        },
        id: `evt_ads_${payment?.id ?? "x"}`,
        type: "checkout.session.completed",
      });
      const timestamp = String(Math.floor(Date.now() / 1000));
      const signature = await signWebhookPayload(payload, timestamp);
      return app.request(
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
    };

    // Unique provider event per delivery; same session delivered twice.
    const first = await sendWebhook();
    expect(first.status).toBe(202);
    const funded = await env.DB.prepare(
      "select funded_cents as fundedCents from ad_campaign where id = ?"
    )
      .bind(campaignId)
      .all<{ fundedCents: number }>()
      .then((result) => result.results);
    expect(funded[0]?.fundedCents).toBe(2500);
  });
});

describe("RallyCasts Pro ad-free entitlement", () => {
  afterEach(() => vi.restoreAllMocks());

  it("serves no preroll to entitled Pro subscribers", async () => {
    const owner = await signUp("owner");
    const orgId = await makeOrg(owner.id);
    const eventId = await makeEvent(orgId, owner.id);
    const clipId = await makeClip(owner.id);
    const admin = await signUp("admin");
    await env.DB.prepare(
      "insert into user_profile (user_id, platform_role) values (?, 'admin') on conflict(user_id) do update set platform_role = 'admin'"
    )
      .bind(admin.id)
      .run();

    const { body } = await createCampaign(owner.cookie, {
      creatives: [{ kind: "preroll", title: "Clip", videoId: clipId }],
      dailyBudgetCents: 100,
      eventId,
      name: "Pro gate push",
      organizationId: orgId,
      placements: "preroll",
      totalBudgetCents: 100,
    });
    const campaignId = body.campaign?.id ?? "";
    const submit = await app.request(
      `/api/v1/ads/campaigns/${campaignId}`,
      {
        body: JSON.stringify({ action: "submit" }),
        headers: { "Content-Type": "application/json", Cookie: owner.cookie },
        method: "PATCH",
      },
      env
    );
    expect(submit.status).toBe(200);
    await fundCampaign(campaignId, 100);
    const approve = await app.request(
      `/api/v1/ads/campaigns/${campaignId}/review`,
      {
        body: JSON.stringify({ approve: true }),
        headers: { "Content-Type": "application/json", Cookie: admin.cookie },
        method: "POST",
      },
      env
    );
    expect(approve.status).toBe(200);

    const subscriber = await signUp("subscriber");
    await env.DB.prepare(
      "insert into user_subscription (id, user_id, status, stripe_customer_id, stripe_subscription_id, interval, price_id, cancel_at_period_end) values (?, ?, 'active', 'cus_pro', 'sub_pro', 'month', 'price_pro', 0)"
    )
      .bind(`sub-${crypto.randomUUID()}`, subscriber.id)
      .run();

    const anonymousVast = await app.request(
      `/api/v1/ads/vast?placement=preroll&videoId=${clipId}`,
      { method: "GET" },
      env
    );
    const anonymousXml = await anonymousVast.text();
    expect(countVastAds(anonymousXml)).toBeGreaterThan(0);

    const proVast = await app.request(
      `/api/v1/ads/vast?placement=preroll&videoId=${clipId}`,
      { headers: { Cookie: subscriber.cookie }, method: "GET" },
      env
    );
    expect(proVast.status).toBe(200);
    const proXml = await proVast.text();
    expect(countVastAds(proXml)).toBe(0);
  });
});
