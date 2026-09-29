import { env } from "@rallycaststv/env/web";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";

import { readApiJson } from "./api";

export const useNotifications = () =>
  useQuery({
    queryFn: async () => {
      try {
        const response = await apiClient.api.v1.social.notifications.$get();
        if ((response.status as number) === 401) {
          return null;
        }
        if (!response.ok) {
          throw new Error(
            response.statusText || `Request failed with ${response.status}`
          );
        }
        return await response.json();
      } catch {
        return null;
      }
    },
    queryKey: ["notifications"],
    retry: false,
  });

const toWebSocketUrl = (path: string) => {
  const url = new URL(path, env.VITE_SERVER_URL);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
};

export const useNotificationRealtime = (enabled: boolean) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const socket = new WebSocket(
      toWebSocketUrl("/api/v1/social/notifications/realtime")
    );

    socket.addEventListener("message", (event) => {
      try {
        const payload = JSON.parse(event.data as string) as {
          notification?: { body?: string | null; title: string };
          type: string;
        };
        if (payload.type !== "notification") {
          return;
        }
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
        if (payload.notification) {
          toast(payload.notification.title, {
            description: payload.notification.body ?? undefined,
          });
        }
      } catch {
        // Ignore malformed realtime frames; polling/query invalidation remains safe.
      }
    });

    return () => socket.close();
  }, [enabled, queryClient]);
};

export const useMarkNotificationsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      readApiJson(apiClient.api.v1.social.notifications.read.$post()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};

export const usePosts = () =>
  useQuery({
    queryFn: () => readApiJson(apiClient.api.v1.social.posts.$get()),
    queryKey: ["posts"],
  });

export const useCreatePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (json: { content: string }) =>
      readApiJson(apiClient.api.v1.social.posts.$post({ json })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["search"] });
    },
  });
};

export const useSendFriendRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (json: { message?: string; toUserId: string }) =>
      readApiJson(apiClient.api.v1.social["friend-requests"].$post({ json })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};

export const useStartConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (json: {
      participantUserId?: string;
      participantUserIds?: string[];
    }) => readApiJson(apiClient.api.v1.social.conversations.$post({ json })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

export const useFriends = () =>
  useQuery({
    queryFn: () => readApiJson(apiClient.api.v1.social.friends.$get()),
    queryKey: ["friends"],
    retry: false,
  });

export const useConversations = () =>
  useQuery({
    queryFn: () => readApiJson(apiClient.api.v1.social.conversations.$get()),
    queryKey: ["conversations"],
    retry: false,
  });

export const useConversationMessages = (conversationId?: string) =>
  useQuery({
    enabled: Boolean(conversationId),
    queryFn: () =>
      readApiJson(
        apiClient.api.v1.social.conversations[":id"].messages.$get({
          param: { id: conversationId ?? "" },
        })
      ),
    queryKey: ["conversations", conversationId, "messages"],
    retry: false,
  });

export const useConversationRealtime = (conversationId?: string) => {
  const queryClient = useQueryClient();
  const [activeUsers, setActiveUsers] = useState<
    { name: string; userId: string }[]
  >([]);

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    const socket = new WebSocket(
      toWebSocketUrl(`/api/v1/social/conversations/${conversationId}/realtime`)
    );

    socket.addEventListener("message", (event) => {
      try {
        const payload = JSON.parse(event.data as string) as {
          activeUsers?: { name: string; userId: string }[];
          type: "message" | "presence";
        };
        if (payload.type === "message") {
          queryClient.invalidateQueries({
            queryKey: ["conversations", conversationId, "messages"],
          });
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        }
        if (payload.type === "presence") {
          setActiveUsers(payload.activeUsers ?? []);
        }
      } catch {
        // Ignore malformed realtime frames.
      }
    });

    return () => {
      setActiveUsers([]);
      socket.close();
    };
  }, [conversationId, queryClient]);

  return { activeUsers };
};

export const useSendMessage = (conversationId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (json: { body: string }) =>
      readApiJson(
        apiClient.api.v1.social.conversations[":id"].messages.$post({
          json,
          param: { id: conversationId ?? "" },
        })
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["conversations", conversationId, "messages"],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};

export const useShareEntity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (json: {
      channel?: "copy_link" | "direct_message" | "external";
      entityId: string;
      entityType: "event" | "post" | "profile" | "venue" | "video";
      href?: string;
      recipientUserId?: string;
    }) => readApiJson(apiClient.api.v1.social.shares.$post({ json })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};
