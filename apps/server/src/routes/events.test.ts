import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

import app from "../index";

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
    "/api/profile/me",
    cookie,
    {
      isOrganizer: true,
    },
    "PATCH"
  );

describe("events API", () => {
  it("promotes configured RallyCasts admins to organizers and labels hosted events", async () => {
    const admin = await signUp("RallyCasts Admin", "camstewart7@gmail.com");
    const profileResponse = await app.request(
      "/api/profile/me",
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

    const eventResponse = await jsonRequest("/api/events", admin.cookie, {
      capacity: 16,
      eventType: "tournament",
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
    const playerOne = await signUp("Parker Player");
    const playerTwo = await signUp("Taylor Thirdshot");
    const startsAt = new Date("2027-04-10T15:00:00.000Z").toISOString();

    const organizerProfileResponse = await activateOrganizer(organizer.cookie);
    expect(organizerProfileResponse.status).toBe(200);

    const eventResponse = await jsonRequest("/api/events", organizer.cookie, {
      capacity: 2,
      eventType: "tournament",
      name: "Spring Ladder",
      startsAt,
      status: "published",
    });

    expect(eventResponse.status).toBe(201);
    const eventData = (await eventResponse.json()) as {
      event: { id: string };
    };
    const eventId = eventData.event.id;

    const unauthorizedPatch = await jsonRequest(
      `/api/events/${eventId}`,
      playerOne.cookie,
      { name: "Hijacked Ladder" },
      "PATCH"
    );

    expect(unauthorizedPatch.status).toBe(404);

    const joinOne = await jsonRequest(
      `/api/events/${eventId}/join`,
      playerOne.cookie,
      {}
    );
    const joinTwo = await jsonRequest(
      `/api/events/${eventId}/join`,
      playerTwo.cookie,
      {}
    );

    expect(joinOne.status).toBe(200);
    expect(joinTwo.status).toBe(200);

    const playersResponse = await app.request(
      `/api/events/${eventId}/players`,
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
      `/api/events/${eventId}/bracket/generate`,
      playerOne.cookie,
      {}
    );

    expect(unauthorizedBracket.status).toBe(404);

    const bracketResponse = await jsonRequest(
      `/api/events/${eventId}/bracket/generate`,
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
      `/api/events/${eventId}/matches/${match?.id}/scores`,
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
      `/api/events/${eventId}/matches/${match?.id}/scores`,
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
      `/api/events/${eventId}/live`,
      {},
      env
    );

    expect(liveResponse.status).toBe(200);

    const matchUpdate = await jsonRequest(
      `/api/events/${eventId}/matches/${match?.id}`,
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

  it("rejects event creation until the user has organizer tools enabled", async () => {
    const player = await signUp("Plain Player");
    const response = await jsonRequest("/api/events", player.cookie, {
      capacity: 12,
      eventType: "open_play",
      name: "Unauthorized Open Play",
      startsAt: new Date("2027-06-01T18:00:00.000Z").toISOString(),
      status: "published",
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      message: "Organizer profile required",
    });
  });

  it("rejects unsupported image uploads before writing to R2", async () => {
    const user = await signUp("Image Tester");
    const body = new FormData();
    body.set(
      "file",
      new File(["not an image"], "notes.txt", { type: "text/plain" })
    );

    const response = await app.request(
      "/api/upload/image",
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
