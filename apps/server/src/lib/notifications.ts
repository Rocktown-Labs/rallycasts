import type { createDb } from "@rallycaststv/db";
import { notification } from "@rallycaststv/db/schema/domain";

import { createId } from "./ids";
import type { PushEnv } from "./push";
import { sendPushNotifications } from "./push";

type Db = ReturnType<typeof createDb>;

type NotificationType =
  | "casting_job"
  | "challenge"
  | "comment"
  | "event"
  | "friend_accept"
  | "friend_request"
  | "like"
  | "message"
  | "share"
  | "system";

type EntityType =
  | "casting_job"
  | "challenge"
  | "comment"
  | "event"
  | "friend_request"
  | "friendship"
  | "message"
  | "post"
  | "share"
  | "video";

export interface CreateNotificationInput {
  actorUserId?: string;
  body?: string;
  entityId?: string;
  entityType: EntityType;
  href: string;
  title: string;
  type: NotificationType;
  userId: string;
}

export interface NotificationDispatchEnv extends PushEnv {
  USER_NOTIFICATIONS?: DurableObjectNamespace;
}

type UserNotificationsStub = DurableObjectStub & {
  broadcast: (event: {
    notification?: {
      body?: null | string;
      href: string;
      id: string;
      title: string;
      type: string;
    };
    type: "notification";
  }) => Promise<void>;
};

const broadcastNotification = async (
  env: NotificationDispatchEnv,
  record: CreateNotificationInput & { id: string }
) => {
  if (!env.USER_NOTIFICATIONS) {
    return;
  }
  try {
    const stub = env.USER_NOTIFICATIONS.getByName(
      record.userId
    ) as UserNotificationsStub;
    await stub.broadcast({
      notification: {
        body: record.body,
        href: record.href,
        id: record.id,
        title: record.title,
        type: record.type,
      },
      type: "notification",
    });
  } catch {
    // Realtime fanout is best-effort; D1 notifications remain the source of truth.
  }
};

/**
 * Persists an in-app notification and, when bindings are supplied, fans it out
 * to the user's realtime socket and registered push devices. Push failures
 * never fail the product action that created the notification.
 */
export const createNotification = async (
  db: Db,
  input: CreateNotificationInput,
  env?: NotificationDispatchEnv
) => {
  const record = {
    id: createId(),
    ...input,
  };

  await db.insert(notification).values(record);

  if (env) {
    await broadcastNotification(env, record);
    await sendPushNotifications(db, env, [
      {
        body: record.body ?? record.title,
        data: {
          href: record.href,
          notificationId: record.id,
          type: record.type,
        },
        title: record.title,
        userId: record.userId,
      },
    ]);
  }

  return record;
};
