import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it, vi } from "vitest";

import app from "../index";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

const mockGooglePlaceDetails = () => {
  mockFetch.mockResolvedValueOnce({
    json: () => ({
      displayName: {
        text: "Tournament Park",
      },
      formattedAddress: "123 Tournament Way, Austin, TX 78701",
      id: "event_place",
      location: {
        latitude: 30.2672,
        longitude: -97.7431,
      },
      rating: 4.8,
      types: ["park"],
      userRatingCount: 120,
    }),
    ok: true,
  });
};

const signUp = async (name: string, email?: string) => {
  const username = `${name.toLowerCase().replaceAll(" ", "")}${crypto.randomUUID().slice(0, 8)}`;
  const response = await app.request(
    "/api/auth/sign-up/email",
    {
      body: JSON.stringify({
        email: email ?? `${username}@example.com`,
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

  expect(cookie).toBeTruthy();

  return {
    cookie: cookie ?? "",
    id: body.user.id,
  };
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

const jsonRequest = (
  path: string,
  cookie: string,
  body: Record<string, unknown>,
  method = "POST"
) =>
  app.request(
    path,
    {
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      method,
    },
    env
  );

const activateOrganizer = (cookie: string) =>
  jsonRequest(
    "/api/v1/profile/me",
    cookie,
    {
      isOrganizer: true,
    },
    "PATCH"
  );

describe("events API", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("promotes configured RallyCasts admins to organizers and labels hosted events", async () => {
    const admin = await signUp("RallyCasts Admin", "camstewart7@gmail.com");
    await promoteToAdmin(admin.id);
    const profileResponse = await app.request(
      "/api/v1/profile/me",
      {
        headers: {
          Cookie: admin.cookie,
        },
      },
      env
    );

    expect(profileResponse.status).toBe(200);
    await expect(profileResponse.json()).resolves.toMatchObject({
      isPlatformAdmin: true,
      profile: {
        accountTier: "premium",
        isOrganizer: true,
        onboardingStatus: "complete",
      },
    });

    mockGooglePlaceDetails();
    const eventResponse = await jsonRequest("/api/v1/events", admin.cookie, {
      capacity: 16,
      eventType: "tournament",
      googlePlaceId: "event_place_admin",
      name: "RallyCasts Friday Night Bracket",
      startsAt: new Date("2027-05-01T23:00:00.000Z").toISOString(),
      status: "published",
    });

    expect(eventResponse.status).toBe(201);
    await expect(eventResponse.json()).resolves.toMatchObject({
      event: {
        hostLabel: "RallyCasts",
        hostType: "rallycasts",
        organizerUserId: admin.id,
      },
    });
  });

  it("lets players join events and organizers manage bracket matches", async () => {
    const organizer = await signUp("Olive Organizer");
    await promoteToAdmin(organizer.id);
    const playerOne = await signUp("Parker Player");
    const playerTwo = await signUp("Taylor Thirdshot");
    const startsAt = new Date("2027-04-10T15:00:00.000Z").toISOString();

    const organizerProfileResponse = await activateOrganizer(organizer.cookie);
    expect(organizerProfileResponse.status).toBe(200);

    mockGooglePlaceDetails();
    const eventResponse = await jsonRequest(
      "/api/v1/events",
      organizer.cookie,
      {
        capacity: 2,
        eventType: "tournament",
        googlePlaceId: "event_place_ladder",
        name: "Spring Ladder",
        startsAt,
        status: "published",
      }
    );

    expect(eventResponse.status).toBe(201);
    const eventData = (await eventResponse.json()) as {
      event: { id: string };
    };
    const eventId = eventData.event.id;

    const unauthorizedPatch = await jsonRequest(
      `/api/v1/events/${eventId}`,
      playerOne.cookie,
      { name: "Hijacked Ladder" },
      "PATCH"
    );

    expect(unauthorizedPatch.status).toBe(404);

    const joinOne = await jsonRequest(
      `/api/v1/events/${eventId}/join`,
      playerOne.cookie,
      {}
    );
    const joinTwo = await jsonRequest(
      `/api/v1/events/${eventId}/join`,
      playerTwo.cookie,
      {}
    );

    expect(joinOne.status).toBe(200);
    expect(joinTwo.status).toBe(200);

    const playersResponse = await app.request(
      `/api/v1/events/${eventId}/players`,
      {},
      env
    );
    const playersData = (await playersResponse.json()) as {
      players: { player: { id: string } }[];
    };

    expect(playersData.players.map(({ player }) => player.id)).toEqual([
      playerOne.id,
      playerTwo.id,
    ]);

    const unauthorizedBracket = await jsonRequest(
      `/api/v1/events/${eventId}/bracket/generate`,
      playerOne.cookie,
      {}
    );

    expect(unauthorizedBracket.status).toBe(404);

    const bracketResponse = await jsonRequest(
      `/api/v1/events/${eventId}/bracket/generate`,
      organizer.cookie,
      {}
    );

    expect(bracketResponse.status).toBe(201);
    const bracketData = (await bracketResponse.json()) as {
      matches: {
        id: string;
        playerOneUserId: string;
        playerTwoUserId: string;
      }[];
    };
    const [match] = bracketData.matches;

    expect(match).toMatchObject({
      playerOneUserId: playerOne.id,
      playerTwoUserId: playerTwo.id,
    });

    const firstScoreResponse = await jsonRequest(
      `/api/v1/events/${eventId}/matches/${match?.id}/scores`,
      playerOne.cookie,
      {
        playerOneScore: 11,
        playerTwoScore: 8,
        winnerUserId: playerOne.id,
      }
    );

    expect(firstScoreResponse.status).toBe(200);
    await expect(firstScoreResponse.json()).resolves.toMatchObject({
      status: "pending",
    });

    const confirmScoreResponse = await jsonRequest(
      `/api/v1/events/${eventId}/matches/${match?.id}/scores`,
      playerTwo.cookie,
      {
        playerOneScore: 11,
        playerTwoScore: 8,
        winnerUserId: playerOne.id,
      }
    );

    expect(confirmScoreResponse.status).toBe(200);
    await expect(confirmScoreResponse.json()).resolves.toMatchObject({
      status: "confirmed",
    });

    const liveResponse = await app.request(
      `/api/v1/events/${eventId}/live`,
      {},
      env
    );

    expect(liveResponse.status).toBe(404);

    const matchUpdate = await jsonRequest(
      `/api/v1/events/${eventId}/matches/${match?.id}`,
      organizer.cookie,
      {
        playerOneScore: 11,
        playerTwoScore: 8,
        status: "completed",
        winnerUserId: playerOne.id,
      },
      "PATCH"
    );

    expect(matchUpdate.status).toBe(200);
  });

  it("does not cancel a paid event without a configured refund path", async () => {
    const organizer = await signUp("Paid Event Organizer");
    await promoteToAdmin(organizer.id);
    const eventId = `paid-cancel-${crypto.randomUUID()}`;
    const registrationId = `paid-registration-${crypto.randomUUID()}`;
    const paymentId = `paid-payment-${crypto.randomUUID()}`;
    await env.DB.batch([
      env.DB.prepare(
        "insert into event (id, name, organizer_user_id, starts_at, status, event_type, entry_fee_cents) values (?, ?, ?, ?, 'published', 'tournament', 2500)"
      ).bind(
        eventId,
        "Paid cancellation test",
        organizer.id,
        Date.now() + 86_400_000
      ),
      env.DB.prepare(
        "insert into event_registration (id, event_id, user_id, status, payment_status, paid_amount_cents) values (?, ?, ?, 'registered', 'paid', 2500)"
      ).bind(registrationId, eventId, organizer.id),
      env.DB.prepare(
        "insert into event_payment (id, event_id, registration_id, user_id, amount_cents, status, stripe_payment_intent_id) values (?, ?, ?, ?, 2500, 'succeeded', ?)"
      ).bind(
        paymentId,
        eventId,
        registrationId,
        organizer.id,
        "pi_missing_config"
      ),
    ]);

    const response = await app.request(
      `/api/v1/events/${eventId}`,
      {
        body: JSON.stringify({ status: "cancelled" }),
        headers: {
          "Content-Type": "application/json",
          Cookie: organizer.cookie,
        },
        method: "PATCH",
      },
      { ...env, STRIPE_SECRET_KEY: "" }
    );

    expect(response.status).toBe(503);
    const eventRecord = await env.DB.prepare(
      "select status from event where id = ?"
    )
      .bind(eventId)
      .first<{ status: string }>();
    expect(eventRecord).toEqual({ status: "published" });
  });

  it("rejects event creation until the user has organizer tools enabled", async () => {
    const player = await signUp("Plain Player");
    const response = await jsonRequest("/api/v1/events", player.cookie, {
      capacity: 12,
      eventType: "open_play",
      googlePlaceId: "event_place_rejected",
      name: "Unauthorized Open Play",
      startsAt: new Date("2027-06-01T18:00:00.000Z").toISOString(),
      status: "published",
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      message: "Organizer profile required",
    });
  });

  it("shows unpublished events to their organizer but hides them from everyone else", async () => {
    const organizer = await signUp("Dana Drafts");
    await promoteToAdmin(organizer.id);
    await activateOrganizer(organizer.cookie);
    const stranger = await signUp("Sam Stranger");

    const createResponse = await jsonRequest(
      "/api/v1/events",
      organizer.cookie,
      {
        capacity: 8,
        eventType: "tournament",
        name: "Draft Classic",
        startsAt: new Date("2027-07-01T15:00:00.000Z").toISOString(),
        status: "draft",
      }
    );
    expect(createResponse.status).toBe(201);
    const created = (await createResponse.json()) as { event: { id: string } };
    const eventId = created.event.id;

    const organizerView = await app.request(
      `/api/v1/events/${eventId}`,
      { headers: { Cookie: organizer.cookie } },
      env
    );
    expect(organizerView.status).toBe(200);
    await expect(organizerView.json()).resolves.toMatchObject({
      event: { id: eventId, status: "draft" },
    });

    const anonymousView = await app.request(
      `/api/v1/events/${eventId}`,
      {},
      env
    );
    expect(anonymousView.status).toBe(404);

    const strangerView = await app.request(
      `/api/v1/events/${eventId}`,
      { headers: { Cookie: stranger.cookie } },
      env
    );
    expect(strangerView.status).toBe(404);
  });

  it("shows pending-payment registrations to the organizer but not to the public", async () => {
    const organizer = await signUp("Penny Organizer");
    const eventId = `evt-${crypto.randomUUID()}`;
    await env.DB.prepare(
      "insert into event (id, name, organizer_user_id, starts_at, status, event_type) values (?, ?, ?, ?, 'published', 'tournament')"
    )
      .bind(eventId, "Paid Bracket", organizer.id, Date.now() + 86_400_000)
      .run();
    const pendingUser = await signUp("Umbra Unpaid");
    await env.DB.prepare(
      "insert into event_registration (id, event_id, user_id, status) values (?, ?, ?, 'pending_payment')"
    )
      .bind(`reg-${crypto.randomUUID()}`, eventId, pendingUser.id)
      .run();
    const paidUser = await signUp("Rita Registered");
    await env.DB.prepare(
      "insert into event_registration (id, event_id, user_id, status) values (?, ?, ?, 'registered')"
    )
      .bind(`reg-${crypto.randomUUID()}`, eventId, paidUser.id)
      .run();

    const organizerView = await app.request(
      `/api/v1/events/${eventId}/players`,
      { headers: { Cookie: organizer.cookie } },
      env
    );
    expect(organizerView.status).toBe(200);
    const organizerPlayers = (await organizerView.json()) as {
      players: { registration: { status: string } }[];
    };
    const organizerStatuses = organizerPlayers.players.map(
      ({ registration }) => registration.status
    );
    expect(organizerStatuses).toContain("pending_payment");
    expect(organizerStatuses).toContain("registered");

    const publicView = await app.request(
      `/api/v1/events/${eventId}/players`,
      {},
      env
    );
    expect(publicView.status).toBe(200);
    const publicPlayers = (await publicView.json()) as {
      players: { registration: { status: string } }[];
    };
    const publicStatuses = publicPlayers.players.map(
      ({ registration }) => registration.status
    );
    expect(publicStatuses).toContain("registered");
    expect(publicStatuses).not.toContain("pending_payment");
  });

  it("shows completed events' rosters and brackets to their manager only", async () => {
    const organizer = await signUp("Cara Completed");
    const eventId = `evt-${crypto.randomUUID()}`;
    await env.DB.prepare(
      "insert into event (id, name, organizer_user_id, starts_at, status, event_type) values (?, ?, ?, ?, 'completed', 'tournament')"
    )
      .bind(eventId, "Finished Bracket", organizer.id, Date.now() - 86_400_000)
      .run();
    const registrationId = `reg-${crypto.randomUUID()}`;
    const rosterPlayer = await signUp("Rita Roster");
    await env.DB.prepare(
      "insert into event_registration (id, event_id, user_id, status) values (?, ?, ?, 'checked_in')"
    )
      .bind(registrationId, eventId, rosterPlayer.id)
      .run();
    await env.DB.prepare(
      "insert into event_match (id, event_id, round, status) values (?, ?, 1, 'completed')"
    )
      .bind(`match-${crypto.randomUUID()}`, eventId)
      .run();

    const organizerPlayers = await app.request(
      `/api/v1/events/${eventId}/players`,
      { headers: { Cookie: organizer.cookie } },
      env
    );
    expect(organizerPlayers.status).toBe(200);
    const roster = (await organizerPlayers.json()) as {
      players: unknown[];
    };
    expect(roster.players).toHaveLength(1);

    const publicPlayers = await app.request(
      `/api/v1/events/${eventId}/players`,
      {},
      env
    );
    expect(publicPlayers.status).toBe(200);
    await expect(publicPlayers.json()).resolves.toMatchObject({
      players: [],
    });

    const organizerBracket = await app.request(
      `/api/v1/events/${eventId}/bracket`,
      { headers: { Cookie: organizer.cookie } },
      env
    );
    expect(organizerBracket.status).toBe(200);
    const bracket = (await organizerBracket.json()) as {
      matches: unknown[];
    };
    expect(bracket.matches).toHaveLength(1);

    const publicBracket = await app.request(
      `/api/v1/events/${eventId}/bracket`,
      {},
      env
    );
    expect(publicBracket.status).toBe(404);
  });

  it("rejects unsupported image uploads before writing to R2", async () => {
    const user = await signUp("Image Tester");
    await env.DB.prepare("update user set email_verified = 1 where id = ?")
      .bind(user.id)
      .run();
    const body = new FormData();
    body.set(
      "file",
      new File(["not an image"], "notes.txt", { type: "text/plain" })
    );

    const response = await app.request(
      "/api/v1/upload/image",
      {
        body,
        headers: {
          Cookie: user.cookie,
        },
        method: "POST",
      },
      env
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      message: "Only AVIF, JPEG, PNG, and WebP images are supported",
    });
  });
});
