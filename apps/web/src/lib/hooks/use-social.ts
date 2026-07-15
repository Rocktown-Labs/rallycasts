import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";

import { readApiJson } from "./api";

export const useNotifications = () =>
  useQuery({
    queryFn: async () => {
      try {
        const response = await apiClient.api.social.notifications.$get();
        if (response.status === 401) {
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

export const useMarkNotificationsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      readApiJson(apiClient.api.social.notifications.read.$post()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};

export const usePosts = () =>
  useQuery({
    queryFn: () => readApiJson(apiClient.api.social.posts.$get()),
    queryKey: ["posts"],
  });

export const useCreatePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (json: { content: string }) =>
      readApiJson(apiClient.api.social.posts.$post({ json })),
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
      readApiJson(apiClient.api.social["friend-requests"].$post({ json })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};

export const useStartConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (json: { participantUserId: string }) =>
      readApiJson(apiClient.api.social.conversations.$post({ json })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

export const useFriends = () =>
  useQuery({
    queryFn: () => readApiJson(apiClient.api.social.friends.$get()),
    queryKey: ["friends"],
    retry: false,
  });

export const useConversations = () =>
  useQuery({
    queryFn: () => readApiJson(apiClient.api.social.conversations.$get()),
    queryKey: ["conversations"],
    retry: false,
  });

export const useConversationMessages = (conversationId?: string) =>
  useQuery({
    enabled: Boolean(conversationId),
    queryFn: () =>
      readApiJson(
        apiClient.api.social.conversations[":id"].messages.$get({
          param: { id: conversationId ?? "" },
        })
      ),
    queryKey: ["conversations", conversationId, "messages"],
    retry: false,
  });

export const useSendMessage = (conversationId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (json: { body: string }) =>
      readApiJson(
        apiClient.api.social.conversations[":id"].messages.$post({
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
    }) => readApiJson(apiClient.api.social.shares.$post({ json })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};
