import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/header";
import { authClient } from "@/lib/auth-client";
import type { EventData, PostData, VenueData, VideoData } from "@/lib/demo-data";
import {
  useDebouncedValue,
  useRecentSearches,
  useSearch,
  type SearchEntity,
  type SearchPlayer,
} from "@/lib/hooks";

const FILTERS: Array<{ id: SearchEntity; label: string }> = [
  { id: "all", label: "All" },
  { id: "videos", label: "Videos" },
  { id: "players", label: "Players" },
  { id: "posts", label: "Posts" },
  { id: "events", label: "Events" },
  { id: "parks", label: "Parks" },
];

function formatEventDate(value?: string | null) {
  if (!value) {
    return "Upcoming";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Upcoming";
  }
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

function hapticSelection() {
  if (Platform.OS === "ios") {
    Haptics.selectionAsync();
  }
}

function ResultSection({
  actionLabel,
  children,
  count,
  onAction,
  title,
}: {
  actionLabel?: string;
  children: React.ReactNode;
  count: number;
  onAction?: () => void;
  title: string;
}) {
  return (
    <View className="mt-2">
      <View className="mb-2 flex-row items-center justify-between px-4">
        <Text className="text-[11px] font-bold uppercase tracking-wider text-muted">
          {title}
        </Text>
        {actionLabel && onAction ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={onAction}
            className="active:opacity-70"
          >
            <Text className="text-xs font-semibold text-[#005c23] dark:text-[#bcdf21]">
              {actionLabel}
            </Text>
          </Pressable>
        ) : (
          <Text className="text-[10px] font-semibold text-muted">{count}</Text>
        )}
      </View>
      <View className="px-4">{children}</View>
    </View>
  );
}

function VideoResult({ video }: { video: VideoData }) {
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        hapticSelection();
        router.push(`/videos/${video.id}`);
      }}
      className="mb-2 flex-row items-center gap-3 rounded-2xl border border-border/50 bg-surface p-3 active:opacity-80"
    >
      <View className="h-14 w-20 overflow-hidden rounded-lg bg-surface-secondary">
        {video.thumbnailUrl ? (
          <Image
            contentFit="cover"
            source={{ uri: video.thumbnailUrl }}
            style={{ height: "100%", width: "100%" }}
          />
        ) : (
          <View className="size-full items-center justify-center">
            <Ionicons name="play" size={18} color="#bcdf21" />
          </View>
        )}
      </View>

      <View className="flex-1">
        <Text
          className="text-sm font-bold text-foreground"
          numberOfLines={2}
        >
          {video.title}
        </Text>
        <Text className="mt-0.5 text-[11px] text-muted" numberOfLines={1}>
          {video.owner?.name ?? "RallyCasts"}
          {video.viewsCount ? ` • ${video.viewsCount} views` : ""}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={14} className="text-muted" />
    </Pressable>
  );
}

function PlayerResult({ player }: { player: SearchPlayer }) {
  const router = useRouter();
  const initial = player.name.charAt(0).toUpperCase();
  const location = [player.homeCity, player.homeState].filter(Boolean).join(", ");

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        hapticSelection();
        router.push(`/players/${player.username ?? player.id}`);
      }}
      className="mb-2 flex-row items-center gap-3 rounded-2xl border border-border/50 bg-surface p-3 active:opacity-80"
    >
      {player.image ? (
        <Image
          contentFit="cover"
          source={{ uri: player.image }}
          style={{ borderRadius: 20, height: 40, width: 40 }}
        />
      ) : (
        <View className="size-10 items-center justify-center rounded-full bg-[#005c23]/20">
          <Text className="text-sm font-bold text-[#005c23] dark:text-[#bcdf21]">
            {initial}
          </Text>
        </View>
      )}

      <View className="flex-1">
        <Text className="text-sm font-bold text-foreground" numberOfLines={1}>
          {player.name}
        </Text>
        <Text className="text-[11px] text-muted" numberOfLines={1}>
          @{player.username ?? player.displayUsername ?? "player"}
          {location ? ` • ${location}` : ""}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={14} className="text-muted" />
    </Pressable>
  );
}

function EventResult({ event }: { event: EventData }) {
  const router = useRouter();
  const location = event.location ?? event.venueName ?? "Local courts";

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        hapticSelection();
        router.push(`/events/${event.id}`);
      }}
      className="mb-2 flex-row items-center gap-3 rounded-2xl border border-border/50 bg-surface p-3 active:opacity-80"
    >
      <View className="size-10 items-center justify-center rounded-xl bg-[#005c23]/15">
        <Ionicons name="calendar-outline" size={18} color="#bcdf21" />
      </View>

      <View className="flex-1">
        <Text className="text-sm font-bold text-foreground" numberOfLines={2}>
          {event.name}
        </Text>
        <Text className="mt-0.5 text-[11px] text-muted" numberOfLines={1}>
          {event.dateLabel ?? formatEventDate(event.startsAt)} • {location}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={14} className="text-muted" />
    </Pressable>
  );
}

function VenueResult({ venue }: { venue: VenueData }) {
  const router = useRouter();
  const location =
    [venue.city, venue.state].filter(Boolean).join(", ") || "Local park";

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        hapticSelection();
        router.push(`/venues/${venue.id}`);
      }}
      className="mb-2 flex-row items-center gap-3 rounded-2xl border border-border/50 bg-surface p-3 active:opacity-80"
    >
      <View className="size-10 items-center justify-center rounded-xl bg-[#bcdf21]/15">
        <Ionicons name="location-outline" size={18} color="#bcdf21" />
      </View>

      <View className="flex-1">
        <Text className="text-sm font-bold text-foreground" numberOfLines={1}>
          {venue.name}
        </Text>
        <Text className="mt-0.5 text-[11px] text-muted" numberOfLines={1}>
          {location}
          {venue.courtCount ? ` • ${venue.courtCount} courts` : ""}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={14} className="text-muted" />
    </Pressable>
  );
}

function PostResult({ item }: { item: { author: PostData["author"]; post: PostData } }) {
  return (
    <View className="mb-2 flex-row items-start gap-3 rounded-2xl border border-border/50 bg-surface p-3">
      <View className="size-10 items-center justify-center rounded-xl bg-[#005c23]/15">
        <Ionicons name="chatbubble-outline" size={18} color="#bcdf21" />
      </View>

      <View className="flex-1">
        <Text className="text-xs leading-relaxed text-foreground" numberOfLines={3}>
          {item.post.content}
        </Text>
        <Text className="mt-1 text-[10px] text-muted">
          {item.author.name} • {item.post.createdAt}
        </Text>
      </View>
    </View>
  );
}

function SearchPrompt() {
  return (
    <View className="mx-4 mt-4 items-center rounded-2xl border border-dashed border-border/80 bg-surface/60 p-8">
      <View className="size-12 items-center justify-center rounded-full bg-surface-secondary">
        <Ionicons name="search" size={22} className="text-muted" />
      </View>
      <Text className="mt-3 text-sm font-bold text-foreground">
        Search across RallyCasts
      </Text>
      <Text className="mt-1 text-center text-xs text-muted">
        Find players, parks, events, videos, and court chatter.
      </Text>
    </View>
  );
}

function NoResults({ query }: { query: string }) {
  return (
    <View className="mx-4 mt-4 items-center rounded-2xl border border-dashed border-border/80 bg-surface/60 p-8">
      <View className="size-12 items-center justify-center rounded-full bg-surface-secondary">
        <Ionicons name="search-outline" size={22} className="text-muted" />
      </View>
      <Text className="mt-3 text-sm font-bold text-foreground">
        No results for “{query}”
      </Text>
      <Text className="mt-1 text-center text-xs text-muted">
        Try a different name, city, or keyword.
      </Text>
    </View>
  );
}

export default function SearchScreen() {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<SearchEntity>("all");
  const { data: session } = authClient.useSession();
  const isSignedIn = Boolean(session?.user);
  const params = useLocalSearchParams<{ q?: string }>();
  const { addRecentSearch, searches } = useRecentSearches();

  const debouncedQuery = useDebouncedValue(query.trim(), 300);
  const { data, isFetching } = useSearch(debouncedQuery, activeFilter);

  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => inputRef.current?.focus(), 150);

      return () => clearTimeout(timer);
    }, [])
  );

  // Recent searches can hand the screen a query (history page, deep links).
  useEffect(() => {
    const paramQuery = Array.isArray(params.q) ? params.q[0] : params.q;
    if (paramQuery) {
      setQuery(paramQuery);
    }
  }, [params.q]);

  useEffect(() => {
    if (debouncedQuery.length > 1) {
      void addRecentSearch(debouncedQuery);
    }
  }, [addRecentSearch, debouncedQuery]);

  useEffect(() => {
    if (!isSignedIn && activeFilter === "players") {
      setActiveFilter("all");
    }
  }, [activeFilter, isSignedIn]);

  const videos = data?.videos ?? [];
  const players = isSignedIn ? (data?.players ?? []) : [];
  const events = data?.events ?? [];
  const venues = data?.venues ?? [];
  const posts = data?.posts ?? [];
  const hasResults =
    videos.length + players.length + events.length + venues.length + posts.length >
    0;
  const isSearching = debouncedQuery.length > 1;
  const filters = isSignedIn
    ? FILTERS
    : FILTERS.filter((filter) => filter.id !== "players");

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background">
      <ScreenHeader
        subtitle="Find players, parks, events & videos"
        title="Search"
      />

      <View className="px-4 pt-3">
        <View className="flex-row items-center rounded-2xl border border-border/60 bg-surface px-3.5 py-2.5">
          <Ionicons name="search-outline" size={18} className="text-muted" />
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            className="ml-2 flex-1 text-sm text-foreground"
            clearButtonMode="while-editing"
            onChangeText={setQuery}
            placeholder="Search RallyCasts..."
            placeholderTextColor="#888888"
            ref={inputRef}
            returnKeyType="search"
            value={query}
          />
          {query.length > 0 ? (
            <Pressable
              accessibilityLabel="Clear search"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => setQuery("")}
              className="p-1"
            >
              <Ionicons name="close-circle" size={16} className="text-muted" />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View className="py-3">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
        >
          {filters.map((filter) => {
            const isActive = activeFilter === filter.id;

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                key={filter.id}
                onPress={() => {
                  hapticSelection();
                  setActiveFilter(filter.id);
                }}
                className={`rounded-full px-3.5 py-1.5 active:opacity-80 ${
                  isActive
                    ? "bg-[#005c23] dark:bg-[#bcdf21]"
                    : "border border-border/60 bg-surface"
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    isActive ? "text-white dark:text-black" : "text-foreground"
                  }`}
                >
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {isFetching && isSearching ? (
          <View className="items-center py-6">
            <ActivityIndicator color="#bcdf21" />
          </View>
        ) : null}

        {!isSearching ? (
          searches.length > 0 ? (
            <View className="mt-2">
              <View className="mb-2 flex-row items-center justify-between px-4">
                <Text className="text-[11px] font-bold uppercase tracking-wider text-muted">
                  Recent searches
                </Text>
                <Pressable
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => router.push("/search-history")}
                  className="active:opacity-70"
                >
                  <Text className="text-xs font-semibold text-[#005c23] dark:text-[#bcdf21]">
                    View all
                  </Text>
                </Pressable>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
              >
                {searches.slice(0, 5).map((item) => (
                  <Pressable
                    accessibilityRole="button"
                    key={item}
                    onPress={() => {
                      hapticSelection();
                      setQuery(item);
                    }}
                    className="flex-row items-center gap-1.5 rounded-full border border-border/60 bg-surface px-3.5 py-2 active:opacity-80"
                  >
                    <Ionicons
                      name="time-outline"
                      size={13}
                      className="text-muted"
                    />
                    <Text
                      className="max-w-[160px] text-xs font-medium text-foreground"
                      numberOfLines={1}
                    >
                      {item}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : (
            <SearchPrompt />
          )
        ) : null}

        {isSearching && !isFetching && !hasResults ? (
          <NoResults query={debouncedQuery} />
        ) : null}

        {videos.length > 0 ? (
          <ResultSection count={videos.length} title="Videos">
            {videos.map((video) => (
              <VideoResult key={video.id} video={video} />
            ))}
          </ResultSection>
        ) : null}

        {players.length > 0 ? (
          <ResultSection
            actionLabel="View all"
            count={players.length}
            onAction={() => {
              hapticSelection();
              router.push("/players");
            }}
            title="Players"
          >
            {players.map((player) => (
              <PlayerResult key={player.id} player={player} />
            ))}
          </ResultSection>
        ) : null}

        {events.length > 0 ? (
          <ResultSection count={events.length} title="Events">
            {events.map((event) => (
              <EventResult event={event} key={event.id} />
            ))}
          </ResultSection>
        ) : null}

        {venues.length > 0 ? (
          <ResultSection count={venues.length} title="Parks">
            {venues.map((venue) => (
              <VenueResult key={venue.id} venue={venue} />
            ))}
          </ResultSection>
        ) : null}

        {posts.length > 0 ? (
          <ResultSection count={posts.length} title="Court Chatter">
            {posts.map((item) => (
              <PostResult item={item} key={item.post.id} />
            ))}
          </ResultSection>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
