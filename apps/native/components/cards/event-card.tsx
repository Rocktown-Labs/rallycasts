import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import type { EventData } from "@/lib/demo-data";

interface EventCardProps {
  event: EventData;
}

export function EventCard({ event }: EventCardProps) {
  const router = useRouter();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/events/${event.id}`);
  };

  const spotsLeft = (event.capacity ?? 32) - (event.registeredCount ?? 0);

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
        {event.imageUrl ? (
          <View className="relative h-28 w-full bg-surface-secondary">
            <Image
              source={{ uri: event.imageUrl }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              transition={200}
            />
            <View className="absolute top-2.5 left-2.5 rounded-md bg-black/80 px-2 py-0.5">
              <Text className="text-[10px] font-bold text-[#bcdf21]">
                {event.category || "Tournament"}
              </Text>
            </View>
            {event.priceCents ? (
              <View className="absolute top-2.5 right-2.5 rounded-md bg-[#005c23] px-2 py-0.5">
                <Text className="text-[10px] font-bold text-white">
                  ${(event.priceCents / 100).toFixed(0)} Entry
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View className="p-4">
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="calendar-outline" size={13} color="#bcdf21" />
            <Text className="text-xs font-semibold text-[#005c23] dark:text-[#bcdf21]">
              {event.dateLabel || "Upcoming"}
            </Text>
          </View>

          <Text numberOfLines={2} className="mt-1 text-base font-bold text-foreground">
            {event.name}
          </Text>

          <View className="mt-2 flex-row items-center gap-1">
            <Ionicons name="location-outline" size={13} className="text-muted" />
            <Text numberOfLines={1} className="text-xs text-muted">
              {event.location || event.venueName || "Local Courts"}
            </Text>
          </View>

          <View className="mt-3 flex-row items-center justify-between border-t border-border/40 pt-2.5">
            <View className="flex-row items-center gap-2">
              <View className="flex-row items-center gap-1">
                <Ionicons name="people-outline" size={13} className="text-muted" />
                <Text className="text-xs text-muted">
                  {event.registeredCount ?? 0}/{event.capacity ?? 32}
                </Text>
              </View>
              {spotsLeft > 0 && spotsLeft <= 8 ? (
                <View className="rounded-md bg-amber-500/15 px-1.5 py-0.5">
                  <Text className="text-[10px] font-bold text-amber-500">
                    {spotsLeft} spots left
                  </Text>
                </View>
              ) : null}
            </View>

            <View className="rounded-lg bg-[#005c23] px-3 py-1.5">
              <Text className="text-xs font-bold text-white">View Details</Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
