import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import { FlatList, Platform, Pressable, Text, View } from "react-native";

import type { PostData } from "@/lib/demo-data";

interface SocialFeedPagerProps {
  posts: PostData[];
}

function SocialFeedCard({ post }: { post: PostData }) {
  const router = useRouter();
  const initial = post.author.name.charAt(0).toUpperCase();

  return (
    <View className="flex-1 justify-center px-6">
      <View className="flex-row items-center gap-3">
        {post.author.image ? (
          <Image
            contentFit="cover"
            source={{ uri: post.author.image }}
            style={{ borderRadius: 22, height: 44, width: 44 }}
          />
        ) : (
          <View className="size-11 items-center justify-center rounded-full bg-[#005c23]/25">
            <Text className="text-sm font-bold text-[#005c23] dark:text-[#bcdf21]">
              {initial}
            </Text>
          </View>
        )}

        <View className="flex-1">
          <Text className="text-base font-bold text-foreground">
            {post.author.name}
          </Text>
          <Text className="text-xs text-muted">
            @{post.author.username ?? post.author.displayUsername ?? "player"}
          </Text>
        </View>
      </View>

      <Text className="mt-6 text-xl leading-relaxed font-medium text-foreground">
        {post.content}
      </Text>

      <Text className="mt-3 text-[11px] text-muted">{post.createdAt}</Text>

      <Pressable
        accessibilityRole="button"
        onPress={() => {
          if (Platform.OS === "ios") {
            Haptics.selectionAsync();
          }
          router.push(`/comments/${post.id}`);
        }}
        className="mt-6 flex-row items-center gap-2 self-start rounded-full border border-border/60 bg-surface px-4 py-2.5 active:opacity-80"
      >
        <Ionicons name="chatbubble-outline" size={15} color="#bcdf21" />
        <Text className="text-xs font-semibold text-foreground">Comments</Text>
      </Pressable>
    </View>
  );
}

export function SocialFeedPager({ posts }: SocialFeedPagerProps) {
  const [height, setHeight] = useState(0);

  return (
    <View
      className="flex-1"
      onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
    >
      {height > 0 ? (
        <FlatList
          contentContainerStyle={{ flexGrow: 1 }}
          data={posts}
          getItemLayout={(_, index) => ({
            index,
            length: height,
            offset: height * index,
          })}
          keyExtractor={(item) => item.id}
          pagingEnabled
          renderItem={({ item }) => (
            <View style={{ height, width: "100%" }}>
              <SocialFeedCard post={item} />
            </View>
          )}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
        />
      ) : null}
    </View>
  );
}
