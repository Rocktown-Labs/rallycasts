import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import React from "react";
import { Platform, Pressable, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import type { CasterData } from "@/lib/demo-data";

interface CasterCardProps {
  caster: CasterData;
  onBook?: (caster: CasterData) => void;
}

export function CasterCard({ caster, onBook }: CasterCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleBook = () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onBook?.(caster);
  };

  const initial = (caster.displayName || "C").charAt(0).toUpperCase();

  return (
    <Animated.View style={animatedStyle} className="mb-3.5 w-full">
      <View className="overflow-hidden rounded-2xl border border-border/60 bg-surface p-4 shadow-xs">
        <View className="flex-row items-center gap-3.5">
          {caster.imageUrl ? (
            <Image
              source={{ uri: caster.imageUrl }}
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
                {caster.displayName || "RallyCasts Caster"}
              </Text>
              <View className="flex-row items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5">
                <View className="size-1.5 rounded-full bg-emerald-500" />
                <Text className="text-[10px] font-bold text-emerald-500">On Duty</Text>
              </View>
            </View>

            <View className="mt-1 flex-row items-center gap-2">
              <Text className="text-xs text-muted">
                {caster.serviceRadiusMiles ?? 25} mi dispatch range
              </Text>
              {caster.hourlyRateCents ? (
                <>
                  <Text className="text-xs text-muted">•</Text>
                  <Text className="text-xs font-semibold text-[#005c23] dark:text-[#bcdf21]">
                    ${(caster.hourlyRateCents / 100).toFixed(0)}/hr
                  </Text>
                </>
              ) : null}
            </View>
          </View>
        </View>

        {caster.bio ? (
          <Text numberOfLines={2} className="mt-2.5 text-xs leading-relaxed text-muted">
            {caster.bio}
          </Text>
        ) : null}

        {caster.equipment?.length ? (
          <View className="mt-3 flex-row flex-wrap gap-1.5">
            {caster.equipment.map((item) => (
              <View key={item} className="rounded-md bg-surface-secondary px-2 py-0.5">
                <Text className="text-[10px] font-medium text-muted">{item}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View className="mt-3.5 flex-row items-center justify-between border-t border-border/40 pt-2.5">
          <View className="flex-row items-center gap-1">
            <Ionicons name="star" size={13} color="#bcdf21" />
            <Text className="text-xs font-semibold text-foreground">
              {caster.rating ? caster.rating.toFixed(1) : "New"}
            </Text>
            <Text className="text-xs text-muted">
              ({caster.matchesStreamed ?? 0} matches)
            </Text>
          </View>

          <Pressable
            onPressIn={() => {
              scale.value = withTiming(0.96, { duration: 120 });
            }}
            onPressOut={() => {
              scale.value = withTiming(1, { duration: 150 });
            }}
            onPress={handleBook}
            className="flex-row items-center gap-1.5 rounded-lg bg-[#005c23] px-3.5 py-1.5 active:opacity-90"
          >
            <Ionicons name="videocam-outline" size={14} color="#ffffff" />
            <Text className="text-xs font-bold text-white">Book Caster</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}
