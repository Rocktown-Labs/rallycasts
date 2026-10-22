import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { readApiJson } from "@/lib/api";

export interface NotificationActor {
  displayUsername?: string | null;
  id: string;
  image?: string | null;
  name: string;
  username?: string | null;
}

export interface NotificationRecord {
  actor?: NotificationActor | null;
  notification: {
    actorUserId?: string | null;
    body?: string | null;
    createdAt?: string | null;
    entityId?: string | null;
    entityType?: string | null;
    href: string;
    id: string;
    readAt?: string | null;
    title: string;
    type: string;
    userId?: string;
  };
}

export interface NotificationsResponse {
  notifications: NotificationRecord[];
  unreadCount: number;
}

export function useNotifications(enabled = true) {
  return useQuery({
    enabled,
    queryFn: async (): Promise<NotificationsResponse> => {
      try {
        return await readApiJson<NotificationsResponse>(
          apiClient.api.v1.social.notifications.$get()
        );
      } catch {
        return { notifications: [], unreadCount: 0 };
      }
    },
    queryKey: ["notifications"],
  });
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () =>
      readApiJson(apiClient.api.v1.social.notifications.read.$post()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
