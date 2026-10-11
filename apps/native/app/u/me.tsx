import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EventCard, VideoCard } from "@/components/cards";
import { authClient } from "@/lib/auth-client";
import { demoEvents, demoVideos } from "@/lib/demo-data";
import { useProfile } from "@/lib/hooks";

export default function PlayerDashboardScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { data: profileData } = useProfile();

  const profile = profileData?.profile;
  const userName = session?.user?.name || profile?.name || "Cameron Stewart";
  const userInitial = userName.charAt(0).toUpperCase();

  const quickActionPress = (path: string) => {
    if (Platform.OS === "ios") {
      Haptics.selectionAsync();
    }
    router.push(path as never);
  };

  return (
    <SafeAreaView edges={["bottom"]} className="flex-1 bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        {/* Player Header */}
        <View className="mb-5 rounded-3xl border border-border/60 bg-surface p-5 shadow-xs">
          <View className="flex-row items-center gap-4">
            <View className="size-16 items-center justify-center rounded-full bg-[#005c23]">
              <Text className="text-2xl font-black text-[#bcdf21]">
                {userInitial}
              </Text>
            </View>

            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="text-xl font-bold text-foreground">
                  {userName}
                </Text>
                <View className="rounded-md border border-[#bcdf21]/30 bg-[#bcdf21]/15 px-2 py-0.5">
                  <Text className="text-[10px] font-bold text-[#005c23] dark:text-[#bcdf21]">
                    {profile?.skillLevel || "4.5 Tournament"}
                  </Text>
                </View>
              </View>

              <Text className="text-xs text-muted">
                {profile?.homeCourtName || "Little Rock Athletic Club"} • {profile?.homeCity || "Little Rock"}, {profile?.homeState || "AR"}
              </Text>
            </View>
          </View>
        </View>

        {/* Player Stats Grid */}
        <View className="mb-6 flex-row gap-2.5">
          <View className="flex-1 rounded-2xl border border-border/50 bg-surface p-3.5">
            <Text className="text-xs text-muted">Recorded</Text>
            <Text className="mt-1 text-2xl font-black text-foreground">48</Text>
            <Text className="mt-0.5 text-[10px] font-medium text-[#bcdf21]">matches</Text>
          </View>

          <View className="flex-1 rounded-2xl border border-border/50 bg-surface p-3.5">
            <Text className="text-xs text-muted">Win Rate</Text>
            <Text className="mt-1 text-2xl font-black text-[#005c23] dark:text-[#bcdf21]">72%</Text>
            <Text className="mt-0.5 text-[10px] font-medium text-muted">competitive</Text>
          </View>

          <View className="flex-1 rounded-2xl border border-border/50 bg-surface p-3.5">
            <Text className="text-xs text-muted">Tourneys</Text>
            <Text className="mt-1 text-2xl font-black text-foreground">6</Text>
            <Text className="mt-0.5 text-[10px] font-medium text-muted">brackets</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text className="mb-2.5 text-xs font-bold uppercase tracking-wider text-muted">
          Quick Actions
        </Text>

        <View className="mb-6 flex-row flex-wrap gap-2.5">
          <Pressable
            onPress={() => quickActionPress("/casters")}
            className="flex-1 min-w-[140px] flex-row items-center gap-2.5 rounded-2xl border border-[#bcdf21]/40 bg-[#005c23]/15 p-3.5 active:opacity-80"
          >
            <Ionicons name="videocam" size={20} color="#bcdf21" />
            <View>
              <Text className="text-xs font-bold text-foreground">Book Caster</Text>
              <Text className="text-[10px] text-muted">Record next match</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => quickActionPress("/trending")}
            className="flex-1 min-w-[140px] flex-row items-center gap-2.5 rounded-2xl border border-border/60 bg-surface p-3.5 active:opacity-80"
          >
            <Ionicons name="location-outline" size={20} color="#bcdf21" />
            <View>
              <Text className="text-xs font-bold text-foreground">Find Courts</Text>
              <Text className="text-[10px] text-muted">Check park heat</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => quickActionPress("/events")}
            className="flex-1 min-w-[140px] flex-row items-center gap-2.5 rounded-2xl border border-border/60 bg-surface p-3.5 active:opacity-80"
          >
            <Ionicons name="trophy-outline" size={20} color="#bcdf21" />
            <View>
              <Text className="text-xs font-bold text-foreground">Tournaments</Text>
              <Text className="text-[10px] text-muted">View upcoming</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => quickActionPress("/players")}
            className="flex-1 min-w-[140px] flex-row items-center gap-2.5 rounded-2xl border border-border/60 bg-surface p-3.5 active:opacity-80"
          >
            <Ionicons name="people-outline" size={20} color="#bcdf21" />
            <View>
              <Text className="text-xs font-bold text-foreground">Find Players</Text>
              <Text className="text-[10px] text-muted">Challenge local</Text>
            </View>
          </Pressable>
        </View>

        {/* Registered Events */}
        <View className="mb-6">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-base font-bold text-foreground">
              Your Registered Events
            </Text>
            <Pressable onPress={() => router.push("/events")}>
              <Text className="text-xs font-semibold text-[#005c23] dark:text-[#bcdf21]">
                Browse All
              </Text>
            </Pressable>
          </View>

          {demoEvents.slice(0, 1).map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </View>

        {/* Your Recorded Matches & Clips */}
        <View className="mb-6">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-base font-bold text-foreground">
              Your Recorded Matches
            </Text>
            <Text className="text-xs text-muted">Saved to your profile</Text>
          </View>

          {demoVideos.slice(0, 2).map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
