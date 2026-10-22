import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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
import {
  useMarkNotificationsRead,
  useNotifications,
  type NotificationRecord,
} from "@/lib/hooks";

const iconForType = (type: string) => {
  if (type === "friend_request" || type === "friend_accept") {
    return "person-add-outline" as const;
  }
  if (type === "message" || type === "comment") {
    return "chatbubble-outline" as const;
  }
  if (type === "event") {
    return "calendar-outline" as const;
  }
  if (type === "casting_job") {
    return "videocam-outline" as const;
  }
  if (type === "challenge") {
    return "trophy-outline" as const;
  }
  return "notifications-outline" as const;
};

function formatDate(value?: string | null) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

function NotificationRow({ item }: { item: NotificationRecord }) {
  const router = useRouter();
  const { actor, notification } = item;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        if (Platform.OS === "ios") {
          Haptics.selectionAsync();
        }
        if (notification.href) {
          router.push(notification.href as never);
        }
      }}
      className="mx-4 mb-2 flex-row gap-3 rounded-2xl border border-border/50 bg-surface p-4 active:opacity-80"
    >
      <View className="size-10 items-center justify-center rounded-xl bg-[#005c23]/15">
        <Ionicons
          name={iconForType(notification.type)}
          size={18}
          color="#bcdf21"
        />
      </View>

      <View className="flex-1">
        <View className="flex-row items-start justify-between gap-2">
          <Text className="flex-1 text-sm font-bold text-foreground">
            {notification.title}
          </Text>
          {notification.readAt ? null : (
            <View className="mt-1 size-2 rounded-full bg-[#bcdf21]" />
          )}
        </View>

        {notification.body ? (
          <Text className="mt-1 text-xs leading-relaxed text-muted">
            {notification.body}
          </Text>
        ) : null}

        <View className="mt-1.5 flex-row items-center gap-2">
          {actor ? (
            <Text className="text-[10px] text-muted">From {actor.name}</Text>
          ) : null}
          {notification.createdAt ? (
            <Text className="text-[10px] text-muted">
              {formatDate(notification.createdAt)}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const isSignedIn = Boolean(session?.user);
  const { data, isLoading } = useNotifications(isSignedIn);
  const markAllRead = useMarkNotificationsRead();

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const handleMarkAllRead = () => {
    if (unreadCount === 0) {
      return;
    }
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    markAllRead.mutate();
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background">
      <ScreenHeader
        showBack
        subtitle="Friend requests, messages & event updates"
        title="Notifications"
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
              name="notifications-outline"
              size={22}
              className="text-muted"
            />
          </View>
          <Text className="mt-3 text-sm font-bold text-foreground">
            Sign in for notifications
          </Text>
          <Text className="mt-1 text-center text-xs text-muted">
            Friend requests, messages, event updates, and match activity will
            appear here.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/(tabs)/you")}
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
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          <View className="flex-row items-center justify-between px-4 py-3">
            <Text className="text-[11px] font-bold uppercase tracking-wider text-muted">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={unreadCount === 0 || markAllRead.isPending}
              hitSlop={8}
              onPress={handleMarkAllRead}
              className="active:opacity-70"
            >
              <Text
                className={`text-xs font-semibold ${
                  unreadCount > 0
                    ? "text-[#005c23] dark:text-[#bcdf21]"
                    : "text-muted"
                }`}
              >
                Mark all read
              </Text>
            </Pressable>
          </View>

          {notifications.length > 0 ? (
            notifications.map((item) => (
              <NotificationRow item={item} key={item.notification.id} />
            ))
          ) : (
            <View className="mx-4 mt-2 items-center rounded-2xl border border-dashed border-border/80 bg-surface/60 p-8">
              <View className="size-12 items-center justify-center rounded-full bg-surface-secondary">
                <Ionicons
                  name="notifications-off-outline"
                  size={22}
                  className="text-muted"
                />
              </View>
              <Text className="mt-3 text-sm font-bold text-foreground">
                No notifications yet
              </Text>
              <Text className="mt-1 text-center text-xs text-muted">
                Friend requests, messages, event updates, and match activity
                will appear here.
              </Text>
            </View>
          )}
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}
