import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/header";
import { authClient } from "@/lib/auth-client";
import { useConversations, type ConversationSummary } from "@/lib/hooks";

function formatMessageTime(value?: string | number | null) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();

  return sameDay
    ? date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function ConversationRow({
  conversation,
}: {
  conversation: ConversationSummary;
}) {
  const router = useRouter();
  const { lastMessage, participant, unreadCount } = conversation;
  const initial = participant.name.charAt(0).toUpperCase();
  const time = formatMessageTime(
    lastMessage?.createdAt ?? conversation.conversation.updatedAt
  );

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        if (Platform.OS === "ios") {
          Haptics.selectionAsync();
        }
        router.push(`/messages/${conversation.conversation.id}`);
      }}
      className="mb-2 flex-row items-center gap-3 rounded-2xl border border-border/50 bg-surface p-3.5 active:opacity-80"
    >
      {participant.image ? (
        <Image
          contentFit="cover"
          source={{ uri: participant.image }}
          style={{ borderRadius: 24, height: 48, width: 48 }}
        />
      ) : (
        <View className="size-12 items-center justify-center rounded-full bg-[#005c23]/20">
          <Text className="text-base font-bold text-[#005c23] dark:text-[#bcdf21]">
            {initial}
          </Text>
        </View>
      )}

      <View className="flex-1">
        <View className="flex-row items-center justify-between gap-2">
          <Text className="flex-1 text-sm font-bold text-foreground" numberOfLines={1}>
            {participant.name}
          </Text>
          {time ? (
            <Text className="text-[10px] text-muted">{time}</Text>
          ) : null}
        </View>
        <Text className="mt-0.5 text-xs text-muted" numberOfLines={1}>
          {lastMessage?.body ?? "Start the conversation"}
        </Text>
      </View>

      {unreadCount > 0 ? (
        <View className="min-w-5 items-center justify-center rounded-full bg-[#bcdf21] px-1.5 py-0.5">
          <Text className="text-[10px] font-bold text-black">
            {unreadCount > 9 ? "9+" : unreadCount}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export default function MessagesScreen() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const isSignedIn = Boolean(session?.user);
  const { data, isLoading } = useConversations(isSignedIn);

  const conversations = data?.conversations ?? [];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]} style={{ flex: 1 }}>
      <ScreenHeader
        subtitle="Direct messages with players"
        title="Messages"
      />

      {isPending || (isSignedIn && isLoading) ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#bcdf21" />
        </View>
      ) : null}

      {!isPending && !isSignedIn ? (
        <View className="mx-4 mt-6 items-center rounded-2xl border border-dashed border-border/80 bg-surface/60 p-8">
          <View className="size-12 items-center justify-center rounded-full bg-surface-secondary">
            <Ionicons
              name="chatbubbles-outline"
              size={22}
              className="text-muted"
            />
          </View>
          <Text className="mt-3 text-sm font-bold text-foreground">
            Sign in to message players
          </Text>
          <Text className="mt-1 text-center text-xs text-muted">
            Direct messages, court coordination, and caster booking live here.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/you")}
            className="mt-4 rounded-lg bg-[#005c23] px-4 py-2 active:opacity-80 dark:bg-[#bcdf21]"
          >
            <Text className="text-xs font-bold text-white dark:text-black">
              Sign in
            </Text>
          </Pressable>
        </View>
      ) : null}

      {isSignedIn && !isLoading ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: 16 }}
        >
          {conversations.length > 0 ? (
            conversations.map((conversation) => (
              <ConversationRow
                conversation={conversation}
                key={conversation.conversation.id}
              />
            ))
          ) : (
            <View className="mt-2 items-center rounded-2xl border border-dashed border-border/80 bg-surface/60 p-8">
              <View className="size-12 items-center justify-center rounded-full bg-surface-secondary">
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={22}
                  className="text-muted"
                />
              </View>
              <Text className="mt-3 text-sm font-bold text-foreground">
                No messages yet
              </Text>
              <Text className="mt-1 text-center text-xs text-muted">
                Start a conversation from a player profile and it will show up
                here.
              </Text>
            </View>
          )}
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}
