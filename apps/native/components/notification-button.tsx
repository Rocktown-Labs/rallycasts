import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, Text, View } from "react-native";

import { authClient } from "@/lib/auth-client";
import { useNotifications } from "@/lib/hooks";

export function NotificationButton() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const isSignedIn = Boolean(session?.user);
  const { data } = useNotifications(isSignedIn);
  const unread = data?.unreadCount ?? 0;

  if (!isSignedIn) {
    return null;
  }

  return (
    <Pressable
      accessibilityLabel={
        unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
      }
      accessibilityRole="button"
      hitSlop={8}
      onPress={() => {
        if (Platform.OS === "ios") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        router.push("/notifications");
      }}
      className="size-8 items-center justify-center rounded-full active:opacity-70"
    >
      <Ionicons
        name="notifications-outline"
        size={20}
        className="text-foreground"
      />
      {unread > 0 ? (
        <View className="absolute -top-0.5 -right-0.5 size-4 items-center justify-center rounded-full bg-[#bcdf21]">
          <Text className="text-[9px] font-bold text-black">
            {unread > 9 ? "9+" : unread}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
