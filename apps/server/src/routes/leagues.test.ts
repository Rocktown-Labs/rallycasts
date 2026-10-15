import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

import app from "../index";

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
  return response.headers.get("set-cookie") ?? "";
};

const requestJson = (
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

describe("leagues API", () => {
  it("lets an authenticated host create and edit a league", async () => {
    const cookie = await signUp("League Host");
    const createResponse = await requestJson("/api/v1/leagues", cookie, {
      format: "singles",
      locationLabel: "Kanis Park",
      maxUnits: 8,
      name: "Spring Park League",
      seasonWeeks: 6,
    });

    expect(createResponse.status).toBe(201);
    const created = (await createResponse.json()) as {
      league: { id: string; status: string };
    };
    expect(created.league.status).toBe("recruiting");

    const updateResponse = await requestJson(
      `/api/v1/leagues/${created.league.id}`,
      cookie,
      { name: "Spring Park League Updated" },
      "PATCH"
    );
    expect(updateResponse.status).toBe(200);
    await expect(updateResponse.json()).resolves.toMatchObject({
      league: { name: "Spring Park League Updated" },
    });
  });

  it("does not expose another host's league for editing", async () => {
    const ownerCookie = await signUp("League Owner");
    const otherCookie = await signUp("Other Host");
    const createResponse = await requestJson("/api/v1/leagues", ownerCookie, {
      format: "doubles_fixed",
      locationLabel: "Southside Courts",
      maxUnits: 6,
      name: "Doubles Flight",
    });
    const created = (await createResponse.json()) as { league: { id: string } };

    const response = await requestJson(
      `/api/v1/leagues/${created.league.id}`,
      otherCookie,
      { name: "Unauthorized edit" },
      "PATCH"
    );
    expect(response.status).toBe(404);
  });
});
