import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

import app from "../index";

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
  it("keeps player identity separate while owners manage an organization", async () => {
    const owner = await signUp("Organization Owner");
    const editor = await signUp("Organization Editor");
    const slug = `test-club-${crypto.randomUUID().slice(0, 6)}`;
    const createResponse = await jsonRequest(
      "/api/organizations",
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
      `/api/organizations/${slug}/members`,
      owner.cookie,
      { role: "editor", username: editor.username }
    );
    expect(addResponse.status).toBe(200);

    const publicResponse = await app.request(
      `/api/organizations/${slug}`,
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
});
