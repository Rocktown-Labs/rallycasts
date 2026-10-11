import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { ThemeToggle } from "@/components/theme-toggle";
import { authClient } from "@/lib/auth-client";

interface ScreenHeaderProps {
  showBack?: boolean;
  subtitle?: string;
  title?: string;
}

export function ScreenHeader({ showBack = false, subtitle, title }: ScreenHeaderProps) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const avatarScale = useSharedValue(1);

  const avatarAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: avatarScale.value }],
  }));

  const handleAvatarPress = () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push("/account");
  };

  const handleBackPress = () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  const userName = session?.user?.name || "Guest";
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <View className="flex-row items-center justify-between border-b border-border/40 bg-background/95 px-4 py-3">
      <View className="flex-row items-center gap-2.5">
        {showBack ? (
          <Pressable
            hitSlop={8}
            onPress={handleBackPress}
            className="size-8 items-center justify-center rounded-full bg-surface active:opacity-70"
          >
            <Ionicons name="chevron-back" size={20} className="text-foreground" />
          </Pressable>
        ) : null}

        <View>
          <View className="flex-row items-center gap-1.5">
            <View className="size-5 items-center justify-center rounded-full bg-[#005c23]">
              <Ionicons name="tennisball-outline" size={13} color="#bcdf21" />
            </View>
            <Text className="text-lg font-bold tracking-tight text-foreground">
              {title || "RallyCasts"}
            </Text>
          </View>
          {subtitle ? (
            <Text className="text-[11px] text-muted">{subtitle}</Text>
          ) : null}
        </View>
      </View>

      <View className="flex-row items-center gap-1.5">
        <ThemeToggle />

        <Animated.View style={avatarAnimatedStyle}>
          <Pressable
            hitSlop={8}
            onPressIn={() => {
              avatarScale.value = withTiming(0.92, { duration: 100 });
            }}
            onPressOut={() => {
              avatarScale.value = withTiming(1, { duration: 150 });
            }}
            onPress={handleAvatarPress}
            accessibilityLabel="My Account"
            accessibilityRole="button"
            className="size-8 items-center justify-center rounded-full border border-border bg-[#005c23]/15"
          >
            {session?.user ? (
              <Text className="text-xs font-bold text-[#005c23] dark:text-[#bcdf21]">
                {userInitial}
              </Text>
            ) : (
              <Ionicons name="person-outline" size={16} className="text-foreground" />
            )}
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}
