import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SignIn } from "@/components/sign-in";
import { SignUp } from "@/components/sign-up";
import { ThemeToggle } from "@/components/theme-toggle";
import { authClient } from "@/lib/auth-client";
import { useProfile } from "@/lib/hooks";

export default function AccountScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { data: profileData } = useProfile();
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");

  const profile = profileData?.profile;
  const userName = session?.user?.name || profile?.name || "Pickleball Player";
  const userEmail = session?.user?.email || "Signed in with RallyCasts";
  const userInitial = userName.charAt(0).toUpperCase();

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

  return (
    <SafeAreaView edges={["bottom"]} className="flex-1 bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        {session?.user ? (
          <>
            {/* User Profile Card */}
            <View className="mb-5 rounded-3xl border border-border/60 bg-surface p-5 shadow-xs">
              <View className="flex-row items-center gap-4">
                <View className="size-16 items-center justify-center rounded-full bg-[#005c23]">
                  <Text className="text-2xl font-black text-[#bcdf21]">
                    {userInitial}
                  </Text>
                </View>

                <View className="flex-1">
                  <Text className="text-xl font-bold text-foreground">
                    {userName}
                  </Text>
                  <Text className="text-xs text-muted">{userEmail}</Text>

                  <View className="mt-2 flex-row flex-wrap gap-1.5">
                    <View className="rounded-md border border-[#bcdf21]/30 bg-[#bcdf21]/15 px-2 py-0.5">
                      <Text className="text-[10px] font-bold text-[#005c23] dark:text-[#bcdf21]">
                        {profile?.skillLevel || "4.0 Player"}
                      </Text>
                    </View>
                    <View className="rounded-md bg-surface-secondary px-2 py-0.5">
                      <Text className="text-[10px] font-semibold text-muted">
                        Verified Member
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Dashboards Navigation */}
            <Text className="mb-2.5 text-xs font-bold uppercase tracking-wider text-muted">
              Dashboards & Tools
            </Text>

            <View className="mb-5 overflow-hidden rounded-2xl border border-border/60 bg-surface">
              <Pressable
                onPress={() => navigateTo("/u/me")}
                className="flex-row items-center justify-between border-b border-border/40 p-4 active:bg-surface-secondary"
              >
                <View className="flex-row items-center gap-3">
                  <View className="size-9 items-center justify-center rounded-xl bg-[#005c23]/15">
                    <Ionicons name="person" size={18} color="#bcdf21" />
                  </View>
                  <View>
                    <Text className="text-sm font-bold text-foreground">
                      Player Dashboard
                    </Text>
                    <Text className="text-[11px] text-muted">
                      Your match history, ratings, and registered events
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} className="text-muted" />
              </Pressable>

              <Pressable
                onPress={() => navigateTo("/u/organizer")}
                className="flex-row items-center justify-between p-4 active:bg-surface-secondary"
              >
                <View className="flex-row items-center gap-3">
                  <View className="size-9 items-center justify-center rounded-xl bg-amber-500/15">
                    <Ionicons name="trophy" size={18} color="#f59e0b" />
                  </View>
                  <View>
                    <Text className="text-sm font-bold text-foreground">
                      Organizer Dashboard
                    </Text>
                    <Text className="text-[11px] text-muted">
                      Tournaments, club organizations & analytics
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} className="text-muted" />
              </Pressable>
            </View>

            {/* Preferences */}
            <Text className="mb-2.5 text-xs font-bold uppercase tracking-wider text-muted">
              Preferences
            </Text>

            <View className="mb-5 overflow-hidden rounded-2xl border border-border/60 bg-surface">
              <View className="flex-row items-center justify-between p-4">
                <View className="flex-row items-center gap-3">
                  <Ionicons name="moon-outline" size={18} className="text-muted" />
                  <Text className="text-sm font-semibold text-foreground">
                    Dark / Light Theme
                  </Text>
                </View>
                <ThemeToggle />
              </View>
            </View>

            {/* Sign Out Button */}
            <Pressable
              onPress={handleSignOut}
              className="flex-row items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 py-3.5 active:opacity-80"
            >
              <Ionicons name="log-out-outline" size={18} color="#ef4444" />
              <Text className="text-sm font-bold text-red-500">Sign Out</Text>
            </Pressable>
          </>
        ) : (
          <>
            {/* Logged Out View */}
            <View className="mb-6 items-center">
              <View className="size-16 items-center justify-center rounded-full bg-[#005c23] shadow-md">
                <Ionicons name="tennisball" size={32} color="#bcdf21" />
              </View>
              <Text className="mt-3 text-2xl font-black text-foreground">
                Join RallyCasts
              </Text>
              <Text className="mt-1 text-center text-xs text-muted">
                Track your pickleball matches, find local courts, and connect with players.
              </Text>

              {/* Sign In / Sign Up toggle */}
              <View className="mt-4 flex-row rounded-full border border-border/60 bg-surface p-1">
                <Pressable
                  onPress={() => setAuthMode("signin")}
                  className={`rounded-full px-5 py-1.5 ${
                    authMode === "signin"
                      ? "bg-[#005c23]"
                      : "bg-transparent"
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      authMode === "signin" ? "text-white" : "text-muted"
                    }`}
                  >
                    Sign In
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setAuthMode("signup")}
                  className={`rounded-full px-5 py-1.5 ${
                    authMode === "signup"
                      ? "bg-[#005c23]"
                      : "bg-transparent"
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      authMode === "signup" ? "text-white" : "text-muted"
                    }`}
                  >
                    Create Account
                  </Text>
                </Pressable>
              </View>
            </View>

            {authMode === "signin" ? <SignIn /> : <SignUp />}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
