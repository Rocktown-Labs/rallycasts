import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EventCard } from "@/components/cards";
import { useOrganizerData } from "@/lib/hooks";

export default function OrganizerDashboardScreen() {
  const router = useRouter();
  const { data: organizerData } = useOrganizerData();

  const analytics = organizerData?.analytics || {
    activeTournaments: 3,
    playerCount: 184,
    totalRevenueCents: 560000,
    viewsCount: 15800,
  };

  const organizations = organizerData?.organizations || [];
  const events = organizerData?.events || [];

  const handleAction = (label: string) => {
    if (Platform.OS === "ios") {
      Haptics.selectionAsync();
    }
    Alert.alert(label, `${label} workflow initiated.`);
  };

  return (
    <SafeAreaView edges={["bottom"]} className="flex-1 bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        {/* Banner */}
        <View className="mb-5 overflow-hidden rounded-3xl bg-[#005c23] p-5 shadow-xs">
          <View className="flex-row items-center gap-1.5 self-start rounded-full bg-[#bcdf21]/20 px-2.5 py-1">
            <Ionicons name="shield-checkmark" size={13} color="#bcdf21" />
            <Text className="text-[11px] font-bold text-[#bcdf21]">
              Tournament Host & Club Director
            </Text>
          </View>

          <Text className="mt-3 text-xl font-black text-white">
            Rocky Mountain Pickleball
          </Text>
          <Text className="mt-1 text-xs text-gray-200">
            Denver, CO • 184 registered club players
          </Text>
        </View>

        {/* Analytics Grid */}
        <Text className="mb-2.5 text-xs font-bold uppercase tracking-wider text-muted">
          Tournament Metrics
        </Text>

        <View className="mb-5 flex-row flex-wrap gap-2.5">
          <View className="flex-1 min-w-[140px] rounded-2xl border border-border/50 bg-surface p-3.5">
            <Text className="text-xs text-muted">Active Events</Text>
            <Text className="mt-1 text-2xl font-black text-foreground">
              {analytics.activeTournaments}
            </Text>
            <Text className="mt-0.5 text-[10px] text-emerald-500">Live brackets</Text>
          </View>

          <View className="flex-1 min-w-[140px] rounded-2xl border border-border/50 bg-surface p-3.5">
            <Text className="text-xs text-muted">Players</Text>
            <Text className="mt-1 text-2xl font-black text-foreground">
              {analytics.playerCount}
            </Text>
            <Text className="mt-0.5 text-[10px] text-muted">across brackets</Text>
          </View>

          <View className="flex-1 min-w-[140px] rounded-2xl border border-border/50 bg-surface p-3.5">
            <Text className="text-xs text-muted">Entry Fees</Text>
            <Text className="mt-1 text-2xl font-black text-[#005c23] dark:text-[#bcdf21]">
              ${(analytics.totalRevenueCents / 100).toLocaleString()}
            </Text>
            <Text className="mt-0.5 text-[10px] text-muted">collected</Text>
          </View>

          <View className="flex-1 min-w-[140px] rounded-2xl border border-border/50 bg-surface p-3.5">
            <Text className="text-xs text-muted">Match Views</Text>
            <Text className="mt-1 text-2xl font-black text-foreground">
              {(analytics.viewsCount / 1000).toFixed(1)}k
            </Text>
            <Text className="mt-0.5 text-[10px] text-muted">streamed</Text>
          </View>
        </View>

        {/* Quick Organizer Actions */}
        <Text className="mb-2.5 text-xs font-bold uppercase tracking-wider text-muted">
          Organizer Actions
        </Text>

        <View className="mb-6 flex-row flex-wrap gap-2.5">
          <Pressable
            onPress={() => handleAction("Host a Tournament")}
            className="flex-1 min-w-[140px] flex-row items-center gap-2.5 rounded-2xl border border-[#bcdf21]/40 bg-[#005c23]/15 p-3.5 active:opacity-80"
          >
            <Ionicons name="add-circle" size={20} color="#bcdf21" />
            <View>
              <Text className="text-xs font-bold text-foreground">Host Tournament</Text>
              <Text className="text-[10px] text-muted">Create new bracket</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => handleAction("Manage Brackets")}
            className="flex-1 min-w-[140px] flex-row items-center gap-2.5 rounded-2xl border border-border/60 bg-surface p-3.5 active:opacity-80"
          >
            <Ionicons name="git-network-outline" size={20} color="#bcdf21" />
            <View>
              <Text className="text-xs font-bold text-foreground">Manage Brackets</Text>
              <Text className="text-[10px] text-muted">Seed & scores</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => handleAction("Set Up Payouts")}
            className="flex-1 min-w-[140px] flex-row items-center gap-2.5 rounded-2xl border border-border/60 bg-surface p-3.5 active:opacity-80"
          >
            <Ionicons name="card-outline" size={20} color="#bcdf21" />
            <View>
              <Text className="text-xs font-bold text-foreground">Payouts</Text>
              <Text className="text-[10px] text-muted">Stripe connect</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => handleAction("Invite Teammate")}
            className="flex-1 min-w-[140px] flex-row items-center gap-2.5 rounded-2xl border border-border/60 bg-surface p-3.5 active:opacity-80"
          >
            <Ionicons name="person-add-outline" size={20} color="#bcdf21" />
            <View>
              <Text className="text-xs font-bold text-foreground">Invite Teammate</Text>
              <Text className="text-[10px] text-muted">Add co-director</Text>
            </View>
          </Pressable>
        </View>

        {/* Managed Tournaments */}
        <View className="mb-6">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-base font-bold text-foreground">
              Hosted Tournaments
            </Text>
            <Pressable onPress={() => router.push("/events")}>
              <Text className="text-xs font-semibold text-[#005c23] dark:text-[#bcdf21]">
                View All
              </Text>
            </Pressable>
          </View>

          {events.slice(0, 2).map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </View>

        {/* Organizations */}
        <View className="mb-6">
          <Text className="mb-3 text-base font-bold text-foreground">
            Your Organizations
          </Text>

          {organizations.map((org) => (
            <View
              key={org.id}
              className="mb-3 rounded-2xl border border-border/60 bg-surface p-4 shadow-xs"
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-bold text-foreground">
                  {org.name}
                </Text>
                <View className="rounded-md bg-surface-secondary px-2 py-0.5">
                  <Text className="text-[10px] font-semibold text-muted">
                    Active Club
                  </Text>
                </View>
              </View>
              {org.description ? (
                <Text className="mt-1 text-xs leading-relaxed text-muted">
                  {org.description}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
