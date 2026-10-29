import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";

import { EventCard, VideoCard } from "@/components/cards";
import { ScreenHeader } from "@/components/header";
import { ThemeToggle } from "@/components/theme-toggle";
import { authClient } from "@/lib/auth-client";
import { demoEvents, demoVideos } from "@/lib/demo-data";
import { demoDataEnabled } from "@/lib/demo-mode";
import { useOrganizerData, useProfile } from "@/lib/hooks";

type HubMode = "player" | "organizer";

export default function YouScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { data: profileData } = useProfile();
  const { data: organizerData } = useOrganizerData();

  const [mode, setMode] = useState<HubMode>("player");

  const profile = profileData?.profile;
  const userName = session?.user?.name || profile?.name || "Cameron Stewart";
  const userEmail = session?.user?.email || "cameron@rallycasts.com";
  const userInitial = userName.charAt(0).toUpperCase();

  const analytics = organizerData?.analytics ?? {
    activeTournaments: 0,
    checkedIn: 0,
    playerCount: 0,
    totalRevenueCents: 0,
  };
  const hostedEvents =
    organizerData?.events ?? (demoDataEnabled ? demoEvents : []);
  const organizations = organizerData?.organizations ?? [];

  const handleSwitchMode = (nextMode: HubMode) => {
    if (Platform.OS === "ios") {
      Haptics.selectionAsync();
    }
    setMode(nextMode);
  };

  const handleSignOut = async () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await authClient.signOut();
  };

  const navigateTo = (path: string) => {
    if (Platform.OS === "ios") {
      Haptics.selectionAsync();
    }
    router.push(path as never);
  };

  const openOrganizerTool = (path: string) => {
    if (Platform.OS === "ios") {
      Haptics.selectionAsync();
    }
    void WebBrowser.openBrowserAsync(`https://rallycasts.com${path}`);
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background">
      <ScreenHeader
        title="You"
        subtitle={
          session?.user
            ? mode === "player"
              ? "Player Hub & Matches"
              : "Organizer Suite & Brackets"
            : "Account & Community"
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        {session?.user ? (
          <View className="p-4">
            {/* User Profile Card */}
            <View className="mb-4 rounded-3xl border border-border/60 bg-surface p-5 shadow-xs">
              <View className="flex-row items-center gap-4">
                <View className="size-16 items-center justify-center rounded-full bg-[#005c23] shadow-xs">
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
                    {profile?.homeCourtName || "Little Rock Athletic Club"} •{" "}
                    {profile?.homeCity || "Little Rock"},{" "}
                    {profile?.homeState || "AR"}
                  </Text>

                  <View className="mt-2 flex-row flex-wrap items-center gap-2">
                    <View className="rounded-md bg-surface-secondary px-2 py-0.5">
                      <Text className="text-[10px] font-semibold text-muted">
                        {userEmail}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => navigateTo("/account")}
                      className="flex-row items-center gap-1 rounded-md border border-border/60 bg-surface px-2 py-0.5 active:bg-surface-secondary"
                    >
                      <Ionicons name="settings-outline" size={11} className="text-muted" />
                      <Text className="text-[10px] font-medium text-muted">Settings</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>

            {/* Segmented Mode Switcher */}
            <View className="mb-5 flex-row rounded-2xl border border-border/60 bg-surface p-1">
              <Pressable
                onPress={() => handleSwitchMode("player")}
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === "player" }}
                accessibilityLabel="Player Mode"
                className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl py-2.5 ${
                  mode === "player"
                    ? "bg-[#005c23] shadow-xs"
                    : "bg-transparent active:bg-surface-secondary/50"
                }`}
              >
                <Ionicons
                  name="tennisball"
                  size={16}
                  color={mode === "player" ? "#bcdf21" : "#888"}
                />
                <Text
                  className={`text-xs font-bold ${
                    mode === "player" ? "text-white" : "text-muted"
                  }`}
                >
                  Player Hub
                </Text>
              </Pressable>

              <Pressable
                onPress={() => handleSwitchMode("organizer")}
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === "organizer" }}
                accessibilityLabel="Organizer Mode"
                className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl py-2.5 ${
                  mode === "organizer"
                    ? "bg-[#005c23] shadow-xs"
                    : "bg-transparent active:bg-surface-secondary/50"
                }`}
              >
                <Ionicons
                  name="trophy"
                  size={16}
                  color={mode === "organizer" ? "#bcdf21" : "#888"}
                />
                <Text
                  className={`text-xs font-bold ${
                    mode === "organizer" ? "text-white" : "text-muted"
                  }`}
                >
                  Organizer Suite
                </Text>
              </Pressable>
            </View>

            {/* Content Area Based on Mode */}
            {mode === "player" ? (
              <>
                {/* Player Performance Stats */}
                <Text className="mb-2.5 text-xs font-bold uppercase tracking-wider text-muted">
                  Match Records & Rating
                </Text>

                <View className="mb-5 flex-row gap-2.5">
                  <View className="flex-1 rounded-2xl border border-border/50 bg-surface p-3.5">
                    <Text className="text-xs text-muted">Matches</Text>
                    <Text className="mt-1 text-2xl font-black text-foreground">
                      48
                    </Text>
                    <Text className="mt-0.5 text-[10px] font-medium text-[#bcdf21]">
                      recorded
                    </Text>
                  </View>

                  <View className="flex-1 rounded-2xl border border-border/50 bg-surface p-3.5">
                    <Text className="text-xs text-muted">Win Rate</Text>
                    <Text className="mt-1 text-2xl font-black text-[#005c23] dark:text-[#bcdf21]">
                      72%
                    </Text>
                    <Text className="mt-0.5 text-[10px] font-medium text-muted">
                      competitive
                    </Text>
                  </View>

                  <View className="flex-1 rounded-2xl border border-border/50 bg-surface p-3.5">
                    <Text className="text-xs text-muted">Tourneys</Text>
                    <Text className="mt-1 text-2xl font-black text-foreground">
                      6
                    </Text>
                    <Text className="mt-0.5 text-[10px] font-medium text-muted">
                      brackets
                    </Text>
                  </View>
                </View>

                {/* Player Quick Actions */}
                <Text className="mb-2.5 text-xs font-bold uppercase tracking-wider text-muted">
                  Player Actions
                </Text>

                <View className="mb-6 flex-row flex-wrap gap-2.5">
                  <Pressable
                    onPress={() => navigateTo("/casters")}
                    className="flex-1 min-w-[140px] flex-row items-center gap-2.5 rounded-2xl border border-[#bcdf21]/40 bg-[#005c23]/15 p-3.5 active:opacity-80"
                  >
                    <Ionicons name="videocam" size={20} color="#bcdf21" />
                    <View>
                      <Text className="text-xs font-bold text-foreground">
                        Book Caster
                      </Text>
                      <Text className="text-[10px] text-muted">
                        Record next match
                      </Text>
                    </View>
                  </Pressable>

                  <Pressable
                    onPress={() => navigateTo("/u/me")}
                    className="flex-1 min-w-[140px] flex-row items-center gap-2.5 rounded-2xl border border-border/60 bg-surface p-3.5 active:opacity-80"
                  >
                    <Ionicons name="stats-chart" size={20} color="#005c23" />
                    <View>
                      <Text className="text-xs font-bold text-foreground">
                        Detailed Stats
                      </Text>
                      <Text className="text-[10px] text-muted">
                        Head-to-head logs
                      </Text>
                    </View>
                  </Pressable>

                  <Pressable
                    onPress={() => navigateTo("/events")}
                    className="flex-1 min-w-[140px] flex-row items-center gap-2.5 rounded-2xl border border-border/60 bg-surface p-3.5 active:opacity-80"
                  >
                    <Ionicons name="calendar-outline" size={20} color="#f59e0b" />
                    <View>
                      <Text className="text-xs font-bold text-foreground">
                        Find Tournaments
                      </Text>
                      <Text className="text-[10px] text-muted">
                        Browse active draws
                      </Text>
                    </View>
                  </Pressable>
                </View>

                {/* Registered / Upcoming Tournaments */}
                <View className="mb-3 flex-row items-center justify-between">
                  <View>
                    <Text className="text-base font-bold text-foreground">
                      Upcoming Tournaments
                    </Text>
                    <Text className="text-xs text-muted">
                      Events on your schedule
                    </Text>
                  </View>
                  <Pressable onPress={() => navigateTo("/events")}>
                    <Text className="text-xs font-bold text-[#005c23] dark:text-[#bcdf21]">
                      Browse All
                    </Text>
                  </Pressable>
                </View>

                <View className="mb-6 gap-3">
                  {demoEvents.slice(0, 2).map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </View>

                {/* Player Match Highlights */}
                <View className="mb-3 flex-row items-center justify-between">
                  <View>
                    <Text className="text-base font-bold text-foreground">
                      Match Highlights
                    </Text>
                    <Text className="text-xs text-muted">
                      Recorded footage from booked casters
                    </Text>
                  </View>
                </View>

                <View className="mb-6 gap-3">
                  {demoVideos.slice(0, 2).map((video) => (
                    <VideoCard key={video.id} video={video} />
                  ))}
                </View>

                {/* Full Player Dashboard Link */}
                <Pressable
                  onPress={() => navigateTo("/u/me")}
                  className="mb-6 flex-row items-center justify-between rounded-2xl border border-border/60 bg-surface p-4 active:bg-surface-secondary"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="size-9 items-center justify-center rounded-xl bg-[#005c23]/15">
                      <Ionicons name="person" size={18} color="#bcdf21" />
                    </View>
                    <View>
                      <Text className="text-sm font-bold text-foreground">
                        Open Full Player Dashboard
                      </Text>
                      <Text className="text-[11px] text-muted">
                        Match ratings, full video archive & challenges
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} className="text-muted" />
                </Pressable>
              </>
            ) : (
              <>
                {/* Organizer Hub View */}
                {/* Club / Director Banner */}
                <View className="mb-5 overflow-hidden rounded-3xl bg-[#005c23] p-5 shadow-xs">
                  <View className="flex-row items-center gap-1.5 self-start rounded-full bg-[#bcdf21]/20 px-2.5 py-1">
                    <Ionicons name="shield-checkmark" size={13} color="#bcdf21" />
                    <Text className="text-[11px] font-bold text-[#bcdf21]">
                      Tournament Host & Club Director
                    </Text>
                  </View>

                  <Text className="mt-3 text-xl font-black text-white">
                    {organizations[0]?.name ?? "Your organization"}
                  </Text>
                  <Text className="mt-1 text-xs text-gray-200">
                    {analytics.playerCount} registered players
                  </Text>
                </View>

                {/* Organizer Metrics Grid */}
                <Text className="mb-2.5 text-xs font-bold uppercase tracking-wider text-muted">
                  Tournament Metrics
                </Text>

                <View className="mb-5 flex-row flex-wrap gap-2.5">
                  <View className="flex-1 min-w-[140px] rounded-2xl border border-border/50 bg-surface p-3.5">
                    <Text className="text-xs text-muted">Active Events</Text>
                    <Text className="mt-1 text-2xl font-black text-foreground">
                      {analytics.activeTournaments}
                    </Text>
                    <Text className="mt-0.5 text-[10px] text-emerald-500">
                      Live brackets
                    </Text>
                  </View>

                  <View className="flex-1 min-w-[140px] rounded-2xl border border-border/50 bg-surface p-3.5">
                    <Text className="text-xs text-muted">Players</Text>
                    <Text className="mt-1 text-2xl font-black text-foreground">
                      {analytics.playerCount}
                    </Text>
                    <Text className="mt-0.5 text-[10px] text-muted">
                      across brackets
                    </Text>
                  </View>

                  <View className="flex-1 min-w-[140px] rounded-2xl border border-border/50 bg-surface p-3.5">
                    <Text className="text-xs text-muted">Entry Fees</Text>
                    <Text className="mt-1 text-2xl font-black text-[#005c23] dark:text-[#bcdf21]">
                      ${(analytics.totalRevenueCents / 100).toLocaleString()}
                    </Text>
                    <Text className="mt-0.5 text-[10px] text-muted">collected</Text>
                  </View>

                  <View className="flex-1 min-w-[140px] rounded-2xl border border-border/50 bg-surface p-3.5">
                    <Text className="text-xs text-muted">Checked In</Text>
                    <Text className="mt-1 text-2xl font-black text-foreground">
                      {analytics.checkedIn}
                    </Text>
                    <Text className="mt-0.5 text-[10px] text-muted">
                      players on site
                    </Text>
                  </View>
                </View>

                {/* Organizer Quick Actions */}
                <Text className="mb-2.5 text-xs font-bold uppercase tracking-wider text-muted">
                  Hosting Tools
                </Text>

                <View className="mb-6 flex-row flex-wrap gap-2.5">
                  <Pressable
                    onPress={() => openOrganizerTool("/u/organizer/tournaments/new")}
                    className="flex-1 min-w-[140px] flex-row items-center gap-2.5 rounded-2xl border border-[#bcdf21]/40 bg-[#005c23]/15 p-3.5 active:opacity-80"
                  >
                    <Ionicons name="add-circle" size={20} color="#bcdf21" />
                    <View>
                      <Text className="text-xs font-bold text-foreground">
                        Host Tournament
                      </Text>
                      <Text className="text-[10px] text-muted">Publish draw</Text>
                    </View>
                  </Pressable>

                  <Pressable
                    onPress={() => openOrganizerTool("/u/organizer/tournaments")}
                    className="flex-1 min-w-[140px] flex-row items-center gap-2.5 rounded-2xl border border-border/60 bg-surface p-3.5 active:opacity-80"
                  >
                    <Ionicons name="git-network-outline" size={20} color="#005c23" />
                    <View>
                      <Text className="text-xs font-bold text-foreground">
                        Manage Brackets
                      </Text>
                      <Text className="text-[10px] text-muted">Court scheduler</Text>
                    </View>
                  </Pressable>

                  <Pressable
                    onPress={() => navigateTo("/casters")}
                    className="flex-1 min-w-[140px] flex-row items-center gap-2.5 rounded-2xl border border-border/60 bg-surface p-3.5 active:opacity-80"
                  >
                    <Ionicons name="videocam-outline" size={20} color="#f59e0b" />
                    <View>
                      <Text className="text-xs font-bold text-foreground">
                        Caster Booking
                      </Text>
                      <Text className="text-[10px] text-muted">
                        Live stream event
                      </Text>
                    </View>
                  </Pressable>

                  <Pressable
                    onPress={() => openOrganizerTool("/u/organizer/payments")}
                    className="flex-1 min-w-[140px] flex-row items-center gap-2.5 rounded-2xl border border-border/60 bg-surface p-3.5 active:opacity-80"
                  >
                    <Ionicons name="card-outline" size={20} color="#059669" />
                    <View>
                      <Text className="text-xs font-bold text-foreground">
                        Club Payouts
                      </Text>
                      <Text className="text-[10px] text-muted">Stripe balance</Text>
                    </View>
                  </Pressable>
                </View>

                {/* Hosted Events List */}
                <View className="mb-3 flex-row items-center justify-between">
                  <View>
                    <Text className="text-base font-bold text-foreground">
                      Hosted Tournaments
                    </Text>
                    <Text className="text-xs text-muted">
                      Your published brackets and events
                    </Text>
                  </View>
                  <Pressable onPress={() => openOrganizerTool("/u/organizer/tournaments/new")}>
                    <Text className="text-xs font-bold text-[#005c23] dark:text-[#bcdf21]">
                      + New
                    </Text>
                  </Pressable>
                </View>

                <View className="mb-6 gap-3">
                  {hostedEvents.slice(0, 2).map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </View>

                {/* Organizations Section */}
                <View className="mb-3">
                  <Text className="text-base font-bold text-foreground">
                    Affiliated Organizations
                  </Text>
                  <Text className="text-xs text-muted">
                    Clubs and pickleball venues under your direction
                  </Text>
                </View>

                <View className="mb-6 gap-2.5">
                  {organizations.map((org) => (
                    <View
                      key={org.id}
                      className="flex-row items-center justify-between rounded-2xl border border-border/60 bg-surface p-4"
                    >
                      <View className="flex-1 pr-3">
                        <Text className="text-sm font-bold text-foreground">
                          {org.name}
                        </Text>
                        {org.description ? (
                          <Text
                            className="mt-0.5 text-xs text-muted"
                            numberOfLines={1}
                          >
                            {org.description}
                          </Text>
                        ) : null}
                      </View>
                      <Pressable
                        onPress={() => openOrganizerTool("/u/organizer/organizations")}
                        className="rounded-xl bg-[#005c23]/10 px-3 py-1.5 active:opacity-80"
                      >
                        <Text className="text-xs font-bold text-[#005c23] dark:text-[#bcdf21]">
                          Manage
                        </Text>
                      </Pressable>
                    </View>
                  ))}
                </View>

                {/* Full Organizer Dashboard Link */}
                <Pressable
                  onPress={() => navigateTo("/u/organizer")}
                  className="mb-6 flex-row items-center justify-between rounded-2xl border border-border/60 bg-surface p-4 active:bg-surface-secondary"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="size-9 items-center justify-center rounded-xl bg-amber-500/15">
                      <Ionicons name="trophy" size={18} color="#f59e0b" />
                    </View>
                    <View>
                      <Text className="text-sm font-bold text-foreground">
                        Open Organizer Suite
                      </Text>
                      <Text className="text-[11px] text-muted">
                        Registration exports, court brackets & payouts
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} className="text-muted" />
                </Pressable>
              </>
            )}

            {/* App Settings & Preferences */}
            <Text className="mb-2.5 text-xs font-bold uppercase tracking-wider text-muted">
              Preferences & App Settings
            </Text>

            <View className="mb-5 overflow-hidden rounded-2xl border border-border/60 bg-surface">
              <View className="flex-row items-center justify-between border-b border-border/40 p-4">
                <View className="flex-row items-center gap-3">
                  <Ionicons name="moon-outline" size={18} className="text-muted" />
                  <Text className="text-sm font-semibold text-foreground">
                    Dark / Light Theme
                  </Text>
                </View>
                <ThemeToggle />
              </View>

              <Pressable
                onPress={() => navigateTo("/account")}
                className="flex-row items-center justify-between border-b border-border/40 p-4 active:bg-surface-secondary"
              >
                <View className="flex-row items-center gap-3">
                  <Ionicons name="person-circle-outline" size={18} className="text-muted" />
                  <Text className="text-sm font-semibold text-foreground">
                    Account & Security
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} className="text-muted" />
              </Pressable>

              <Pressable
                onPress={() => navigateTo("/casters")}
                className="flex-row items-center justify-between p-4 active:bg-surface-secondary"
              >
                <View className="flex-row items-center gap-3">
                  <Ionicons name="videocam-outline" size={18} className="text-muted" />
                  <Text className="text-sm font-semibold text-foreground">
                    Casters & Match Coverage
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} className="text-muted" />
              </Pressable>
            </View>

            {/* Sign Out Button */}
            <Pressable
              onPress={handleSignOut}
              className="flex-row items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 py-3.5 active:opacity-80"
            >
              <Ionicons name="log-out-outline" size={18} color="#ef4444" />
              <Text className="text-sm font-bold text-red-500">Sign Out</Text>
            </Pressable>
          </View>
        ) : (
          /* Signed Out View */
          <View className="p-4">
            <View className="mb-6 items-center">
              <View className="size-16 items-center justify-center rounded-full bg-[#005c23] shadow-md">
                <Ionicons name="tennisball" size={32} color="#bcdf21" />
              </View>
              <Text className="mt-3 text-2xl font-black text-foreground">
                Join RallyCasts
              </Text>
              <Text className="mt-1 text-center text-xs text-muted">
                Track your matches, view court ratings, and run pickleball tournaments with live coverage.
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => navigateTo("/sign-in")}
              className="items-center justify-center rounded-xl bg-[#005c23] py-3.5 active:opacity-80 dark:bg-[#bcdf21]"
            >
              <Text className="text-sm font-bold text-white dark:text-black">
                Sign in
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => navigateTo("/sign-up")}
              className="mt-3 items-center justify-center rounded-xl border border-border/60 bg-surface py-3.5 active:opacity-80"
            >
              <Text className="text-sm font-bold text-foreground">
                Create an account
              </Text>
            </Pressable>

            {/* Quick Guest Preview info */}
            <View className="mt-8 rounded-2xl border border-border/50 bg-surface p-4">
              <Text className="text-xs font-bold uppercase tracking-wider text-muted">
                Why RallyCasts?
              </Text>

              <View className="mt-3 gap-3">
                <View className="flex-row items-start gap-3">
                  <View className="size-7 items-center justify-center rounded-lg bg-[#005c23]/15">
                    <Ionicons name="tennisball" size={14} color="#005c23" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-foreground">
                      For Players
                    </Text>
                    <Text className="text-[11px] text-muted">
                      Log match scores, earn your dynamic rating, and save 4K video clips of your games.
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-start gap-3">
                  <View className="size-7 items-center justify-center rounded-lg bg-amber-500/15">
                    <Ionicons name="trophy" size={14} color="#f59e0b" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-foreground">
                      For Tournament Directors
                    </Text>
                    <Text className="text-[11px] text-muted">
                      Publish draws, manage court brackets, collect entry fees, and dispatch casters to courts.
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View className="mt-4 overflow-hidden rounded-2xl border border-border/60 bg-surface">
              <View className="flex-row items-center justify-between p-4">
                <View className="flex-row items-center gap-3">
                  <Ionicons
                    name="moon-outline"
                    size={18}
                    className="text-muted"
                  />
                  <Text className="text-sm font-semibold text-foreground">
                    Dark / Light Theme
                  </Text>
                </View>
                <ThemeToggle />
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
