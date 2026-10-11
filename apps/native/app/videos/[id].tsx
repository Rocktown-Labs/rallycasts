import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useVideo } from "@/lib/hooks";

export default function VideoDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: video } = useVideo(id || "");
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(42);

  const handleLike = () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsLiked((prev) => !prev);
    setLikesCount((prev) => (isLiked ? prev - 1 : prev + 1));
  };

  const handleShare = () => {
    if (Platform.OS === "ios") {
      Haptics.selectionAsync();
    }
  };

  if (!video) {
    return (
      <SafeAreaView edges={["bottom"]} className="flex-1 items-center justify-center bg-background">
        <Text className="text-sm text-muted">Loading match highlights...</Text>
      </SafeAreaView>
    );
  }

  const authorName = video.owner?.name || "RallyCasts Player";
  const authorInitial = authorName.charAt(0).toUpperCase();

  return (
    <SafeAreaView edges={["bottom"]} className="flex-1 bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Video Player Mock / Thumbnail */}
        <View className="relative aspect-video w-full bg-black">
          {video.thumbnailUrl ? (
            <Image
              source={{ uri: video.thumbnailUrl }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />
          ) : (
            <View className="size-full items-center justify-center bg-gradient-to-br from-[#005c23] to-black">
              <Ionicons name="videocam" size={48} color="#bcdf21" />
            </View>
          )}

          {/* Central Play Indicator */}
          <View className="absolute inset-0 items-center justify-center">
            <View className="size-16 items-center justify-center rounded-full bg-black/60 shadow-lg">
              <Ionicons name="play" size={30} color="#bcdf21" style={{ marginLeft: 3 }} />
            </View>
          </View>
        </View>

        {/* Video Info */}
        <View className="p-4">
          <Text className="text-xl font-bold tracking-tight text-foreground">
            {video.title}
          </Text>

          <View className="mt-2 flex-row items-center gap-2">
            <Text className="text-xs text-muted">
              {video.viewsCount ?? 1420} views
            </Text>
            <Text className="text-xs text-muted">•</Text>
            <Text className="text-xs text-muted">
              Recorded with RallyCasts 4K
            </Text>
          </View>

          {/* Action Row */}
          <View className="my-4 flex-row items-center gap-3 border-y border-border/40 py-3">
            <Pressable
              onPress={handleLike}
              className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-2.5 active:opacity-80 ${
                isLiked
                  ? "bg-red-500/15 border border-red-500/30"
                  : "bg-surface border border-border/60"
              }`}
            >
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={18}
                color={isLiked ? "#ef4444" : "#888888"}
              />
              <Text
                className={`text-xs font-bold ${
                  isLiked ? "text-red-500" : "text-foreground"
                }`}
              >
                {likesCount} Likes
              </Text>
            </Pressable>

            <Pressable
              onPress={handleShare}
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-surface py-2.5 active:opacity-80"
            >
              <Ionicons name="share-social-outline" size={18} className="text-foreground" />
              <Text className="text-xs font-bold text-foreground">Share</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push("/casters")}
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-[#005c23] py-2.5 active:opacity-90"
            >
              <Ionicons name="videocam-outline" size={18} color="#ffffff" />
              <Text className="text-xs font-bold text-white">Book Caster</Text>
            </Pressable>
          </View>

          {/* Author Card */}
          <Pressable
            onPress={() => {
              if (video.owner?.username) {
                router.push(`/players/${video.owner.username}`);
              }
            }}
            className="flex-row items-center gap-3 rounded-2xl border border-border/50 bg-surface p-3.5 active:opacity-90"
          >
            {video.owner?.image ? (
              <Image
                source={{ uri: video.owner.image }}
                style={{ width: 44, height: 44, borderRadius: 22 }}
                contentFit="cover"
              />
            ) : (
              <View className="size-11 items-center justify-center rounded-full bg-[#005c23]">
                <Text className="text-base font-bold text-[#bcdf21]">
                  {authorInitial}
                </Text>
              </View>
            )}

            <View className="flex-1">
              <Text className="text-sm font-bold text-foreground">
                {authorName}
              </Text>
              <Text className="text-xs text-muted">
                @{video.owner?.username || "player"}
              </Text>
            </View>

            <View className="rounded-lg border border-[#bcdf21]/30 bg-[#bcdf21]/15 px-3 py-1.5">
              <Text className="text-xs font-bold text-[#005c23] dark:text-[#bcdf21]">
                View Profile
              </Text>
            </View>
          </Pressable>

          {/* Description */}
          {video.description ? (
            <View className="mt-4 rounded-2xl border border-border/40 bg-surface/50 p-4">
              <Text className="text-xs font-bold text-foreground">About This Match</Text>
              <Text className="mt-1 text-xs leading-relaxed text-muted">
                {video.description}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
