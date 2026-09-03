import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it, vi } from "vitest";

import app from "../index";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

const mockGooglePlaceDetails = () => {
  mockFetch.mockResolvedValueOnce({
    json: () => ({
      displayName: {
        text: "Club Court",
      },
      formattedAddress: "456 Club Court, Austin, TX 78701",
      id: "organization_event_place",
      location: {
        latitude: 30.2672,
        longitude: -97.7431,
      },
      types: ["sports_complex"],
    }),
    ok: true,
  });
};

const signUp = async (name: string) => {
  const username = `org${crypto.randomUUID().slice(0, 8)}`;
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
  const body = (await response.json()) as { user: { id: string } };
  return {
    cookie: response.headers.get("set-cookie") ?? "",
    id: body.user.id,
    username,
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
      headers: { "Content-Type": "application/json", Cookie: cookie },
      method,
    },
    env
  );

describe("organizations API", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("keeps player identity separate while owners manage an organization", async () => {
    const owner = await signUp("Organization Owner");
    const editor = await signUp("Organization Editor");
    const slug = `test-club-${crypto.randomUUID().slice(0, 6)}`;
    const createResponse = await jsonRequest(
      "/api/v1/organizations",
      owner.cookie,
      {
        bio: "A competitive community club.",
        city: "Austin",
        name: "Test Pickleball Club",
        slug,
        state: "TX",
      }
    );
    expect(createResponse.status).toBe(201);

    const addResponse = await jsonRequest(
      `/api/v1/organizations/${slug}/members`,
      owner.cookie,
      { role: "editor", username: editor.username }
    );
    expect(addResponse.status).toBe(200);

    const publicResponse = await app.request(
      `/api/v1/organizations/${slug}`,
      {},
      env
    );
    expect(publicResponse.status).toBe(200);
    await expect(publicResponse.json()).resolves.toMatchObject({
      members: expect.arrayContaining([
        expect.objectContaining({ role: "owner" }),
        expect.objectContaining({ role: "editor" }),
      ]),
      organization: { name: "Test Pickleball Club", slug },
    });
  });

  it("includes organization-hosted events in member event workspaces", async () => {
    const owner = await signUp("Tournament Owner");
    const editor = await signUp("Tournament Editor");
    const slug = `event-club-${crypto.randomUUID().slice(0, 6)}`;
    await jsonRequest(
      "/api/v1/profile/me",
      owner.cookie,
      { isOrganizer: true },
      "PATCH"
    );
    const createOrganizationResponse = await jsonRequest(
      "/api/v1/organizations",
      owner.cookie,
      {
        city: "Austin",
        name: "Event Host Club",
        slug,
        state: "TX",
      }
    );
    const organizationBody = (await createOrganizationResponse.json()) as {
      organization: { id: string };
    };
    await jsonRequest(`/api/v1/organizations/${slug}/members`, owner.cookie, {
      role: "editor",
      username: editor.username,
    });

    mockGooglePlaceDetails();
    const createEventResponse = await jsonRequest(
      "/api/v1/events",
      owner.cookie,
      {
        eventType: "tournament",
        googlePlaceId: "organization_event_place",
        name: "Member Managed Open",
        organizationId: organizationBody.organization.id,
        startsAt: new Date(Date.now() + 86_400_000).toISOString(),
        status: "published",
      }
    );
    expect(createEventResponse.status).toBe(201);
    const eventBody = (await createEventResponse.json()) as {
      event: { id: string };
    };

    const mineResponse = await app.request(
      "/api/v1/events/mine",
      { headers: { Cookie: editor.cookie } },
      env
    );
    expect(mineResponse.status).toBe(200);
    await expect(mineResponse.json()).resolves.toMatchObject({
      events: expect.arrayContaining([
        expect.objectContaining({
          id: eventBody.event.id,
          organizationId: organizationBody.organization.id,
        }),
      ]),
    });

    const updateResponse = await jsonRequest(
      `/api/v1/events/${eventBody.event.id}`,
      editor.cookie,
      { status: "draft" },
      "PATCH"
    );
    expect(updateResponse.status).toBe(404);
  });
});
