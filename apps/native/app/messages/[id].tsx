import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/header";
import { authClient } from "@/lib/auth-client";
import {
  useConversationMessages,
  useConversations,
  useSendMessage,
  type ThreadMessage,
} from "@/lib/hooks";
import { useQueryClient } from "@tanstack/react-query";

function formatMessageTime(value?: string | number | null) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function MessageBubble({ isMine, item }: { isMine: boolean; item: ThreadMessage }) {
  return (
    <View
      className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
        isMine
          ? "self-end rounded-br-md bg-[#005c23]"
          : "self-start rounded-bl-md border border-border/50 bg-surface"
      }`}
    >
      <Text
        className={`text-sm leading-relaxed ${
          isMine ? "text-white" : "text-foreground"
        }`}
      >
        {item.message.body}
      </Text>
      <Text
        className={`mt-1 text-[10px] ${
          isMine ? "text-white/60" : "text-muted"
        }`}
      >
        {formatMessageTime(item.message.createdAt)}
      </Text>
    </View>
  );
}

export default function ConversationThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id;
  const { data: conversationData } = useConversations(Boolean(currentUserId));
  const { data, isLoading } = useConversationMessages(conversationId);
  const sendMessage = useSendMessage(conversationId);

  const participant = conversationData?.conversations.find(
    (conversation) => conversation.conversation.id === conversationId
  )?.participant;

  // Opening the thread marks it read server-side; refresh the inbox badges.
  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: ["conversations"] });
  }, [conversationId, queryClient]);

  const messages = data?.messages ?? [];
  const newestFirst = [...messages].reverse();

  const handleSend = () => {
    const body = draft.trim();
    if (!body || sendMessage.isPending) {
      return;
    }
    setDraft("");
    sendMessage.mutate({ body }, { onError: () => setDraft(body) });
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]} style={{ flex: 1 }}>
      <ScreenHeader
        showBack
        subtitle={participant ? "@".concat(participant.username ?? participant.displayUsername ?? "player") : undefined}
        title={participant?.name ?? "Messages"}
      />

      <KeyboardAvoidingView style={{ flex: 1 }}>
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#bcdf21" />
          </View>
        ) : (
          <FlatList
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
            data={newestFirst}
            inverted
            keyExtractor={(item) => item.message.id}
            renderItem={({ item }) => (
              <MessageBubble
                isMine={item.message.senderUserId === currentUserId}
                item={item}
              />
            )}
            showsVerticalScrollIndicator={false}
          />
        )}

        <View className="flex-row items-center gap-2 border-t border-border/40 px-4 py-3">
          <TextInput
            autoCapitalize="sentences"
            className="flex-1 rounded-2xl border border-border/60 bg-surface px-3.5 py-2.5 text-sm text-foreground"
            onChangeText={setDraft}
            onSubmitEditing={handleSend}
            placeholder="Message..."
            placeholderTextColor="#888888"
            returnKeyType="send"
            value={draft}
          />
          <Pressable
            accessibilityLabel="Send message"
            accessibilityRole="button"
            disabled={!draft.trim() || sendMessage.isPending}
            onPress={handleSend}
            className="size-10 items-center justify-center rounded-full bg-[#005c23] disabled:opacity-40"
          >
            {sendMessage.isPending ? (
              <ActivityIndicator color="#bcdf21" />
            ) : (
              <Ionicons name="arrow-up" size={18} color="#bcdf21" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
