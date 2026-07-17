import { env } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";

import app from "../index";

afterEach(() => {
  vi.restoreAllMocks();
});

const signUp = async (name: string) => {
  const username = `${name.toLowerCase().replaceAll(" ", "")}${crypto.randomUUID().slice(0, 8)}`;
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

  expect(cookie).toBeTruthy();

  return {
    cookie: cookie ?? "",
    id: body.user.id,
  };
};

describe("home feed API", () => {
  it("returns a mixed personalized feed from semantic, social, and local signals", async () => {
    const viewer = await signUp("Home Feed Viewer");
    const friend = await signUp("Home Feed Friend");
    const organizer = await signUp("Home Feed Organizer");
    const venueId = `feed-venue-${crypto.randomUUID()}`;
    const videoId = `feed-video-${crypto.randomUUID()}`;
    const eventId = `feed-event-${crypto.randomUUID()}`;
    const eventDocumentId = `feed-event-document-${crypto.randomUUID()}`;

    await env.DB.batch([
      env.DB.prepare(
        "update user_profile set bio = ?, skill_level = 'advanced', home_court_name = ?, home_city = 'Searcy', home_state = 'AR', home_latitude = 35.2468, home_longitude = -91.735, onboarding_status = 'complete' where user_id = ?"
      ).bind(
        "Competitive doubles, local tournaments, and match videos",
        "Berryhill Park",
        viewer.id
      ),
      env.DB.prepare(
        "insert into friendship (user_id, requester_user_id) values (?, ?)"
      ).bind(viewer.id, friend.id),
      env.DB.prepare(
        "insert into venue (id, name, city, state, latitude, longitude, venue_type) values (?, 'Berryhill Park', 'Searcy', 'AR', 35.2468, -91.735, 'park')"
      ).bind(venueId),
      env.DB.prepare(
        "insert into video (id, owner_user_id, title, description, status, visibility, venue_id) values (?, ?, 'Friend doubles highlights', 'Fast kitchen hands at Berryhill', 'ready', 'public', ?)"
      ).bind(videoId, friend.id, venueId),
      env.DB.prepare(
        "insert into event (id, organizer_user_id, name, description, starts_at, status, venue_id) values (?, ?, 'Advanced doubles ladder', 'Competitive local ladder night', ?, 'published', ?)"
      ).bind(eventId, organizer.id, Date.now() + 86_400_000, venueId),
      env.DB.prepare(
        "insert into search_document (id, entity_id, entity_type, title, content, embedding_status) values (?, ?, 'event', 'Advanced doubles ladder', 'Competitive local ladder night', 'ready')"
      ).bind(eventDocumentId, eventId),
    ]);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ embedding: { values: [0.1, 0.2] } })
    );

    const response = await app.request(
      "/api/v1/feed/home",
      { headers: { Cookie: viewer.cookie } },
      {
        ...env,
        SEARCH_INDEX: {
          query: () =>
            Promise.resolve({
              matches: [{ id: eventDocumentId, score: 0.96 }],
            }),
          upsert: () => Promise.resolve(),
        },
      }
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      algorithm: { mode: string; version: string };
      items: { entityType: string; id: string; reason: string }[];
    };

    expect(body.algorithm).toMatchObject({
      mode: "semantic-hybrid",
      version: "home-feed-v1",
    });
    expect(body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityType: "video",
          id: videoId,
          reason: "From your friends",
        }),
        expect.objectContaining({
          entityType: "event",
          id: eventId,
        }),
        expect.objectContaining({
          entityType: "venue",
          id: venueId,
        }),
      ])
    );
  });
});
