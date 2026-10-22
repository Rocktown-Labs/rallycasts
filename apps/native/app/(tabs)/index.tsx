import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ClipCard, EventCard, ParkCard, VideoCard } from "@/components/cards";
import { ScreenHeader } from "@/components/header";
import {
  HOME_TABS,
  HomeFilterEmpty,
  HomeTabsBar,
  type HomeTabId,
} from "@/components/home-tabs";
import { ReelsPager } from "@/components/reels-pager";
import { SocialFeedPager } from "@/components/social-feed-pager";
import {
  demoPosts,
  type EventData,
  type PostData,
  type VenueData,
  type VideoData,
} from "@/lib/demo-data";
import {
  type FeedResponse,
  useClips,
  useHomeFeed,
  useTrending,
  useVideos,
} from "@/lib/hooks";
import { authClient } from "@/lib/auth-client";

const SHELF_CARD_GAP = 12;
const MAX_SHELF_CARD_WIDTH = 320;
const FEATURED_VIDEO_LIMIT = 3;

type FeedItem = FeedResponse["items"][number];

function addUnique<T extends { id: string }>(
  list: T[],
  seen: Set<string>,
  item: T
) {
  if (!seen.has(item.id)) {
    seen.add(item.id);
    list.push(item);
  }
}

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [activeTab, setActiveTab] = useState<HomeTabId>("all");
  const { data: session } = authClient.useSession();
  const isPersonalized = Boolean(session?.user);

  const { data: feedData } = useHomeFeed();
  const { data: videosData } = useVideos();
  const { data: clipsData } = useClips();
  const { data: trendingData } = useTrending();

  const feedItems = useMemo(() => feedData?.items ?? [], [feedData?.items]);

  const videos = useMemo(() => {
    const list: VideoData[] = [];
    const seen = new Set<string>();

    for (const item of feedItems) {
      if (item.entityType === "video") {
        addUnique(list, seen, item.entity as VideoData);
      }
    }

    for (const video of videosData?.videos ?? []) {
      addUnique(list, seen, video);
    }

    return list;
  }, [feedItems, videosData?.videos]);

  const venues = useMemo(() => {
    const list: VenueData[] = [];
    const seen = new Set<string>();

    for (const item of feedItems) {
      if (item.entityType === "venue") {
        addUnique(list, seen, item.entity as VenueData);
      }
    }

    for (const venue of trendingData?.venues ?? []) {
      addUnique(list, seen, venue);
    }

    return [...list].sort((a, b) => {
      if (a.isHomeCourt && !b.isHomeCourt) {
        return -1;
      }
      if (!a.isHomeCourt && b.isHomeCourt) {
        return 1;
      }
      return (b.activePlayers ?? 0) - (a.activePlayers ?? 0);
    });
  }, [feedItems, trendingData?.venues]);

  const events = useMemo(() => {
    const list: EventData[] = [];
    const seen = new Set<string>();

    for (const item of feedItems) {
      if (item.entityType === "event") {
        addUnique(list, seen, item.entity as EventData);
      }
    }

    for (const event of trendingData?.events ?? []) {
      addUnique(list, seen, event);
    }

    return list;
  }, [feedItems, trendingData?.events]);

  const posts = useMemo(() => {
    const list = feedItems
      .filter((item) => item.entityType === "post")
      .map((item) => item.entity as PostData);

    return list.length > 0 ? list : demoPosts;
  }, [feedItems]);

  const friendItems = useMemo(
    () => feedItems.filter((item) => (item.signals?.social ?? 0) > 0),
    [feedItems]
  );

  const friendPosts = useMemo(
    () =>
      friendItems
        .filter((item) => item.entityType === "post")
        .map((item) => item.entity as PostData),
    [friendItems]
  );

  const clips = clipsData?.videos ?? [];
  const featured = videos.slice(0, FEATURED_VIDEO_LIMIT);
  const hasFriends = friendPosts.length > 0 || demoPosts.length > 0;

  const shows = (tab: Exclude<HomeTabId, "all">) =>
    activeTab === "all" || activeTab === tab;

  const hasContentForTab: Record<Exclude<HomeTabId, "all">, boolean> = {
    community: posts.length > 0,
    courts: venues.length > 0,
    friends: hasFriends,
    highlights: clips.length > 0,
    matches: featured.length > 0,
    tournaments: events.length > 0,
  };

  const isFilteredEmpty =
    activeTab === "all" ? false : !hasContentForTab[activeTab];

  const shelfCardWidth = Math.min(
    MAX_SHELF_CARD_WIDTH,
    Math.round(width * 0.78)
  );
  const activeTabLabel =
    HOME_TABS.find((tab) => tab.id === activeTab)?.label ?? "this category";

  const handleSelectTab = (tab: HomeTabId) => {
    setActiveTab(tab);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleTrendingPress = () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push("/trending");
  };

  const handleViewAllEvents = () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push("/events");
  };

  const feedPosts = friendPosts.length > 0 ? friendPosts : demoPosts;
  const isFeedTab = activeTab === "friends" || activeTab === "highlights";

  // Friends and Highlights are full-screen, swipe-up-and-down feeds.
  if (isFeedTab) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]} style={{ flex: 1 }}>
        <ScreenHeader title="RallyCasts" />

        <HomeTabsBar activeTab={activeTab} onSelectTab={handleSelectTab} />

        <View className="flex-1">
          {activeTab === "friends" ? (
            <SocialFeedPager posts={feedPosts} />
          ) : (
            <ReelsPager clips={clips} />
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]} style={{ flex: 1 }}>
      <ScreenHeader title="RallyCasts" />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        stickyHeaderIndices={[1]}
      >
        {/* Hero Section */}
        <View className={isPersonalized ? "hidden" : "p-4"}>
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

        <HomeTabsBar activeTab={activeTab} onSelectTab={handleSelectTab} />

        {isFilteredEmpty ? (
          <HomeFilterEmpty
            label={activeTabLabel}
            onReset={() => handleSelectTab("all")}
          />
        ) : null}

        {shows("highlights") && clips.length > 0 ? (
          <HighlightsSection clips={clips} />
        ) : null}

        {shows("matches") && featured.length > 0 ? (
          <FeaturedSection videos={featured} />
        ) : null}

        {shows("courts") && venues.length > 0 ? (
          activeTab === "courts" ? (
            <ParksListSection venues={venues} />
          ) : (
            <ParksSection
              cardWidth={shelfCardWidth}
              onViewAll={handleTrendingPress}
              snapInterval={shelfCardWidth + SHELF_CARD_GAP}
              venues={venues}
            />
          )
        ) : null}

        {shows("tournaments") && events.length > 0 ? (
          activeTab === "tournaments" ? (
            <EventsListSection events={events} onViewAll={handleViewAllEvents} />
          ) : (
            <TournamentsSection
              cardWidth={shelfCardWidth}
              events={events}
              onViewAll={handleViewAllEvents}
              snapInterval={shelfCardWidth + SHELF_CARD_GAP}
            />
          )
        ) : null}

        {shows("community") && posts.length > 0 ? (
          <CommunitySection posts={posts} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

interface SectionHeadingProps {
  actionLabel?: string;
  icon?: React.ReactNode;
  onAction?: () => void;
  subtitle?: string;
  title: string;
}

function SectionHeading({
  actionLabel,
  icon,
  onAction,
  subtitle,
  title,
}: SectionHeadingProps) {
  return (
    <View className="mb-3 flex-row items-start justify-between gap-3 px-4">
      <View className="flex-1">
        <View className="flex-row items-center gap-1.5">
          {icon}
          <Text className="text-lg font-bold tracking-tight text-foreground">
            {title}
          </Text>
        </View>
        {subtitle ? (
          <Text className="mt-0.5 text-xs text-muted">{subtitle}</Text>
        ) : null}
      </View>

      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={onAction}
          className="pt-1 active:opacity-70"
        >
          <Text className="text-xs font-semibold text-[#005c23] dark:text-[#bcdf21]">
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function HighlightsSection({ clips }: { clips: VideoData[] }) {
  return (
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
  );
}

function FeaturedSection({ videos }: { videos: VideoData[] }) {
  return (
    <View className="mt-6 px-4">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-lg font-bold tracking-tight text-foreground">
          Featured Matches
        </Text>
        <Text className="text-xs text-muted">Recent rallies & clinics</Text>
      </View>

      {videos.map((video) => (
        <VideoCard key={video.id} video={video} />
      ))}
    </View>
  );
}

interface ParksSectionProps {
  cardWidth: number;
  onViewAll: () => void;
  snapInterval: number;
  venues: VenueData[];
}

function ParksSection({
  cardWidth,
  onViewAll,
  snapInterval,
  venues,
}: ParksSectionProps) {
  return (
    <View className="mt-6">
      <SectionHeading
        actionLabel="View All"
        icon={<Ionicons name="location" size={18} color="#bcdf21" />}
        onAction={onViewAll}
        subtitle="Courts with active heat, open play, and checked-in players."
        title="Parks Near You"
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToAlignment="start"
        snapToInterval={snapInterval}
        contentContainerStyle={{
          gap: SHELF_CARD_GAP,
          paddingBottom: 4,
          paddingHorizontal: 16,
        }}
      >
        {venues.map((venue) => (
          <View key={venue.id} style={{ width: cardWidth }}>
            <ParkCard venue={venue} />
          </View>
        ))}

        <Pressable
          accessibilityRole="button"
          onPress={onViewAll}
          style={{ width: Math.round(cardWidth * 0.6) }}
          className="mb-3.5 items-center justify-center rounded-2xl border border-dashed border-border/70 bg-surface/60 px-4 active:opacity-80"
        >
          <View className="size-11 items-center justify-center rounded-full bg-[#005c23]">
            <Ionicons name="arrow-forward" size={20} color="#ffffff" />
          </View>
          <Text className="mt-3 text-center text-sm font-bold text-foreground">
            View all parks
          </Text>
          <Text className="mt-1 text-center text-[11px] text-muted">
            {venues.length} nearby
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function TournamentsSection({
  cardWidth,
  events,
  onViewAll,
  snapInterval,
}: {
  cardWidth: number;
  events: EventData[];
  onViewAll: () => void;
  snapInterval: number;
}) {
  return (
    <View className="mt-6">
      <SectionHeading
        actionLabel="View all"
        icon={<Ionicons name="calendar" size={18} color="#bcdf21" />}
        onAction={onViewAll}
        subtitle="Upcoming tournaments, brackets, and open play sessions."
        title="Tournaments & Court Activity"
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToAlignment="start"
        snapToInterval={snapInterval}
        contentContainerStyle={{
          gap: SHELF_CARD_GAP,
          paddingBottom: 4,
          paddingHorizontal: 16,
        }}
      >
        {events.map((event) => (
          <View key={event.id} style={{ width: cardWidth }}>
            <EventCard event={event} />
          </View>
        ))}

        <Pressable
          accessibilityRole="button"
          onPress={onViewAll}
          style={{ width: Math.round(cardWidth * 0.6) }}
          className="mb-3.5 items-center justify-center rounded-2xl border border-dashed border-border/70 bg-surface/60 px-4 active:opacity-80"
        >
          <View className="size-11 items-center justify-center rounded-full bg-[#005c23]">
            <Ionicons name="arrow-forward" size={20} color="#ffffff" />
          </View>
          <Text className="mt-3 text-center text-sm font-bold text-foreground">
            View all events
          </Text>
          <Text className="mt-1 text-center text-[11px] text-muted">
            {events.length} upcoming
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function ParksListSection({ venues }: { venues: VenueData[] }) {
  return (
    <View className="mt-6">
      <SectionHeading
        icon={<Ionicons name="location" size={18} color="#bcdf21" />}
        subtitle="Courts with active heat, open play, and checked-in players."
        title="Parks Near You"
      />

      <View className="px-4">
        {venues.map((venue) => (
          <ParkCard key={venue.id} venue={venue} />
        ))}
      </View>
    </View>
  );
}

function EventsListSection({
  events,
  onViewAll,
}: {
  events: EventData[];
  onViewAll: () => void;
}) {
  return (
    <View className="mt-6">
      <SectionHeading
        actionLabel="View all"
        icon={<Ionicons name="calendar" size={18} color="#bcdf21" />}
        onAction={onViewAll}
        subtitle="Upcoming tournaments, brackets, and open play sessions."
        title="Tournaments & Court Activity"
      />

      <View className="px-4">
        {events.map((event) => (
          <EventCard event={event} key={event.id} />
        ))}
      </View>
    </View>
  );
}

function CommunitySection({ posts }: { posts: PostData[] }) {
  return (
    <View className="mt-6">
      <SectionHeading
        icon={<Ionicons name="chatbubbles" size={18} color="#bcdf21" />}
        subtitle="Live updates from active pickleball parks"
        title="Court Chatter"
      />

      <View className="px-4">
        {posts.map((post) => (
          <ChatterCard key={post.id} post={post} />
        ))}
      </View>
    </View>
  );
}

function ChatterCard({ post }: { post: PostData }) {
  return (
    <View className="mb-3 rounded-2xl border border-border/50 bg-surface p-4 shadow-xs">
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
  );
}
