import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EventCard } from "@/components/cards";
import { ScreenHeader } from "@/components/header";
import { useEvents } from "@/lib/hooks";

const CATEGORY_FILTERS = ["All Events", "Tournaments", "Open Play", "Major"];

export default function EventsScreen() {
  const [activeCategory, setActiveCategory] = useState("All Events");
  const { data: eventsData, isLoading } = useEvents();

  const handleCategorySelect = (category: string) => {
    if (Platform.OS === "ios") {
      Haptics.selectionAsync();
    }
    setActiveCategory(category);
  };

  const allEvents = eventsData?.events || [];
  const filteredEvents = allEvents.filter((event) => {
    if (activeCategory === "All Events") {
      return true;
    }
    return (
      event.category?.toLowerCase() === activeCategory.toLowerCase() ||
      event.eventType?.toLowerCase().includes(activeCategory.toLowerCase())
    );
  });

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background">
      <ScreenHeader
        title="Events"
        subtitle="Tournaments, round robins & open plays"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 36 }}
      >
        {/* Category filters */}
        <View className="py-3">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          >
            {CATEGORY_FILTERS.map((cat) => {
              const isSelected = activeCategory === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => handleCategorySelect(cat)}
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
                    {cat}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Featured Banner */}
        <View className="p-4 pt-1">
          <View className="rounded-2xl border border-[#bcdf21]/30 bg-gradient-to-br from-[#005c23]/25 to-[#bcdf21]/10 p-4">
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="trophy" size={16} color="#bcdf21" />
              <Text className="text-xs font-bold text-[#005c23] dark:text-[#bcdf21]">
                Official Brackets & Live Streaming
              </Text>
            </View>
            <Text className="mt-1 text-sm font-bold text-foreground">
              All tournaments on RallyCasts feature live digital brackets and on-demand caster coverage.
            </Text>
          </View>
        </View>

        {/* Events List */}
        <View className="px-4">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-sm font-bold text-foreground">
              {filteredEvents.length} Upcoming Events
            </Text>
          </View>

          {filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}

          {filteredEvents.length === 0 ? (
            <View className="items-center py-12">
              <Ionicons name="calendar-outline" size={40} className="text-muted" />
              <Text className="mt-3 text-base font-bold text-foreground">
                No events in this category yet
              </Text>
              <Text className="mt-1 text-xs text-muted">
                Check back soon or choose another filter.
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
