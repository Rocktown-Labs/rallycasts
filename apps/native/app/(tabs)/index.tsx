import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ClipCard, ParkCard, VideoCard } from "@/components/cards";
import { ScreenHeader } from "@/components/header";
import { useClips, useHomeFeed, useVideos } from "@/lib/hooks";
import { demoPosts, demoVenues, type VideoData } from "@/lib/demo-data";

export default function HomeScreen() {
  const router = useRouter();
  const { data: feedData, isLoading: feedLoading } = useHomeFeed();
  const { data: videosData } = useVideos();
  const { data: clipsData } = useClips();

  const handleTrendingPress = () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push("/trending");
  };

  const videos = videosData?.videos || [];
  const clips = clipsData?.videos || [];
  const featured = videos.slice(0, 3);
  const venues = demoVenues;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background">
      <ScreenHeader
        title="RallyCasts"
        subtitle="Pickleball courts, matches & community"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Hero Section */}
        <View className="p-4">
          <View className="overflow-hidden rounded-3xl bg-[#005c23] p-5 shadow-md">
            <View className="flex-row items-center gap-1.5 self-start rounded-full bg-[#bcdf21]/20 px-2.5 py-1">
              <Ionicons name="tennisball" size={12} color="#bcdf21" />
              <Text className="text-[11px] font-bold text-[#bcdf21]">
                Pickleball around your courts
              </Text>
            </View>

            <Text className="mt-3 text-2xl font-black tracking-tight text-white">
              Pickleball videos, players, and casters around you.
            </Text>

            <Text className="mt-2 text-xs leading-relaxed text-gray-200">
              Watch local match highlights, find active parks, and book a
              RallyCasts caster when the game deserves a clean angle.
            </Text>

            <View className="mt-4 flex-row flex-wrap gap-2.5">
              <Pressable
                onPress={handleTrendingPress}
                className="flex-row items-center gap-1.5 rounded-xl bg-[#bcdf21] px-4 py-2.5 active:opacity-90"
              >
                <Ionicons name="flame" size={16} color="#000000" />
                <Text className="text-xs font-bold text-black">
                  Trending Courts
                </Text>
              </Pressable>

              <Pressable
                onPress={() => router.push("/players")}
                className="flex-row items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 active:opacity-80"
              >
                <Ionicons name="people-outline" size={16} color="#ffffff" />
                <Text className="text-xs font-semibold text-white">
                  Find Players
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Highlights Shelf (Vertical clips 9:16) */}
        {clips.length > 0 ? (
          <View className="mt-2">
            <View className="flex-row items-center justify-between px-4 pb-2.5">
              <View className="flex-row items-center gap-2">
                <View className="size-6 items-center justify-center rounded-lg bg-red-500/15">
                  <Ionicons name="flame" size={15} color="#ef4444" />
                </View>
                <Text className="text-lg font-bold tracking-tight text-foreground">
                  Highlights
                </Text>
              </View>
              <Text className="text-xs text-muted">Bite-sized points</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16 }}
            >
              {clips.map((clip) => (
                <ClipCard key={clip.id} clip={clip} />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Featured Matches */}
        <View className="mt-6 px-4">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-lg font-bold tracking-tight text-foreground">
              Featured Matches
            </Text>
            <Text className="text-xs text-muted">Recent rallies & clinics</Text>
          </View>

          {featured.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </View>

        {/* Parks & Courts Near You */}
        <View className="mt-4 px-4">
          <View className="mb-3 flex-row items-center justify-between">
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="location" size={18} color="#bcdf21" />
              <Text className="text-lg font-bold tracking-tight text-foreground">
                Parks Near You
              </Text>
            </View>
            <Pressable onPress={handleTrendingPress}>
              <Text className="text-xs font-semibold text-[#005c23] dark:text-[#bcdf21]">
                View All
              </Text>
            </Pressable>
          </View>

          {venues.slice(0, 3).map((venue) => (
            <ParkCard key={venue.id} venue={venue} />
          ))}
        </View>

        {/* Community Court Chatter */}
        <View className="mt-4 px-4">
          <View className="mb-3">
            <Text className="text-lg font-bold tracking-tight text-foreground">
              Court Chatter
            </Text>
            <Text className="text-xs text-muted">
              Live updates from active pickleball parks
            </Text>
          </View>

          {demoPosts.map((post) => (
            <View
              key={post.id}
              className="mb-3 rounded-2xl border border-border/50 bg-surface p-4 shadow-xs"
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-bold text-foreground">
                  {post.author.name}
                </Text>
                <Text className="text-[11px] text-muted">{post.createdAt}</Text>
              </View>
              <Text className="mt-1.5 text-xs leading-relaxed text-muted">
                {post.content}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
