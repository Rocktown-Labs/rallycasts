import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Alert, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";

import { useEvent, useJoinEvent } from "@/lib/hooks";

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: event } = useEvent(id || "");
  const joinEvent = useJoinEvent(id || "");
  const [isRegistered, setIsRegistered] = useState(false);

  const handleRegister = () => {
    if (Platform.OS === "ios") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    joinEvent.mutate(undefined, {
      onError: (error) => {
        const message =
          error instanceof Error ? error.message : "Try again in a moment.";
        if (message.toLowerCase().includes("paid events")) {
          void WebBrowser.openBrowserAsync(
            `https://rallycasts.com/events/${id}`
          );
          return;
        }
        Alert.alert("Registration not completed", message);
      },
      onSuccess: () => {
        setIsRegistered(true);
        Alert.alert(
          "Registration Confirmed!",
          `You are registered for ${event?.name || "Tournament"}. Your bracket spot is saved.`
        );
      },
    });
  };

  if (!event) {
    return (
      <SafeAreaView edges={["bottom"]} className="flex-1 items-center justify-center bg-background">
        <Text className="text-sm text-muted">Loading tournament details...</Text>
      </SafeAreaView>
    );
  }

  const spotsLeft = (event.capacity ?? 32) - (event.registeredCount ?? 0) - (isRegistered ? 1 : 0);

  return (
    <SafeAreaView edges={["bottom"]} className="flex-1 bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Cover image */}
        {event.imageUrl ? (
          <View className="relative h-44 w-full bg-surface-secondary">
            <Image
              source={{ uri: event.imageUrl }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />
            <View className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <View className="absolute bottom-3 left-4">
              <View className="self-start rounded-md bg-[#005c23] px-2 py-0.5">
                <Text className="text-[10px] font-bold text-white">
                  {event.category || "Tournament"}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        <View className="p-4">
          <Text className="text-2xl font-black tracking-tight text-foreground">
            {event.name}
          </Text>

          <View className="mt-2.5 flex-row items-center gap-1.5">
            <Ionicons name="calendar-outline" size={16} color="#bcdf21" />
            <Text className="text-sm font-semibold text-[#005c23] dark:text-[#bcdf21]">
              {event.dateLabel || "Saturday, 9:00 AM"}
            </Text>
          </View>

          <View className="mt-1.5 flex-row items-center gap-1.5">
            <Ionicons name="location-outline" size={16} className="text-muted" />
            <Text className="text-xs text-muted">
              {event.location || event.venueName || "Local Courts"}
            </Text>
          </View>

          {/* Tournament Overview Grid */}
          <View className="my-5 flex-row gap-2.5">
            <View className="flex-1 rounded-2xl border border-border/50 bg-surface p-3.5">
              <Text className="text-xs text-muted">Format</Text>
              <Text className="mt-1 text-sm font-bold text-foreground">
                {event.eventType || "Doubles"}
              </Text>
            </View>

            <View className="flex-1 rounded-2xl border border-border/50 bg-surface p-3.5">
              <Text className="text-xs text-muted">Spots</Text>
              <Text className="mt-1 text-sm font-bold text-foreground">
                {spotsLeft} left
              </Text>
            </View>

            <View className="flex-1 rounded-2xl border border-border/50 bg-surface p-3.5">
              <Text className="text-xs text-muted">Entry Fee</Text>
              <Text className="mt-1 text-sm font-bold text-[#005c23] dark:text-[#bcdf21]">
                ${event.priceCents ? (event.priceCents / 100).toFixed(0) : "45"}
              </Text>
            </View>
          </View>

          {/* Register Action */}
          <Pressable
            onPress={handleRegister}
            disabled={isRegistered}
            className={`w-full flex-row items-center justify-center gap-2 rounded-2xl py-3.5 active:opacity-90 ${
              isRegistered
                ? "bg-surface-secondary border border-border"
                : "bg-[#005c23]"
            }`}
          >
            <Ionicons
              name={isRegistered ? "checkmark-circle" : "trophy"}
              size={18}
              color={isRegistered ? "#10b981" : "#ffffff"}
            />
            <Text
              className={`text-sm font-bold ${
                isRegistered ? "text-emerald-500" : "text-white"
              }`}
            >
              {isRegistered ? "You're Registered!" : "Register for Tournament"}
            </Text>
          </Pressable>

          {/* Digital Bracket Preview */}
          <View className="mt-6 rounded-2xl border border-border/60 bg-surface p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-bold text-foreground">
                Digital Bracket Status
              </Text>
              <View className="rounded-md bg-emerald-500/15 px-2 py-0.5">
                <Text className="text-[10px] font-bold text-emerald-500">
                  Live Updates
                </Text>
              </View>
            </View>

            <Text className="mt-2 text-xs leading-relaxed text-muted">
              Seeds and court assignments will lock 1 hour before start time. Matches feature real-time scorekeeping and automated video recording.
            </Text>

            <View className="mt-4 gap-2 border-t border-border/40 pt-3">
              <View className="flex-row items-center justify-between rounded-xl bg-surface-secondary p-3">
                <Text className="text-xs font-semibold text-foreground">Round 1 (Upper)</Text>
                <Text className="text-xs text-muted">16 matches</Text>
              </View>
              <View className="flex-row items-center justify-between rounded-xl bg-surface-secondary p-3">
                <Text className="text-xs font-semibold text-foreground">Quarterfinals</Text>
                <Text className="text-xs text-muted">Court 1 & 2</Text>
              </View>
              <View className="flex-row items-center justify-between rounded-xl bg-surface-secondary p-3">
                <Text className="text-xs font-semibold text-foreground">Championship Final</Text>
                <Text className="text-xs font-bold text-[#bcdf21]">4K Caster Broadcast</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
