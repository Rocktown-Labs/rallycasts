import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import type { PlayerData } from "@/lib/demo-data";

interface PlayerCardProps {
  player: PlayerData;
}

export function PlayerCard({ player }: PlayerCardProps) {
  const router = useRouter();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/players/${player.username || player.id}`);
  };

  const initial = player.name.charAt(0).toUpperCase();

  return (
    <Animated.View style={animatedStyle} className="mb-3.5 w-full">
      <Pressable
        onPressIn={() => {
          scale.value = withTiming(0.97, { duration: 120 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 150 });
        }}
        onPress={handlePress}
        className="rounded-2xl border border-border/60 bg-surface p-4 shadow-xs active:opacity-95"
      >
        <View className="flex-row items-center gap-3.5">
          {player.image ? (
            <Image
              source={{ uri: player.image }}
              style={{ width: 48, height: 48, borderRadius: 24 }}
              contentFit="cover"
            />
          ) : (
            <View className="size-12 items-center justify-center rounded-full bg-[#005c23]/20">
              <Text className="text-base font-bold text-[#005c23] dark:text-[#bcdf21]">
                {initial}
              </Text>
            </View>
          )}

          <View className="flex-1">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-bold text-foreground">
                {player.name}
              </Text>
              {player.skillLevel ? (
                <View className="rounded-md border border-[#bcdf21]/30 bg-[#bcdf21]/15 px-2 py-0.5">
                  <Text className="text-[11px] font-bold text-[#005c23] dark:text-[#bcdf21]">
                    {player.skillLevel}
                  </Text>
                </View>
              ) : null}
            </View>

            <Text className="text-xs text-muted">
              @{player.username || player.displayUsername || "player"}
            </Text>

            <View className="mt-1 flex-row items-center gap-1">
              <Ionicons name="location-outline" size={12} className="text-muted" />
              <Text numberOfLines={1} className="text-xs text-muted">
                {[player.homeCourtName, player.homeCity, player.homeState].filter(Boolean).join(" • ") || "Pickleball Enthusiast"}
              </Text>
            </View>
          </View>
        </View>

        {player.bio ? (
          <Text numberOfLines={2} className="mt-2.5 text-xs leading-relaxed text-muted">
            {player.bio}
          </Text>
        ) : null}

        <View className="mt-3 flex-row items-center justify-between border-t border-border/40 pt-2.5">
          <View className="flex-row items-center gap-3">
            {player.matchesPlayed ? (
              <Text className="text-[11px] text-muted">
                <Text className="font-semibold text-foreground">{player.matchesPlayed}</Text> matches
              </Text>
            ) : null}
            {player.winRate ? (
              <Text className="text-[11px] text-muted">
                <Text className="font-semibold text-[#005c23] dark:text-[#bcdf21]">{player.winRate}%</Text> win rate
              </Text>
            ) : null}
          </View>

          <View className="flex-row items-center gap-1">
            <Text className="text-xs font-semibold text-[#005c23] dark:text-[#bcdf21]">
              View Profile
            </Text>
            <Ionicons name="chevron-forward" size={12} color="#bcdf21" />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
