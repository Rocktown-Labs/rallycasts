import { createDb } from "@rallycaststv/db";
import { video, webhookEvent } from "@rallycaststv/db/schema/domain";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { createId } from "../lib/ids";
import { readJsonPayload } from "../lib/json";
import type { AppEnv } from "../lib/types";

const getRecord = (value: unknown, key: string) => {
  if (!value || typeof value !== "object" || !(key in value)) {
    return null;
  }

  const property = (value as Record<string, unknown>)[key];
  return property && typeof property === "object"
    ? (property as Record<string, unknown>)
    : null;
};

const getStringProperty = (value: unknown, key: string) => {
  if (!value || typeof value !== "object" || !(key in value)) {
    return null;
  }

  const property = (value as Record<string, unknown>)[key];
  return typeof property === "string" ? property : null;
};

export const muxRouter = new Hono<AppEnv>()
  .get("/status", (c) =>
    c.json(
      {
        message: "Mux route is ready for direct-upload and webhook wiring.",
        videoUploads: "stubbed",
      },
      HttpStatusCodes.OK
    )
  )
  .post("/webhook", async (c) => {
    const db = createDb(c.env.DB);
    const { raw, value } = await readJsonPayload(c.req.raw);
    const providerEventId = getStringProperty(value, "id") ?? createId();
    const eventType = getStringProperty(value, "type") ?? "mux.unknown";
    const data = getRecord(value, "data");
    const muxAssetId = data ? getStringProperty(data, "id") : null;
    const muxStatus = data ? getStringProperty(data, "status") : null;

    await db
      .insert(webhookEvent)
      .values({
        eventType,
        id: createId(),
        payloadJson: raw,
        provider: "mux",
        providerEventId,
      })
      .onConflictDoNothing();

    if (muxAssetId && muxStatus) {
      await db
        .update(video)
        .set({
          muxStatus,
          publishedAt: muxStatus === "ready" ? new Date() : undefined,
          status: muxStatus === "ready" ? "ready" : "processing",
          updatedAt: new Date(),
        })
        .where(eq(video.muxAssetId, muxAssetId));
    }

    return c.json(
      { eventType, providerEventId, received: true },
      HttpStatusCodes.ACCEPTED
    );
  });
