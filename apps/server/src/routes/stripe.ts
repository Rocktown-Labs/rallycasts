import { createDb } from "@rallycaststv/db";
import { webhookEvent } from "@rallycaststv/db/schema/domain";
import { Hono } from "hono";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { createId } from "../lib/ids";
import { readJsonPayload } from "../lib/json";
import type { AppEnv } from "../lib/types";

const getStringProperty = (value: unknown, key: string) => {
  if (!value || typeof value !== "object" || !(key in value)) {
    return null;
  }

  const property = (value as Record<string, unknown>)[key];
  return typeof property === "string" ? property : null;
};

export const stripeRouter = new Hono<AppEnv>()
  .get("/status", (c) =>
    c.json(
      {
        message: "Stripe route is ready for webhook and checkout wiring.",
        payments: "stubbed",
      },
      HttpStatusCodes.OK
    )
  )
  .post("/webhook", async (c) => {
    const db = createDb(c.env.DB);
    const { raw, value } = await readJsonPayload(c.req.raw);
    const providerEventId = getStringProperty(value, "id") ?? createId();
    const eventType = getStringProperty(value, "type") ?? "stripe.unknown";

    await db
      .insert(webhookEvent)
      .values({
        eventType,
        id: createId(),
        payloadJson: raw,
        provider: "stripe",
        providerEventId,
      })
      .onConflictDoNothing();

    return c.json(
      { eventType, providerEventId, received: true },
      HttpStatusCodes.ACCEPTED
    );
  });
