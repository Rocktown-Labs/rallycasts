import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";

import { apiClient } from "@/lib/api-client";
import { readApiJson } from "@/lib/hooks/api";
import { queryClient as defaultQueryClient } from "@/lib/query-client";

export interface NotificationActor {
  displayUsername?: string | null;
  id: string;
  image?: string | null;
  name: string;
  username?: string | null;
}

export interface NotificationItem {
  actor?: NotificationActor | null;
  notification: {
    body?: string | null;
    createdAt: string;
    href: string;
    id: string;
    readAt?: string | null;
    title: string;
    type: string;
    userId?: string;
  };
  $synced?: boolean;
}

export const notificationsCollection = createCollection(
  queryCollectionOptions({
    getKey: (item: NotificationItem) => item.notification.id,
    id: "notifications",
    onUpdate: async () => {
      await readApiJson(apiClient.api.v1.social.notifications.read.$post());
    },
    queryClient: defaultQueryClient,
    queryFn: async () => {
      try {
        const response = await apiClient.api.v1.social.notifications.$get();
        if ((response.status as number) === 401 || !response.ok) {
          return { notifications: [], unreadCount: 0 };
        }
        return await response.json();
      } catch {
        return { notifications: [], unreadCount: 0 };
      }
    },
    queryKey: ["notifications"],
    select: (res) =>
      (res as { notifications: NotificationItem[] }).notifications ?? [],
  })
);
