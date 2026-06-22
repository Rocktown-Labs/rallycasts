import type { createDb } from "@rallycaststv/db";
import { notification } from "@rallycaststv/db/schema/domain";

import { createId } from "./ids";

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

export const createNotification = async (
  db: Db,
  input: CreateNotificationInput
) => {
  const record = {
    id: createId(),
    ...input,
  };

  await db.insert(notification).values(record);

  return record;
};
