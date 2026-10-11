import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import type { VideoData } from "@/lib/demo-data";

interface ClipCardProps {
  clip: VideoData;
}

export function ClipCard({ clip }: ClipCardProps) {
  const router = useRouter();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/videos/${clip.id}`);
  };

  return (
    <Animated.View style={animatedStyle} className="mr-3 w-40">
      <Pressable
        onPressIn={() => {
          scale.value = withTiming(0.96, { duration: 120 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 150 });
        }}
        onPress={handlePress}
        className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl border border-border/50 bg-black active:opacity-90"
      >
        {clip.thumbnailUrl ? (
          <Image
            source={{ uri: clip.thumbnailUrl }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View className="size-full items-center justify-center bg-gradient-to-b from-[#005c23] to-black">
            <Ionicons name="flame" size={32} color="#bcdf21" />
          </View>
        )}

        {/* Top duration pill */}
        {clip.durationSeconds ? (
          <View className="absolute top-2.5 right-2.5 rounded-full bg-black/70 px-2 py-0.5">
            <Text className="text-[10px] font-bold text-white">
              {clip.durationSeconds}s
            </Text>
          </View>
        ) : null}

        {/* Bottom gradient info */}
        <View className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/60 to-transparent p-3 pt-8">
          <Text numberOfLines={2} className="text-xs font-bold leading-tight text-white">
            {clip.title}
          </Text>
          <View className="mt-1 flex-row items-center justify-between">
            <Text numberOfLines={1} className="text-[11px] font-medium text-white/80">
              {clip.owner?.name || "Player"}
            </Text>
            {clip.viewsCount ? (
              <Text className="text-[10px] text-[#bcdf21]">
                {clip.viewsCount >= 1000 ? `${(clip.viewsCount / 1000).toFixed(1)}k` : clip.viewsCount}
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
