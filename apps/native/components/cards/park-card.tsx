import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import type { VenueData } from "@/lib/demo-data";

interface ParkCardProps {
  venue: VenueData;
}

export function ParkCard({ venue }: ParkCardProps) {
  const router = useRouter();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/venues/${venue.id}`);
  };

  const heatScore = venue.heatScore ?? 75;
  const heatWidthPercent = `${Math.min(Math.max(heatScore, 10), 100)}%`;

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
        className="overflow-hidden rounded-2xl border border-border/60 bg-surface shadow-xs active:opacity-95"
      >
        {/* Cover image or court pattern */}
        <View className="relative h-28 w-full bg-surface-secondary">
          {venue.photoUrl ? (
            <Image
              source={{ uri: venue.photoUrl }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View className="size-full items-center justify-center bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950">
              <Ionicons name="tennisball" size={28} color="#bcdf21" />
            </View>
          )}

          {/* Home court badge */}
          {venue.isHomeCourt ? (
            <View className="absolute top-2.5 left-2.5 flex-row items-center gap-1 rounded-full border border-[#bcdf21]/40 bg-black/80 px-2 py-0.5">
              <Ionicons name="star" size={11} color="#bcdf21" />
              <Text className="text-[10px] font-bold text-[#bcdf21]">Home Court</Text>
            </View>
          ) : null}

          {/* Distance */}
          {venue.distanceMiles !== undefined && venue.distanceMiles !== null ? (
            <View className="absolute top-2.5 right-2.5 rounded-full bg-black/75 px-2 py-0.5">
              <Text className="text-[10px] font-semibold text-white">
                {venue.distanceMiles} mi away
              </Text>
            </View>
          ) : null}

          {/* Heat bar indicator */}
          <View className="absolute inset-x-3 bottom-2.5">
            <View className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
              <View
                style={{ width: heatWidthPercent as `${number}%` }}
                className="h-full rounded-full bg-[#bcdf21]"
              />
            </View>
            <View className="mt-1 flex-row items-center justify-between">
              <View className="flex-row items-center gap-1">
                <Ionicons name="flame" size={12} color="#bcdf21" />
                <Text className="text-[11px] font-bold text-[#bcdf21]">
                  {heatScore}% heat
                </Text>
              </View>
              <Text className="text-[10px] font-medium text-white/90">
                {venue.activePlayers ?? 0} playing now
              </Text>
            </View>
          </View>
        </View>

        {/* Info */}
        <View className="p-3.5">
          <Text numberOfLines={1} className="text-base font-bold text-foreground">
            {venue.name}
          </Text>
          <View className="mt-1 flex-row items-center gap-1">
            <Ionicons name="location-outline" size={13} className="text-muted" />
            <Text numberOfLines={1} className="text-xs text-muted">
              {[venue.addressLine1, venue.city, venue.state].filter(Boolean).join(", ") || "Local Court"}
            </Text>
          </View>

          <View className="mt-2.5 flex-row items-center justify-between border-t border-border/40 pt-2.5">
            <View className="flex-row items-center gap-1">
              <Ionicons name="grid-outline" size={12} className="text-muted" />
              <Text className="text-xs font-medium text-muted">
                {venue.courtCount ?? 4} courts
              </Text>
            </View>
            <View className="rounded-md bg-surface-secondary px-2 py-0.5">
              <Text className="text-[11px] font-semibold text-foreground">
                {venue.openNow ? "Open now" : "Check hours"}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
