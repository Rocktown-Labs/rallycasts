import { createDb } from "@rallycaststv/db";

import type { AdEventMessage } from "../lib/ads";
import { aggregateAdEvents } from "../lib/ads";

export interface AdsEnv {
  ADS_ANALYTICS?: {
    writeDataPoint: (point: {
      blobs?: string[];
      doubles?: number[];
      indexes?: string[];
    }) => Promise<unknown> | unknown;
  };
  DB: D1Database;
}

export default {
  async queue(batch: MessageBatch<AdEventMessage>, env: AdsEnv): Promise<void> {
    const db = createDb(env.DB);
    try {
      await aggregateAdEvents(
        db,
        env,
        batch.messages.map((message) => message.body)
      );
      for (const message of batch.messages) {
        message.ack();
      }
    } catch (error) {
      console.error({
        error: error instanceof Error ? error.message : "unknown error",
        event: "ads_queue_batch_failed",
        size: batch.messages.length,
      });
      for (const message of batch.messages) {
        const attempts = message.attempts ?? 0;
        if (attempts >= 5) {
          message.ack();
        } else {
          message.retry();
        }
      }
    }
  },
};
