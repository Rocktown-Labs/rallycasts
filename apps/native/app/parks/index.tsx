import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams } from "expo-router";
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

import { ParkCard } from "@/components/cards";
import { ScreenHeader } from "@/components/header";
import { PARK_SORTS, RADIUS_OPTIONS, type ParkSort } from "@/lib/discovery";
import { useTrending } from "@/lib/hooks";

export default function ParksScreen() {
  const { radius } = useLocalSearchParams<{ radius?: string }>();
  const initialRadius = Number(radius ?? 15);
  const [selectedRadius, setSelectedRadius] = useState<number>(
    Number.isFinite(initialRadius) ? initialRadius : 15
  );
  const [sort, setSort] = useState<ParkSort>("heat");
  const { data, isLoading } = useTrending(
    selectedRadius === 0 ? undefined : selectedRadius
  );

  const venues = useMemo(() => {
    const list = data?.venues ?? [];

    return [...list].sort((a, b) => {
      if (sort === "players") {
        return (b.activePlayers ?? 0) - (a.activePlayers ?? 0);
      }
      if (sort === "distance") {
        const aDistance = a.distanceMiles ?? Number.MAX_SAFE_INTEGER;
        const bDistance = b.distanceMiles ?? Number.MAX_SAFE_INTEGER;
        return aDistance - bDistance;
      }
      return (b.heatScore ?? 0) - (a.heatScore ?? 0);
    });
  }, [data?.venues, sort]);

  const handleFilterSelect = (value: number) => {
    if (Platform.OS === "ios") {
      Haptics.selectionAsync();
    }
    setSelectedRadius(value);
  };

  const handleSortSelect = (value: ParkSort) => {
    if (Platform.OS === "ios") {
      Haptics.selectionAsync();
    }
    setSort(value);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]} style={{ flex: 1 }}>
      <ScreenHeader
        showBack
        subtitle="Courts with active heat near you"
        title="Parks & Courts"
      />

      <View className="py-3">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
        >
          {RADIUS_OPTIONS.map((opt) => {
            const isSelected = selectedRadius === opt.value;

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                key={opt.value}
                onPress={() => handleFilterSelect(opt.value)}
                className={`rounded-full px-4 py-1.5 active:opacity-80 ${
                  isSelected
                    ? "bg-[#005c23] dark:bg-[#bcdf21]"
                    : "border border-border/60 bg-surface"
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    isSelected ? "text-white dark:text-black" : "text-foreground"
                  }`}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View className="pb-3">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
        >
          {PARK_SORTS.map((opt) => {
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
        contentContainerStyle={{ paddingBottom: 36 }}
      >
        {isLoading ? (
          <View className="items-center py-10">
            <ActivityIndicator color="#bcdf21" />
          </View>
        ) : venues.length > 0 ? (
          venues.map((venue) => (
            <View className="px-4" key={venue.id}>
              <ParkCard venue={venue} />
            </View>
          ))
        ) : (
          <View className="mx-4 mt-2 items-center rounded-2xl border border-dashed border-border/80 bg-surface/60 p-8">
            <View className="size-12 items-center justify-center rounded-full bg-surface-secondary">
              <Ionicons name="location-outline" size={22} className="text-muted" />
            </View>
            <Text className="mt-3 text-sm font-bold text-foreground">
              No courts found
            </Text>
            <Text className="mt-1 text-center text-xs text-muted">
              Try widening the radius or a different area.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
