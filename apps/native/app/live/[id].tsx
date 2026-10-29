import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useLiveStream } from "@/lib/hooks";

export default function LiveStreamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: stream, isLoading } = useLiveStream(id ?? "");
  const playbackUrl =
    stream?.isLive && stream.muxPlaybackId
      ? `https://stream.mux.com/${encodeURIComponent(stream.muxPlaybackId)}.m3u8`
      : "";
  const player = useVideoPlayer(playbackUrl, (configuredPlayer) => {
    configuredPlayer.loop = false;
    configuredPlayer.play();
  });

  if (isLoading) {
    return (
      <SafeAreaView className="bg-background flex-1 items-center justify-center">
        <Text className="text-muted text-sm">Loading live stream…</Text>
      </SafeAreaView>
    );
  }

  if (!stream) {
    return (
      <SafeAreaView className="bg-background flex-1 items-center justify-center px-6">
        <Ionicons name="radio-outline" size={42} color="#8892a0" />
        <Text className="text-foreground mt-3 text-lg font-bold">
          Live stream not found
        </Text>
        <Text className="text-muted mt-1 text-center text-sm">
          This stream is private, deleted, or no longer available.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="bg-background flex-1" edges={["bottom"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {playbackUrl ? (
          <VideoView
            contentFit="contain"
            player={player}
            style={{ aspectRatio: 16 / 9, width: "100%" }}
          />
        ) : (
          <View className="aspect-video w-full items-center justify-center bg-black px-6">
            <Ionicons name="radio-outline" size={40} color="#8892a0" />
            <Text className="mt-2 text-center text-sm text-white/70">
              {stream.status === "idle"
                ? "The encoder has not connected yet."
                : "This stream has ended."}
            </Text>
          </View>
        )}

        <View className="space-y-3 p-4">
          <View className="flex-row items-center gap-2">
            <View
              className={`rounded-full px-2 py-0.5 ${stream.isLive ? "bg-red-500" : "bg-surface"}`}
            >
              <Text className="text-[10px] font-black tracking-wider text-white uppercase">
                {stream.isLive ? "Live" : "Ended"}
              </Text>
            </View>
          </View>
          <Text className="text-foreground text-2xl font-black tracking-tight">
            {stream.title}
          </Text>
          <Text className="text-muted text-sm">
            {stream.owner?.name ?? "RallyCasts creator"}
          </Text>
          {stream.description ? (
            <Text className="text-foreground/90 text-sm leading-relaxed">
              {stream.description}
            </Text>
          ) : null}

          {stream.recordingVideoId ? (
            <Pressable
              className="bg-primary mt-2 flex-row items-center justify-center gap-2 rounded-xl py-3 active:opacity-80"
              onPress={() =>
                router.push({
                  pathname: "/videos/[id]",
                  params: { id: stream.recordingVideoId ?? "" },
                })
              }
            >
              <Ionicons name="play" size={16} color="#090d12" />
              <Text className="text-primary-foreground text-sm font-bold">
                Watch the replay
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
