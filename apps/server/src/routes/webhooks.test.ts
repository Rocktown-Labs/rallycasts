import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

import app from "../index";

const radarRequest = async (body: string) => {
  const signingId = `test-${crypto.randomUUID()}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode("radar-webhook-secret"),
    { hash: "SHA-1", name: "HMAC" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signingId)
  );
  const signatureHex = Array.from(new Uint8Array(signature), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");

  return app.request(
    "/webhooks/radar",
    {
      body,
      headers: {
        "Content-Type": "application/json",
        "X-Radar-Signature": signatureHex,
        "X-Radar-Signing-Id": signingId,
      },
      method: "POST",
    },
    { ...env, RADAR_WEBHOOK_SECRET: "radar-webhook-secret" }
  );
};

describe("webhooks routes", () => {
  describe("POST /webhooks/radar", () => {
    it("accepts single event payload", async () => {
      const event = {
        _id: "evt_1",
        confidence: 1,
        createdAt: new Date().toISOString(),
        geofence: {
          description: "Test Venue",
          externalId: "venue_123",
          tag: "venue",
        },
        location: {
          coordinates: [-74.006, 40.7128],
          type: "Point",
        },
        locationAccuracy: 10,
        type: "user.entered_geofence",
        user: {
          userId: "user_123",
        },
      };

      const response = await radarRequest(JSON.stringify({ event }));

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.processed).toBe(1);
    });

    it("accepts array of events payload", async () => {
      const events = [
        {
          _id: "evt_1",
          confidence: 1,
          createdAt: new Date().toISOString(),
          geofence: {
            description: "Test Venue 1",
            externalId: "venue_123",
            tag: "venue",
          },
          location: {
            coordinates: [-74.006, 40.7128],
            type: "Point",
          },
          locationAccuracy: 10,
          type: "user.entered_geofence",
          user: { userId: "user_123" },
        },
        {
          _id: "evt_2",
          confidence: 1,
          createdAt: new Date().toISOString(),
          geofence: {
            description: "Test Venue 2",
            externalId: "venue_456",
            tag: "venue",
          },
          location: {
            coordinates: [-73.9442, 40.6782],
            type: "Point",
          },
          locationAccuracy: 10,
          type: "user.exited_geofence",
          user: { userId: "user_456" },
        },
      ];

      const response = await radarRequest(JSON.stringify({ data: events }));

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.processed).toBe(2);
    });

    it("rejects empty events", async () => {
      const response = await radarRequest(JSON.stringify({}));

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        message: "Invalid Radar webhook payload",
      });
    });

    it("accepts an empty event array", async () => {
      const response = await radarRequest(JSON.stringify({ data: [] }));

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        processed: 0,
        queued: 0,
      });
    });

    it("handles invalid JSON gracefully", async () => {
      const response = await radarRequest("invalid json");

      expect(response.status).toBe(400);
    });
  });

  describe("GET /webhooks/health", () => {
    it("returns health status", async () => {
      const response = await app.request("/webhooks/health", {}, env);

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ status: "ok" });
    });
  });
});
