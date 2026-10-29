import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";

import { apiClient } from "@/lib/api-client";
import { readApiJson } from "@/lib/api";
import type { VenueData } from "@/lib/demo-data";

export default function VenueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: venue, isLoading, error } = useQuery({
    queryKey: ["venue", id],
    enabled: Boolean(id),
    queryFn: async ({ signal }): Promise<VenueData> => {
      const data = await readApiJson<{ venue: VenueData }>(
        apiClient.api.v1.venues[":id"].$get({ param: { id: id ?? "" } }, { init: { signal } })
      );
      if (!data?.venue) {
        throw new Error("Venue not found");
      }
      return data.venue;
    },
  });

  if (isLoading) {
    return <SafeAreaView className="bg-background flex-1 items-center justify-center"><Text className="text-muted">Loading venue…</Text></SafeAreaView>;
  }

  if (!venue || error) {
    return (
      <SafeAreaView
        edges={["bottom"]}
        className="bg-background flex-1 items-center justify-center px-6"
      >
        <Ionicons name="location-outline" size={42} color="#8892a0" />
        <Text className="text-foreground mt-3 text-lg font-bold">
          Venue not found
        </Text>
        <Text className="text-muted mt-1 text-center text-sm">
          This venue is unavailable. Check your connection and try again.
        </Text>
      </SafeAreaView>
    );
  }

  let statusLabel = "Unknown";
  if (venue.openNow != null) {
    statusLabel = venue.openNow ? "Open" : "Closed";
  }
  const heatScore = venue.heatScore ?? 0;
  const heatWidthPercent = `${Math.min(Math.max(heatScore, 0), 100)}%`;

  const handleCheckIn = () => {
    if (Platform.OS === "ios") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    void WebBrowser.openBrowserAsync(
      `https://rallycasts.com/venues/${encodeURIComponent(id || venue.id)}`
    );
  };

  return (
    <SafeAreaView edges={["bottom"]} className="flex-1 bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Cover Photo */}
        <View className="relative h-48 w-full bg-surface-secondary">
          {venue.photoUrl ? (
            <Image
              source={{ uri: venue.photoUrl }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />
          ) : (
            <View className="size-full items-center justify-center bg-gradient-to-r from-emerald-950 to-slate-900">
              <Ionicons name="tennisball" size={40} color="#bcdf21" />
            </View>
          )}

          {venue.isHomeCourt ? (
            <View className="absolute top-3 left-3 flex-row items-center gap-1 rounded-full border border-[#bcdf21]/50 bg-black/80 px-2.5 py-1">
              <Ionicons name="star" size={12} color="#bcdf21" />
              <Text className="text-[11px] font-bold text-[#bcdf21]">Home Court</Text>
            </View>
          ) : null}
        </View>

        <View className="p-4">
          <Text className="text-2xl font-black tracking-tight text-foreground">
            {venue.name}
          </Text>

          <View className="mt-1.5 flex-row items-center gap-1.5">
            <Ionicons name="location-outline" size={15} className="text-muted" />
            <Text className="text-xs text-muted">
              {[venue.addressLine1, venue.city, venue.state].filter(Boolean).join(", ")}
            </Text>
          </View>

          {/* Heat Status Bar */}
          <View className="my-5 rounded-2xl border border-border/60 bg-surface p-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="flame" size={18} color="#bcdf21" />
                <Text className="text-sm font-bold text-foreground">
                  Court Heat Score: {venue.heatScore == null ? "Unavailable" : `${heatScore}%`}
                </Text>
              </View>
              <Text className="text-xs font-semibold text-[#005c23] dark:text-[#bcdf21]">
                {venue.activePlayers == null ? "Activity unavailable" : `${venue.activePlayers} Playing Now`}
              </Text>
            </View>

            <View className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-secondary">
              <View
                style={{ width: heatWidthPercent as `${number}%` }}
                className="h-full rounded-full bg-[#bcdf21]"
              />
            </View>

            <Text className="mt-2 text-[11px] text-muted">
              Activity reflects reported court data when available.
            </Text>
          </View>

          {/* Court Metrics */}
          <View className="mb-5 flex-row gap-2.5">
            <View className="flex-1 rounded-2xl border border-border/50 bg-surface p-3.5">
              <Text className="text-xs text-muted">Courts</Text>
              <Text className="mt-1 text-xl font-bold text-foreground">
                {venue.courtCount ?? "Unknown"}
              </Text>
              <Text className="mt-0.5 text-[10px] text-muted">dedicated</Text>
            </View>

            <View className="flex-1 rounded-2xl border border-border/50 bg-surface p-3.5">
              <Text className="text-xs text-muted">Status</Text>
              <Text className="mt-1 text-xl font-bold text-foreground">
                {statusLabel}
              </Text>
              <Text className="mt-0.5 text-[10px] text-muted">current hours</Text>
            </View>

            <View className="flex-1 rounded-2xl border border-border/50 bg-surface p-3.5">
              <Text className="text-xs text-muted">Rating</Text>
              <Text className="mt-1 text-xl font-bold text-[#005c23] dark:text-[#bcdf21]">
                {venue.rating == null ? "Unrated" : `${venue.rating}★`}
              </Text>
              <Text className="mt-0.5 text-[10px] text-muted">reviews</Text>
            </View>
          </View>

          {/* Check In Action */}
          <Pressable
            onPress={handleCheckIn}
            className="w-full flex-row items-center justify-center gap-2 rounded-2xl bg-[#005c23] py-3.5 active:opacity-90"
          >
            <Ionicons name="location" size={18} color="#ffffff" />
            <Text className="text-sm font-bold text-white">
              Open Venue & Check In
            </Text>
          </Pressable>


        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
