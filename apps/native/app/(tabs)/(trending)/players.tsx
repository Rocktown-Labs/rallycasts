import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PlayerCard } from "@/components/cards";
import { ScreenHeader } from "@/components/header";
import { usePlayers } from "@/lib/hooks";
import { useTabContentInset } from "@/lib/tab-bar-inset";

const SKILL_FILTERS = ["All", "3.5 Rec", "4.0 Doubles", "4.5 Tournament", "5.0 Pro"];

export default function PlayersScreen() {
  const tabContentInset = useTabContentInset();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  const { data: playersData, isLoading } = usePlayers(searchQuery);

  const handleFilterSelect = (filter: string) => {
    if (Platform.OS === "ios") {
      Haptics.selectionAsync();
    }
    setActiveFilter(filter);
  };

  const allPlayers = playersData?.players || [];
  const filteredPlayers = allPlayers.filter((player) => {
    if (activeFilter === "All") {
      return true;
    }
    return player.skillLevel?.toLowerCase().includes(activeFilter.toLowerCase().slice(0, 3));
  });

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background">
      <ScreenHeader
        title="Players"
        subtitle="Connect, challenge & find court partners"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabContentInset }}
      >
        {/* Search Bar */}
        <View className="p-4 pb-2">
          <View className="flex-row items-center rounded-2xl border border-border/60 bg-surface px-3.5 py-2.5">
            <Ionicons name="search-outline" size={18} className="text-muted" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search players by name, handle, city..."
              placeholderTextColor="#888888"
              className="ml-2 flex-1 text-sm text-foreground"
            />
            {searchQuery.length > 0 ? (
              <Pressable
                onPress={() => setSearchQuery("")}
                hitSlop={8}
                className="p-1"
              >
                <Ionicons name="close-circle" size={16} className="text-muted" />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Skill rating filter chips */}
        <View className="pb-3">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          >
            {SKILL_FILTERS.map((filter) => {
              const isSelected = activeFilter === filter;
              return (
                <Pressable
                  key={filter}
                  onPress={() => handleFilterSelect(filter)}
                  className={`rounded-full px-3.5 py-1.5 active:opacity-80 ${
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
                    {filter}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Players List */}
        <View className="px-4">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-sm font-bold text-foreground">
              {filteredPlayers.length} Players Found
            </Text>
          </View>

          {filteredPlayers.map((player) => (
            <PlayerCard key={player.id} player={player} />
          ))}

          {filteredPlayers.length === 0 ? (
            <View className="items-center py-12">
              <Ionicons name="people-outline" size={40} className="text-muted" />
              <Text className="mt-3 text-base font-bold text-foreground">
                No players match your search
              </Text>
              <Text className="mt-1 text-xs text-muted">
                Try searching for another name or clearing the skill filter.
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
