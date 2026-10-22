import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { readApiJson } from "@/lib/api";

export interface SocialUser {
  displayUsername?: string | null;
  id: string;
  image?: string | null;
  name: string;
  username?: string | null;
}

export interface ConversationMessageRow {
  body: string;
  conversationId: string;
  createdAt?: string | number | null;
  deletedAt?: string | number | null;
  id: string;
  senderUserId: string;
}

export interface ThreadMessage {
  message: ConversationMessageRow;
  sender: SocialUser;
}

export interface ConversationSummary {
  conversation: {
    createdAt?: string | number | null;
    id: string;
    updatedAt?: string | number | null;
  };
  lastMessage: ConversationMessageRow | null;
  participant: SocialUser;
  participants: SocialUser[];
  unreadCount: number;
}

export interface ConversationsResponse {
  conversations: ConversationSummary[];
}

export interface ThreadMessagesResponse {
  messages: ThreadMessage[];
}

export function useConversations(enabled = true) {
  return useQuery({
    enabled,
    queryFn: async (): Promise<ConversationsResponse> =>
      readApiJson(apiClient.api.v1.social.conversations.$get()),
    queryKey: ["conversations"],
    retry: false,
  });
}

export function useConversationMessages(conversationId?: string) {
  return useQuery({
    enabled: Boolean(conversationId),
    queryFn: async (): Promise<ThreadMessagesResponse> =>
      readApiJson(
        apiClient.api.v1.social.conversations[":id"].messages.$get({
          param: { id: conversationId ?? "" },
        })
      ),
    queryKey: ["conversations", conversationId, "messages"],
    retry: false,
  });
}

export function useSendMessage(conversationId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (json: { body: string }) =>
      readApiJson(
        apiClient.api.v1.social.conversations[":id"].messages.$post({
          json,
          param: { id: conversationId ?? "" },
        })
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["conversations", conversationId, "messages"],
      });
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
