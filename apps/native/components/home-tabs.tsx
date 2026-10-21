import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";

export const HOME_TABS = [
  { id: "all", label: "All" },
  { id: "friends", label: "Friends" },
  { id: "matches", label: "Matches" },
  { id: "highlights", label: "Highlights" },
  { id: "courts", label: "Courts & Parks" },
  { id: "tournaments", label: "Tournaments" },
  { id: "community", label: "Community" },
] as const;

export type HomeTabId = (typeof HOME_TABS)[number]["id"];

interface HomeTabsBarProps {
  activeTab: HomeTabId;
  onSelectTab: (tab: HomeTabId) => void;
}

export function HomeTabsBar({ activeTab, onSelectTab }: HomeTabsBarProps) {
  const handleSelect = (tab: HomeTabId) => {
    if (Platform.OS === "ios") {
      Haptics.selectionAsync();
    }
    onSelectTab(tab);
  };

  return (
    <View className="border-b border-border/40 bg-background px-4 py-3">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {HOME_TABS.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              key={tab.id}
              onPress={() => handleSelect(tab.id)}
              className={`rounded-lg px-3.5 py-1.5 active:opacity-80 ${
                isActive
                  ? "bg-[#005c23] dark:bg-[#bcdf21]"
                  : "border border-border/60 bg-surface"
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  isActive ? "text-white dark:text-black" : "text-foreground"
                }`}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

interface HomeFilterEmptyProps {
  label: string;
  onReset: () => void;
}

export function HomeFilterEmpty({ label, onReset }: HomeFilterEmptyProps) {
  return (
    <View className="mx-4 mt-6 items-center rounded-2xl border border-dashed border-border/80 bg-surface/60 p-8">
      <View className="size-11 items-center justify-center rounded-full bg-surface-secondary">
        <Ionicons name="filter-outline" size={20} className="text-muted" />
      </View>
      <Text className="mt-3 text-center text-sm font-medium text-muted">
        No items found under {label}.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onReset}
        className="mt-4 rounded-lg border border-border px-4 py-2 active:opacity-80"
      >
        <Text className="text-xs font-semibold text-foreground">View All</Text>
      </Pressable>
    </View>
  );
}
