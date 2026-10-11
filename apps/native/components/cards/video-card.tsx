import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import type { VideoData } from "@/lib/demo-data";

interface VideoCardProps {
  video: VideoData;
}

function formatDuration(seconds?: number | null) {
  if (!seconds) {
    return "0:00";
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatViews(views?: number | null) {
  if (!views) {
    return "0 views";
  }
  if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}k views`;
  }
  return `${views} views`;
}

export function VideoCard({ video }: VideoCardProps) {
  const router = useRouter();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/videos/${video.id}`);
  };

  const authorName = video.owner?.name || "RallyCasts Player";
  const authorInitial = authorName.charAt(0).toUpperCase();

  return (
    <Animated.View style={animatedStyle} className="mb-4 w-full">
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
        {/* Thumbnail container (16:9) */}
        <View className="relative aspect-video w-full bg-surface-secondary">
          {video.thumbnailUrl ? (
            <Image
              source={{ uri: video.thumbnailUrl }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View className="size-full items-center justify-center bg-gradient-to-br from-[#005c23]/30 to-[#bcdf21]/15">
              <Ionicons name="videocam" size={32} color="#bcdf21" />
            </View>
          )}

          {/* Play button overlay */}
          <View className="absolute inset-0 items-center justify-center">
            <View className="size-10 items-center justify-center rounded-full bg-black/60 backdrop-blur-xs">
              <Ionicons name="play" size={18} color="#ffffff" style={{ marginLeft: 2 }} />
            </View>
          </View>

          {/* Duration badge */}
          {video.durationSeconds ? (
            <View className="absolute bottom-2.5 right-2.5 rounded-md bg-black/80 px-2 py-0.5">
              <Text className="text-[11px] font-semibold text-white">
                {formatDuration(video.durationSeconds)}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Video meta */}
        <View className="flex-row gap-3 p-3.5">
          {video.owner?.image ? (
            <Image
              source={{ uri: video.owner.image }}
              style={{ width: 36, height: 36, borderRadius: 18 }}
              contentFit="cover"
            />
          ) : (
            <View className="size-9 items-center justify-center rounded-full bg-[#005c23]/20">
              <Text className="text-xs font-bold text-[#005c23] dark:text-[#bcdf21]">
                {authorInitial}
              </Text>
            </View>
          )}

          <View className="flex-1">
            <Text numberOfLines={2} className="text-sm font-bold text-foreground">
              {video.title}
            </Text>
            <View className="mt-1 flex-row items-center gap-1.5">
              <Text numberOfLines={1} className="text-xs text-muted">
                {authorName}
              </Text>
              <Text className="text-xs text-muted">•</Text>
              <Text className="text-xs text-muted">
                {formatViews(video.viewsCount)}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
