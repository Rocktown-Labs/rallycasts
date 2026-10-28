import type { createDb } from "@rallycaststv/db";
import { pushReceipt, pushToken } from "@rallycaststv/db/schema/domain";
import { and, eq, inArray, isNull, lt, sql } from "drizzle-orm";

import { createId } from "./ids";

type Db = ReturnType<typeof createDb>;

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_RECEIPTS_URL = "https://exp.host/--/api/v2/push/getReceipts";
const PUSH_BATCH_SIZE = 100;
const RECEIPT_BATCH_SIZE = 1000;
const RECEIPT_MIN_AGE_MS = 10 * 60 * 1000;

export interface PushEnv {
  EXPO_ACCESS_TOKEN?: string;
}

export interface PushNotificationInput {
  body: string;
  data?: Record<string, unknown>;
  title: string;
  userId: string;
}

interface ExpoPushMessage {
  body: string;
  channelId?: string;
  data?: Record<string, unknown>;
  priority?: "default" | "high" | "normal";
  sound?: "default" | null;
  to: string;
  title: string;
}

interface ExpoPushTicket {
  details?: { error?: string };
  id?: string;
  message?: string;
  status: "error" | "ok";
}

interface ExpoPushTicketResponse {
  data?: ExpoPushTicket | ExpoPushTicket[];
  errors?: { code?: string; message?: string }[];
}

interface ExpoPushReceipt {
  details?: { error?: string };
  message?: string;
  status: "error" | "ok";
}

interface ExpoPushReceiptResponse {
  data?: Record<string, ExpoPushReceipt>;
  errors?: { code?: string; message?: string }[];
}

const isExpoPushToken = (token: string) =>
  /^(?:Exponent|Expo)PushToken\[[^\]]+\]$/u.test(token);

const chunk = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const expoHeaders = (env: PushEnv) => ({
  Accept: "application/json",
  "Accept-Encoding": "gzip, deflate",
  "Content-Type": "application/json",
  ...(env.EXPO_ACCESS_TOKEN
    ? { Authorization: `Bearer ${env.EXPO_ACCESS_TOKEN}` }
    : {}),
});

const parseTickets = (response: ExpoPushTicketResponse) => {
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return response.data ? [response.data] : [];
};

const disablePushToken = async (db: Db, tokenId: string) => {
  await db
    .update(pushToken)
    .set({ disabledAt: new Date(), updatedAt: new Date() })
    .where(eq(pushToken.id, tokenId));
};

const recordTicket = async (
  db: Db,
  input: {
    pushTokenId: string;
    ticket: ExpoPushTicket;
    userId: string;
  }
) => {
  if (input.ticket.status === "ok" && input.ticket.id) {
    await db
      .insert(pushReceipt)
      .values({
        createdAt: new Date(),
        id: createId(),
        pushTokenId: input.pushTokenId,
        status: "pending",
        ticketId: input.ticket.id,
        userId: input.userId,
      })
      .onConflictDoNothing();
    return;
  }

  const errorCode = input.ticket.details?.error ?? "PushTicketError";
  if (errorCode === "DeviceNotRegistered") {
    await disablePushToken(db, input.pushTokenId);
  }
};

/**
 * Sends best-effort Expo push notifications to every active device a user has
 * registered. A failed push never fails the underlying product action.
 */
export const sendPushNotifications = async (
  db: Db,
  env: PushEnv,
  notifications: PushNotificationInput[]
): Promise<{ failed: number; sent: number; skipped: number }> => {
  if (notifications.length === 0) {
    return { failed: 0, sent: 0, skipped: 0 };
  }

  const userIds = [...new Set(notifications.map((item) => item.userId))];
  const tokens: {
    id: string;
    platform: string;
    token: string;
    userId: string;
  }[] = [];
  for (const userBatch of chunk(userIds, 90)) {
    // oxlint-disable-next-line eslint/no-await-in-loop -- D1 limits bound parameters; token lookup is chunked
    const rows = await db
      .select({
        id: pushToken.id,
        platform: pushToken.platform,
        token: pushToken.token,
        userId: pushToken.userId,
      })
      .from(pushToken)
      .where(
        and(inArray(pushToken.userId, userBatch), isNull(pushToken.disabledAt))
      );
    tokens.push(...rows);
  }

  const tokensByUser = new Map<string, typeof tokens>();
  for (const token of tokens) {
    if (!isExpoPushToken(token.token)) {
      continue;
    }
    const list = tokensByUser.get(token.userId) ?? [];
    list.push(token);
    tokensByUser.set(token.userId, list);
  }

  let skipped = 0;
  const deliveries: {
    message: ExpoPushMessage;
    token: (typeof tokens)[number];
    userId: string;
  }[] = [];

  for (const notification of notifications) {
    const userTokens = tokensByUser.get(notification.userId) ?? [];
    if (userTokens.length === 0) {
      skipped += 1;
      continue;
    }
    for (const token of userTokens) {
      deliveries.push({
        message: {
          body: notification.body,
          channelId: "default",
          data: notification.data,
          priority: "high",
          sound: "default",
          title: notification.title,
          to: token.token,
        },
        token,
        userId: notification.userId,
      });
    }
  }

  let failed = 0;
  let sent = 0;

  for (const batch of chunk(deliveries, PUSH_BATCH_SIZE)) {
    try {
      // oxlint-disable-next-line eslint/no-await-in-loop -- Expo batches are sequential to respect the 100-message limit
      const response = await fetch(EXPO_PUSH_URL, {
        body: JSON.stringify(batch.map((delivery) => delivery.message)),
        headers: expoHeaders(env),
        method: "POST",
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        failed += batch.length;
        continue;
      }
      // oxlint-disable-next-line eslint/no-await-in-loop -- parsing the matching ticket batch
      const payload = (await response.json()) as ExpoPushTicketResponse;
      const tickets = parseTickets(payload);
      for (const [index, ticket] of tickets.entries()) {
        const delivery = batch[index];
        if (!delivery) {
          continue;
        }
        if (ticket.status === "ok") {
          sent += 1;
        } else {
          failed += 1;
        }
        // oxlint-disable-next-line eslint/no-await-in-loop -- receipt rows are written in ticket order; batch is <= 100
        await recordTicket(db, {
          pushTokenId: delivery.token.id,
          ticket,
          userId: delivery.userId,
        });
      }
    } catch {
      failed += batch.length;
    }
  }

  return { failed, sent, skipped };
};

/**
 * Checks Expo push receipts and disables tokens Apple/Google no longer
 * recognize. The maintenance cron calls this so stale tokens stop receiving
 * sends without blocking the original notification request.
 */
export const checkPushReceipts = async (
  db: Db,
  env: PushEnv
): Promise<{ checked: number; disabled: number }> => {
  const cutoff = new Date(Date.now() - RECEIPT_MIN_AGE_MS);
  const pending = await db
    .select({
      createdAt: pushReceipt.createdAt,
      id: pushReceipt.id,
      pushTokenId: pushReceipt.pushTokenId,
      ticketId: pushReceipt.ticketId,
    })
    .from(pushReceipt)
    .where(
      and(eq(pushReceipt.status, "pending"), lt(pushReceipt.createdAt, cutoff))
    )
    .limit(RECEIPT_BATCH_SIZE);

  if (pending.length === 0) {
    return { checked: 0, disabled: 0 };
  }

  let checked = 0;
  let disabled = 0;

  for (const batch of chunk(pending, RECEIPT_BATCH_SIZE)) {
    try {
      // oxlint-disable-next-line eslint/no-await-in-loop -- receipt batches are sequential to respect the 1000-id limit
      const response = await fetch(EXPO_RECEIPTS_URL, {
        body: JSON.stringify({ ids: batch.map((item) => item.ticketId) }),
        headers: expoHeaders(env),
        method: "POST",
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        continue;
      }
      // oxlint-disable-next-line eslint/no-await-in-loop -- parsing the matching receipt batch
      const payload = (await response.json()) as ExpoPushReceiptResponse;
      const receipts = payload.data ?? {};
      const now = new Date();
      for (const item of batch) {
        const receipt = receipts[item.ticketId];
        if (!receipt) {
          const expired =
            item.createdAt !== null &&
            item.createdAt.getTime() < Date.now() - 24 * 60 * 60 * 1000;
          if (expired) {
            // oxlint-disable-next-line eslint/no-await-in-loop -- expired receipts are marked in ticket order; batch is <= 1000
            await db
              .update(pushReceipt)
              .set({
                checkedAt: now,
                errorCode: "ReceiptExpired",
                status: "error",
              })
              .where(eq(pushReceipt.id, item.id));
          }
          continue;
        }
        checked += 1;
        const errorCode = receipt.details?.error ?? null;
        if (errorCode === "DeviceNotRegistered" && item.pushTokenId) {
          // oxlint-disable-next-line eslint/no-await-in-loop -- token invalidation must complete before the receipt is marked checked
          await disablePushToken(db, item.pushTokenId);
          disabled += 1;
        }
        // oxlint-disable-next-line eslint/no-await-in-loop -- receipt rows are updated in ticket order; batch is <= 1000
        await db
          .update(pushReceipt)
          .set({
            checkedAt: now,
            errorCode,
            status: receipt.status === "ok" ? "ok" : "error",
          })
          .where(eq(pushReceipt.id, item.id));
      }
    } catch {
      // Receipt checks are best-effort and retried by the next maintenance run.
    }
  }

  return { checked, disabled };
};

export const countActivePushTokens = async (db: Db, userId: string) => {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(pushToken)
    .where(and(eq(pushToken.userId, userId), isNull(pushToken.disabledAt)));
  return row?.count ?? 0;
};
