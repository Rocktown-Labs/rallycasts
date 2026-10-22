import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ParkCard, PlayerCard, VideoCard } from "@/components/cards";
import { ScreenHeader } from "@/components/header";
import { RADIUS_OPTIONS } from "@/lib/discovery";
import { useTrending } from "@/lib/hooks";
import type { PlayerData } from "@/lib/demo-data";

const SHELF_CARD_GAP = 12;
const MAX_SHELF_CARD_WIDTH = 320;
const RANKED_PLAYERS_LIMIT = 20;

function RankedPlayerCard({
  player,
  rank,
  width,
}: {
  player: PlayerData;
  rank: number;
  width: number;
}) {
  return (
    <View className="relative" style={{ width }}>
      <View className="absolute -top-1.5 -left-1.5 z-10 size-8 items-center justify-center rounded-full border-2 border-background bg-[#005c23]">
        <Text className="text-xs font-black text-[#bcdf21]">{rank}</Text>
      </View>
      <PlayerCard player={player} />
    </View>
  );
}

export default function TrendingScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [selectedRadius, setSelectedRadius] = useState<number>(15);
  const { data: trendingData } = useTrending(
    selectedRadius === 0 ? undefined : selectedRadius
  );

  const handleRadiusSelect = (radius: number) => {
    if (Platform.OS === "ios") {
      Haptics.selectionAsync();
    }
    setSelectedRadius(radius);
  };

  const handleViewAll = (path: string) => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(path as never);
  };

  const handleViewAllParks = () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push({
      params: { radius: String(selectedRadius) },
      pathname: "/parks",
    });
  };

  const venues = trendingData?.venues || [];
  const videos = trendingData?.videos || [];
  const players = (trendingData?.players || []).slice(0, RANKED_PLAYERS_LIMIT);

  const shelfCardWidth = Math.min(
    MAX_SHELF_CARD_WIDTH,
    Math.round(width * 0.78)
  );
  const snapInterval = shelfCardWidth + SHELF_CARD_GAP;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]} style={{ flex: 1 }}>
      <ScreenHeader
        subtitle="Hot courts, match highlights & local leaders"
        title="Trending"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 36 }}
      >
        {/* Radius filter pills */}
        <View className="border-b border-border/40 py-3">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          >
            {RADIUS_OPTIONS.map((opt) => {
              const isSelected = selectedRadius === opt.value;

              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  key={opt.value}
                  onPress={() => handleRadiusSelect(opt.value)}
                  className={`rounded-full px-4 py-1.5 active:opacity-80 ${
                    isSelected
                      ? "bg-[#005c23] dark:bg-[#bcdf21]"
                      : "border border-border/60 bg-surface"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      isSelected
                        ? "text-white dark:text-black"
                        : "text-foreground"
                    }`}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Courts With Heat — horizontal shelf */}
        {venues.length > 0 ? (
          <View className="mt-5">
            <View className="mb-3 flex-row items-center justify-between px-4">
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="flame" size={18} color="#bcdf21" />
                <Text className="text-lg font-bold tracking-tight text-foreground">
                  Courts With Heat
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={handleViewAllParks}
                className="active:opacity-70"
              >
                <Text className="text-xs font-semibold text-[#005c23] dark:text-[#bcdf21]">
                  View All
                </Text>
              </Pressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToAlignment="start"
              snapToInterval={snapInterval}
              contentContainerStyle={{
                gap: SHELF_CARD_GAP,
                paddingBottom: 4,
                paddingHorizontal: 16,
              }}
            >
              {venues.map((venue) => (
                <View key={venue.id} style={{ width: shelfCardWidth }}>
                  <ParkCard venue={venue} />
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Trending Matches — horizontal shelf */}
        {videos.length > 0 ? (
          <View className="mt-5">
            <View className="mb-3 flex-row items-center justify-between px-4">
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="play-circle" size={18} color="#bcdf21" />
                <Text className="text-lg font-bold tracking-tight text-foreground">
                  Trending Matches
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => handleViewAll("/videos")}
                className="active:opacity-70"
              >
                <Text className="text-xs font-semibold text-[#005c23] dark:text-[#bcdf21]">
                  View All
                </Text>
              </Pressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToAlignment="start"
              snapToInterval={snapInterval}
              contentContainerStyle={{
                gap: SHELF_CARD_GAP,
                paddingBottom: 4,
                paddingHorizontal: 16,
              }}
            >
              {videos.map((video) => (
                <View key={video.id} style={{ width: shelfCardWidth }}>
                  <VideoCard video={video} />
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Top Players Nearby — ranked pager */}
        {players.length > 0 ? (
          <View className="mt-5">
            <View className="mb-3 flex-row items-center justify-between px-4">
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="trophy" size={18} color="#bcdf21" />
                <Text className="text-lg font-bold tracking-tight text-foreground">
                  Top Players Nearby
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => handleViewAll("/players")}
                className="active:opacity-70"
              >
                <Text className="text-xs font-semibold text-[#005c23] dark:text-[#bcdf21]">
                  View All
                </Text>
              </Pressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToAlignment="start"
              snapToInterval={snapInterval}
              contentContainerStyle={{
                gap: SHELF_CARD_GAP,
                paddingBottom: 4,
                paddingHorizontal: 16,
              }}
            >
              {players.map((player, index) => (
                <RankedPlayerCard
                  key={player.id}
                  player={player}
                  rank={index + 1}
                  width={shelfCardWidth}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
