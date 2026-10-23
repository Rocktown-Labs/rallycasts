import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { VideoCard } from "@/components/cards";
import { ScreenHeader } from "@/components/header";
import { VIDEO_SORTS, type VideoSort } from "@/lib/discovery";
import { useTrending } from "@/lib/hooks";
import { useTabContentInset } from "@/lib/tab-bar-inset";

export default function VideosScreen() {
  const tabContentInset = useTabContentInset();
  const [sort, setSort] = useState<VideoSort>("views");
  const { data, isLoading } = useTrending();

  const videos = useMemo(() => {
    const list = data?.videos ?? [];

    return [...list].sort((a, b) => {
      if (sort === "newest") {
        const aDate = new Date(a.publishedAt ?? a.createdAt ?? 0).getTime();
        const bDate = new Date(b.publishedAt ?? b.createdAt ?? 0).getTime();
        return bDate - aDate;
      }
      return (b.viewsCount ?? 0) - (a.viewsCount ?? 0);
    });
  }, [data?.videos, sort]);

  const handleSortSelect = (value: VideoSort) => {
    if (Platform.OS === "ios") {
      Haptics.selectionAsync();
    }
    setSort(value);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]} style={{ flex: 1 }}>
      <ScreenHeader
        showBack
        subtitle="Most watched rallies, matches & clinics"
        title="Trending Matches"
      />

      <View className="pb-3">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
        >
          {VIDEO_SORTS.map((opt) => {
            const isSelected = sort === opt.id;

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                key={opt.id}
                onPress={() => handleSortSelect(opt.id)}
                className={`flex-row items-center gap-1.5 rounded-full px-3.5 py-1.5 active:opacity-80 ${
                  isSelected
                    ? "border border-[#bcdf21]/60 bg-[#bcdf21]/15"
                    : "border border-border/60 bg-surface"
                }`}
              >
                <Ionicons
                  name="swap-vertical-outline"
                  size={12}
                  className={isSelected ? "text-[#005c23] dark:text-[#bcdf21]" : "text-muted"}
                />
                <Text
                  className={`text-xs font-semibold ${
                    isSelected
                      ? "text-[#005c23] dark:text-[#bcdf21]"
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabContentInset }}
      >
        {isLoading ? (
          <View className="items-center py-10">
            <ActivityIndicator color="#bcdf21" />
          </View>
        ) : videos.length > 0 ? (
          videos.map((video) => (
            <View className="px-4" key={video.id}>
              <VideoCard video={video} />
            </View>
          ))
        ) : (
          <View className="mx-4 mt-2 items-center rounded-2xl border border-dashed border-border/80 bg-surface/60 p-8">
            <View className="size-12 items-center justify-center rounded-full bg-surface-secondary">
              <Ionicons name="play-circle-outline" size={22} className="text-muted" />
            </View>
            <Text className="mt-3 text-sm font-bold text-foreground">
              No matches found
            </Text>
            <Text className="mt-1 text-center text-xs text-muted">
              Recorded matches will show up here as they publish.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
