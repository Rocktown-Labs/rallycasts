import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useEffect, useRef } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  useRecordVideoView,
  useToggleVideoLike,
  useVideo,
  useVideoSocial,
} from "@/lib/hooks";

export default function VideoDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: video, error: videoError } = useVideo(id || "");
  const { data: social } = useVideoSocial(id || "");
  const likeMutation = useToggleVideoLike(id || "");
  const recordView = useRecordVideoView(id || "");
  const viewRecordedRef = useRef(false);
  const playbackUrl = video?.muxPlaybackId
    ? `https://stream.mux.com/${encodeURIComponent(video.muxPlaybackId)}.m3u8`
    : "";
  const player = useVideoPlayer(playbackUrl, (configuredPlayer) => {
    configuredPlayer.loop = false;
  });
  const isLiked = social?.hasLiked ?? false;
  const likesCount = social?.likes ?? 0;
  const viewsCount = social?.views ?? video?.viewsCount ?? 0;

  useEffect(() => {
    if (video && playbackUrl && !viewRecordedRef.current) {
      viewRecordedRef.current = true;
      recordView.mutate();
    }
  }, [playbackUrl, recordView, video]);

  const handleLike = () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    likeMutation.mutate(!isLiked, {
      onError: () => Alert.alert("Could not update like", "Try again."),
    });
  };

  const handleShare = () => {
    if (Platform.OS === "ios") {
      Haptics.selectionAsync();
    }
    void Share.share({
      message: `${video?.title ?? "RallyCasts highlight"} https://rallycasts.com/videos/${id}`,
      url: `https://rallycasts.com/videos/${id}`,
    });
  };

  if (videoError) {
    return (
      <SafeAreaView
        edges={["bottom"]}
        className="bg-background flex-1 items-center justify-center px-6"
      >
        <Ionicons name="videocam-off-outline" size={42} color="#8892a0" />
        <Text className="text-foreground mt-3 text-lg font-bold">
          Video not found
        </Text>
        <Text className="text-muted mt-1 text-center text-sm">
          This highlight is private or no longer available.
        </Text>
      </SafeAreaView>
    );
  }

  if (!video) {
    return (
      <SafeAreaView
        edges={["bottom"]}
        className="bg-background flex-1 items-center justify-center"
      >
        <Text className="text-muted text-sm">Loading match highlights...</Text>
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
        {playbackUrl ? (
          <VideoView
            contentFit="contain"
            player={player}
            style={{ aspectRatio: 16 / 9, width: "100%" }}
          />
        ) : (
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

            <View className="absolute inset-0 items-center justify-center">
              <View className="size-16 items-center justify-center rounded-full bg-black/60 shadow-lg">
                <Ionicons
                  name="play"
                  size={30}
                  color="#bcdf21"
                  style={{ marginLeft: 3 }}
                />
              </View>
            </View>
          </View>
        )}

        {/* Video Info */}
        <View className="p-4">
          <Text className="text-xl font-bold tracking-tight text-foreground">
            {video.title}
          </Text>

          <View className="mt-2 flex-row items-center gap-2">
            <Text className="text-xs text-muted">
              {viewsCount} views
            </Text>
            <Text className="text-xs text-muted">•</Text>
            <Text className="text-xs text-muted">Shared on RallyCasts</Text>
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
