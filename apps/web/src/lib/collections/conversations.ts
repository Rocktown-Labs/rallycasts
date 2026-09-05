import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";
import type { QueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { readApiJson } from "@/lib/hooks/api";
import { queryClient as defaultQueryClient } from "@/lib/query-client";

export interface ConversationParticipant {
  displayUsername?: string | null;
  id: string;
  image?: string | null;
  name: string;
  username?: string | null;
}

export interface ConversationItem {
  conversation: {
    id: string;
    createdAt: string;
    updatedAt: string;
  };
  lastMessage?: {
    body: string;
    createdAt: string;
    id: string;
    senderUserId: string;
  } | null;
  participant: ConversationParticipant;
  participants: ConversationParticipant[];
  unreadCount: number;
}

export interface MessageSender {
  displayUsername?: string | null;
  id: string;
  image?: string | null;
  name: string;
  username?: string | null;
}

export interface MessageItem {
  message: {
    body: string;
    conversationId: string;
    createdAt: string;
    deletedAt?: string | null;
    id: string;
    senderUserId: string;
    updatedAt?: string;
  };
  sender: MessageSender;
  $synced?: boolean;
}

export type MessageRecord = MessageItem;

export const conversationsCollection = createCollection(
  queryCollectionOptions({
    getKey: (item: ConversationItem) => item.conversation.id,
    id: "conversations",
    queryClient: defaultQueryClient,
    queryFn: () =>
      readApiJson<{ conversations: ConversationItem[] }>(
        apiClient.api.v1.social.conversations.$get()
      ),
    queryKey: ["conversations"],
    select: (res: { conversations: ConversationItem[] }) =>
      res.conversations ?? [],
  })
);

const messagesCollectionsByClient = new WeakMap<
  QueryClient,
  Map<string, ReturnType<typeof createMessagesCollection>>
>();

function createMessagesCollection(qc: QueryClient, conversationId: string) {
  return createCollection(
    queryCollectionOptions({
      getKey: (item: MessageItem) => item.message.id,
      id: `messages-${conversationId}`,
      onInsert: async ({ transaction }) => {
        const item = transaction.mutations[0].modified as MessageItem;
        await readApiJson(
          apiClient.api.v1.social.conversations[":id"].messages.$post({
            json: { body: item.message.body },
            param: { id: conversationId },
          })
        );
      },
      queryClient: qc,
      queryFn: () =>
        readApiJson<{ messages: MessageItem[] }>(
          apiClient.api.v1.social.conversations[":id"].messages.$get({
            param: { id: conversationId },
          })
        ),
      queryKey: ["conversations", conversationId, "messages"],
      select: (res: { messages: MessageItem[] }) => res.messages ?? [],
    })
  );
}

export function getConversationMessagesCollection(
  qc: QueryClient,
  conversationId: string
) {
  let map = messagesCollectionsByClient.get(qc);
  if (!map) {
    map = new Map();
    messagesCollectionsByClient.set(qc, map);
  }
  let col = map.get(conversationId);
  if (!col) {
    col = createMessagesCollection(qc, conversationId);
    map.set(conversationId, col);
  }
  return col;
}
