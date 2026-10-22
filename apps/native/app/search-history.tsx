import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/header";
import { useRecentSearches } from "@/lib/hooks";

export default function SearchHistoryScreen() {
  const router = useRouter();
  const { clearRecentSearches, removeRecentSearch, searches } =
    useRecentSearches();

  const openSearch = (query: string) => {
    router.navigate({
      params: { q: query },
      pathname: "/search",
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]} style={{ flex: 1 }}>
      <ScreenHeader
        showBack
        subtitle="Pick up where you left off"
        title="Recent Searches"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View className="flex-row items-center justify-between px-4 py-3">
          <Text className="text-[11px] font-bold uppercase tracking-wider text-muted">
            {searches.length} saved
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={searches.length === 0}
            hitSlop={8}
            onPress={() => void clearRecentSearches()}
            className="active:opacity-70"
          >
            <Text
              className={`text-xs font-semibold ${
                searches.length > 0
                  ? "text-[#005c23] dark:text-[#bcdf21]"
                  : "text-muted"
              }`}
            >
              Clear all
            </Text>
          </Pressable>
        </View>

        {searches.length > 0 ? (
          searches.map((query) => (
            <View
              className="mx-4 mb-2 flex-row items-center gap-3 rounded-2xl border border-border/50 bg-surface px-3.5 py-3"
              key={query}
            >
              <Pressable
                accessibilityRole="button"
                className="flex-1 flex-row items-center gap-3"
                onPress={() => openSearch(query)}
              >
                <Ionicons name="time-outline" size={17} className="text-muted" />
                <Text className="flex-1 text-sm text-foreground" numberOfLines={1}>
                  {query}
                </Text>
              </Pressable>
              <Pressable
                accessibilityLabel={`Remove ${query} from history`}
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => void removeRecentSearch(query)}
                className="p-1 active:opacity-70"
              >
                <Ionicons name="close" size={15} className="text-muted" />
              </Pressable>
            </View>
          ))
        ) : (
          <View className="mx-4 mt-2 items-center rounded-2xl border border-dashed border-border/80 bg-surface/60 p-8">
            <View className="size-12 items-center justify-center rounded-full bg-surface-secondary">
              <Ionicons name="time-outline" size={22} className="text-muted" />
            </View>
            <Text className="mt-3 text-sm font-bold text-foreground">
              Nothing here yet
            </Text>
            <Text className="mt-1 text-center text-xs text-muted">
              Searches you run are saved here so you can jump back in.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
