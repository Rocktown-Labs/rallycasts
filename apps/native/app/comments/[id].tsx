import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/header";
import { authClient } from "@/lib/auth-client";
import { useAddComment, useComments, type PostComment } from "@/lib/hooks";

function formatCommentTime(value?: string | number | null) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function CommentRow({ item }: { item: PostComment }) {
  const { author, comment } = item;
  const initial = author.name.charAt(0).toUpperCase();

  return (
    <View className="flex-row gap-3 px-4 py-3">
      {author.image ? (
        <Image
          contentFit="cover"
          source={{ uri: author.image }}
          style={{ borderRadius: 16, height: 32, width: 32 }}
        />
      ) : (
        <View className="size-8 items-center justify-center rounded-full bg-[#005c23]/20">
          <Text className="text-xs font-bold text-[#005c23] dark:text-[#bcdf21]">
            {initial}
          </Text>
        </View>
      )}

      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-xs font-bold text-foreground" numberOfLines={1}>
            {author.name}
          </Text>
          {comment.createdAt ? (
            <Text className="text-[10px] text-muted">
              {formatCommentTime(comment.createdAt)}
            </Text>
          ) : null}
        </View>
        <Text className="mt-1 text-sm leading-relaxed text-foreground">
          {comment.content}
        </Text>
      </View>
    </View>
  );
}

export default function CommentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const postId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const { data: session } = authClient.useSession();
  const isSignedIn = Boolean(session?.user);
  const { data, isLoading } = useComments(postId);
  const addComment = useAddComment(postId);

  const comments = data?.comments ?? [];

  const handleSend = () => {
    const content = draft.trim();
    if (!content || addComment.isPending) {
      return;
    }
    setDraft("");
    addComment.mutate({ content }, { onError: () => setDraft(content) });
  };

  return (
    <SafeAreaView
      className="flex-1 bg-background"
      edges={["top", "bottom"]}
      style={{ flex: 1 }}
    >
      <ScreenHeader showBack subtitle="Join the court chatter" title="Comments" />

      <KeyboardAvoidingView style={{ flex: 1 }}>
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#bcdf21" />
          </View>
        ) : (
          <FlatList
            contentContainerStyle={{ paddingBottom: 8 }}
            data={comments}
            keyExtractor={(item) => item.comment.id}
            ListEmptyComponent={
              <View className="items-center px-8 py-10">
                <View className="size-12 items-center justify-center rounded-full bg-surface-secondary">
                  <Ionicons
                    name="chatbubble-outline"
                    size={22}
                    className="text-muted"
                  />
                </View>
                <Text className="mt-3 text-sm font-bold text-foreground">
                  No comments yet
                </Text>
                <Text className="mt-1 text-center text-xs text-muted">
                  Be the first to weigh in on this post.
                </Text>
              </View>
            }
            renderItem={({ item }) => <CommentRow item={item} />}
            showsVerticalScrollIndicator={false}
          />
        )}

        <View className="border-t border-border/40 px-4 py-3">
          {isSignedIn ? (
            <View className="flex-row items-center gap-2">
              <TextInput
                autoCapitalize="sentences"
                className="flex-1 rounded-2xl border border-border/60 bg-surface px-3.5 py-2.5 text-sm text-foreground"
                onChangeText={setDraft}
                onSubmitEditing={handleSend}
                placeholder="Add a comment..."
                placeholderTextColor="#888888"
                returnKeyType="send"
                value={draft}
              />
              <Pressable
                accessibilityLabel="Post comment"
                accessibilityRole="button"
                disabled={!draft.trim() || addComment.isPending}
                onPress={handleSend}
                className="size-10 items-center justify-center rounded-full bg-[#005c23] disabled:opacity-40"
              >
                {addComment.isPending ? (
                  <ActivityIndicator color="#bcdf21" />
                ) : (
                  <Ionicons name="arrow-up" size={18} color="#bcdf21" />
                )}
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/you")}
              className="flex-row items-center justify-center gap-2 rounded-2xl border border-border/60 bg-surface px-3.5 py-3 active:opacity-80"
            >
              <Ionicons name="person-outline" size={15} className="text-muted" />
              <Text className="text-xs font-semibold text-foreground">
                Sign in to leave a comment
              </Text>
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
