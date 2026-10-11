import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Alert, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { VideoCard } from "@/components/cards";
import { demoVideos } from "@/lib/demo-data";
import { usePlayer } from "@/lib/hooks";

export default function PlayerProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { data: player } = usePlayer(username || "");
  const [isChallenged, setIsChallenged] = useState(false);

  const handleChallenge = () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setIsChallenged(true);
    Alert.alert(
      "Challenge Sent!",
      `Match challenge sent to ${player?.name || "player"}. You will be notified when they accept!`
    );
  };

  if (!player) {
    return (
      <SafeAreaView edges={["bottom"]} className="flex-1 items-center justify-center bg-background">
        <Text className="text-sm text-muted">Loading player profile...</Text>
      </SafeAreaView>
    );
  }

  const initial = player.name.charAt(0).toUpperCase();

  return (
    <SafeAreaView edges={["bottom"]} className="flex-1 bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        {/* Profile Card */}
        <View className="mb-5 items-center rounded-3xl border border-border/60 bg-surface p-6 shadow-xs">
          {player.image ? (
            <Image
              source={{ uri: player.image }}
              style={{ width: 80, height: 80, borderRadius: 40 }}
              contentFit="cover"
            />
          ) : (
            <View className="size-20 items-center justify-center rounded-full bg-[#005c23]">
              <Text className="text-3xl font-black text-[#bcdf21]">
                {initial}
              </Text>
            </View>
          )}

          <Text className="mt-3 text-xl font-bold text-foreground">
            {player.name}
          </Text>
          <Text className="text-xs text-muted">
            @{player.username || player.displayUsername || "player"}
          </Text>

          {player.skillLevel ? (
            <View className="mt-2.5 rounded-full border border-[#bcdf21]/30 bg-[#bcdf21]/15 px-3 py-1">
              <Text className="text-xs font-bold text-[#005c23] dark:text-[#bcdf21]">
                {player.skillLevel}
              </Text>
            </View>
          ) : null}

          {player.bio ? (
            <Text className="mt-3 text-center text-xs leading-relaxed text-muted">
              {player.bio}
            </Text>
          ) : null}

          <View className="mt-3 flex-row items-center gap-1">
            <Ionicons name="location-outline" size={14} className="text-muted" />
            <Text className="text-xs font-medium text-muted">
              {[player.homeCourtName, player.homeCity, player.homeState].filter(Boolean).join(", ") || "Active Player"}
            </Text>
          </View>

          {/* Challenge Button */}
          <Pressable
            onPress={handleChallenge}
            disabled={isChallenged}
            className={`mt-4 w-full flex-row items-center justify-center gap-2 rounded-2xl py-3 active:opacity-90 ${
              isChallenged
                ? "bg-surface-secondary border border-border"
                : "bg-[#005c23]"
            }`}
          >
            <Ionicons
              name={isChallenged ? "checkmark-circle" : "flash"}
              size={18}
              color={isChallenged ? "#10b981" : "#ffffff"}
            />
            <Text
              className={`text-sm font-bold ${
                isChallenged ? "text-emerald-500" : "text-white"
              }`}
            >
              {isChallenged ? "Challenge Pending" : "Challenge to a Match"}
            </Text>
          </Pressable>
        </View>

        {/* Stats Grid */}
        <View className="mb-6 flex-row gap-2.5">
          <View className="flex-1 items-center rounded-2xl border border-border/50 bg-surface p-3.5">
            <Text className="text-xs text-muted">Matches</Text>
            <Text className="mt-1 text-2xl font-black text-foreground">
              {player.matchesPlayed ?? 48}
            </Text>
          </View>

          <View className="flex-1 items-center rounded-2xl border border-border/50 bg-surface p-3.5">
            <Text className="text-xs text-muted">Win Rate</Text>
            <Text className="mt-1 text-2xl font-black text-[#005c23] dark:text-[#bcdf21]">
              {player.winRate ?? 72}%
            </Text>
          </View>

          <View className="flex-1 items-center rounded-2xl border border-border/50 bg-surface p-3.5">
            <Text className="text-xs text-muted">Rating</Text>
            <Text className="mt-1 text-2xl font-black text-foreground">
              {player.skillLevel?.slice(0, 3) || "4.5"}
            </Text>
          </View>
        </View>

        {/* Match Highlights */}
        <View className="mb-6">
          <Text className="mb-3 text-base font-bold text-foreground">
            Match Highlights & Clips
          </Text>

          {demoVideos.slice(0, 2).map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
