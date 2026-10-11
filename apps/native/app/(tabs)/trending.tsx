import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ParkCard, PlayerCard, VideoCard } from "@/components/cards";
import { ScreenHeader } from "@/components/header";
import { useTrending } from "@/lib/hooks";

const RADIUS_OPTIONS = [
  { label: "All Areas", value: 0 },
  { label: "5 mi", value: 5 },
  { label: "15 mi", value: 15 },
  { label: "25 mi", value: 25 },
  { label: "50 mi", value: 50 },
];

export default function TrendingScreen() {
  const [selectedRadius, setSelectedRadius] = useState<number>(15);
  const { data: trendingData, isLoading } = useTrending(
    selectedRadius === 0 ? undefined : selectedRadius
  );

  const handleRadiusSelect = (radius: number) => {
    if (Platform.OS === "ios") {
      Haptics.selectionAsync();
    }
    setSelectedRadius(radius);
  };

  const venues = trendingData?.venues || [];
  const videos = trendingData?.videos || [];
  const players = trendingData?.players || [];

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background">
      <ScreenHeader
        title="Trending"
        subtitle="Hot courts, match highlights & local leaders"
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

        {/* Trending Courts */}
        <View className="mt-4 px-4">
          <View className="mb-3 flex-row items-center justify-between">
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="flame" size={18} color="#bcdf21" />
              <Text className="text-lg font-bold tracking-tight text-foreground">
                Courts With Heat
              </Text>
            </View>
            <Text className="text-xs text-muted">Active players now</Text>
          </View>

          {venues.map((venue) => (
            <ParkCard key={venue.id} venue={venue} />
          ))}
        </View>

        {/* Trending Videos */}
        <View className="mt-6 px-4">
          <View className="mb-3 flex-row items-center justify-between">
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="play-circle" size={18} color="#bcdf21" />
              <Text className="text-lg font-bold tracking-tight text-foreground">
                Trending Matches
              </Text>
            </View>
            <Text className="text-xs text-muted">Most watched this week</Text>
          </View>

          {videos.slice(0, 2).map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </View>

        {/* Top Players Nearby */}
        <View className="mt-6 px-4">
          <View className="mb-3 flex-row items-center justify-between">
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="trophy" size={18} color="#bcdf21" />
              <Text className="text-lg font-bold tracking-tight text-foreground">
                Top Players Nearby
              </Text>
            </View>
            <Text className="text-xs text-muted">Active in your region</Text>
          </View>

          {players.slice(0, 3).map((player) => (
            <PlayerCard key={player.id} player={player} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
