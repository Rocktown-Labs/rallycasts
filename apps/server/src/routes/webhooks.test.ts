import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

import app from "../index";

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

      const response = await app.request(
        "/webhooks/radar",
        {
          body: JSON.stringify({ event }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
        env
      );

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

      const response = await app.request(
        "/webhooks/radar",
        {
          body: JSON.stringify({ data: events }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
        env
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.processed).toBe(2);
    });

    it("returns OK for empty events", async () => {
      const response = await app.request(
        "/webhooks/radar",
        {
          body: JSON.stringify({}),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
        env
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe("No events");
    });

    it("returns OK for empty array", async () => {
      const response = await app.request(
        "/webhooks/radar",
        {
          body: JSON.stringify({ data: [] }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
        env
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe("No events");
    });

    it("handles invalid JSON gracefully", async () => {
      const response = await app.request(
        "/webhooks/radar",
        {
          body: "invalid json",
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
        env
      );

      expect(response.status).toBe(500);
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
