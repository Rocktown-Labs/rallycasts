import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

import app from "../index";

describe("staging E2E fixtures", () => {
  it("keeps the fixture seed route unavailable without its secret", async () => {
    const response = await app.request(
      "/api/v1/internal/e2e/seed",
      {
        body: JSON.stringify({
          email: "e2e-owner@example.com",
          name: "E2E Owner",
          password: "e2e-password-123",
        }),
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:3001",
        },
        method: "POST",
      },
      env
    );

    expect(response.status).toBe(404);
  });

  it("seeds isolated verified users and launch fixtures", async () => {
    const email = `e2e-owner-${crypto.randomUUID()}@example.com`;
    const response = await app.request(
      "/api/v1/internal/e2e/seed",
      {
        body: JSON.stringify({
          email,
          name: "E2E Owner",
          password: "e2e-password-123",
          peerEmail: `e2e-peer-${crypto.randomUUID()}@example.com`,
          peerName: "E2E Friend",
        }),
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:3001",
          "x-rallycasts-e2e-token": "e2e-seed-secret",
        },
        method: "POST",
      },
      { ...env, E2E_SEED_TOKEN: "e2e-seed-secret" }
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      castingJobId: string;
      clipVideoId: string;
      conversationId: string | null;
      eventId: string;
      ownerUserId: string;
      postId: string;
      privateVideoId: string;
    };
    expect(body).toMatchObject({
      conversationId: expect.any(String),
      ownerUserId: expect.any(String),
    });

    const verified = await env.DB.prepare(
      "select email_verified from user where id = ?"
    )
      .bind(body.ownerUserId)
      .first<{ email_verified: number }>();
    expect(verified?.email_verified).toBe(1);

    const eventRecord = await env.DB.prepare(
      "select status from event where id = ?"
    )
      .bind(body.eventId)
      .first<{ status: string }>();
    expect(eventRecord?.status).toBe("published");
  });
});
