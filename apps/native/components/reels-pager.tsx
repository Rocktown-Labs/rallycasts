import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useEffect, useRef, useState } from "react";
import { FlatList, Text, View } from "react-native";

import type { VideoData } from "@/lib/demo-data";

interface ReelsPagerProps {
  clips: VideoData[];
}

function muxStreamUrl(muxPlaybackId: string | null | undefined) {
  return muxPlaybackId
    ? `https://stream.mux.com/${muxPlaybackId}.m3u8`
    : null;
}

function ReelVideo({
  active,
  muxPlaybackId,
}: {
  active: boolean;
  muxPlaybackId: string | null | undefined;
}) {
  const url = muxStreamUrl(muxPlaybackId);
  const player = useVideoPlayer(url ?? "", (configuredPlayer) => {
    configuredPlayer.loop = true;
    configuredPlayer.muted = true;
  });
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const subscription = player.addListener("statusChange", (payload) => {
      if (payload.status === "error") {
        setFailed(true);
      }
    });

    return () => subscription.remove();
  }, [player]);

  useEffect(() => {
    if (active && !failed) {
      void player.play();
    } else {
      player.pause();
    }
  }, [active, failed, player]);

  if (!url || failed) {
    return null;
  }

  return <VideoView contentFit="cover" player={player} style={{ flex: 1 }} />;
}

function ReelItem({
  active,
  clip,
  height,
}: {
  active: boolean;
  clip: VideoData;
  height: number;
}) {
  const thumbnail =
    clip.thumbnailUrl ??
    (clip.muxPlaybackId
      ? `https://image.mux.com/${clip.muxPlaybackId}/thumbnail.webp?time=1`
      : null);

  return (
    <View className="overflow-hidden bg-black" style={{ height, width: "100%" }}>
      {thumbnail ? (
        <Image
          contentFit="cover"
          source={{ uri: thumbnail }}
          style={{
            bottom: 0,
            left: 0,
            position: "absolute",
            right: 0,
            top: 0,
          }}
          transition={200}
        />
      ) : (
        <View className="absolute inset-0 items-center justify-center bg-gradient-to-b from-[#005c23] to-black">
          <Ionicons name="flame" size={40} color="#bcdf21" />
        </View>
      )}

      <ReelVideo active={active} muxPlaybackId={clip.muxPlaybackId} />

      <View className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/60 to-transparent px-4 pb-20 pt-10">
        <Text className="text-xs font-semibold text-[#bcdf21]">
          {clip.owner?.name ?? "RallyCasts"}
        </Text>
        <Text className="mt-1 text-sm font-bold leading-tight text-white" numberOfLines={2}>
          {clip.title}
        </Text>
        {clip.viewsCount ? (
          <Text className="mt-1 text-[11px] text-white/70">
            {clip.viewsCount >= 1000
              ? `${(clip.viewsCount / 1000).toFixed(1)}k views`
              : `${clip.viewsCount} views`}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function ReelsPager({ clips }: ReelsPagerProps) {
  const [height, setHeight] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      const nextIndex = viewableItems[0]?.index ?? 0;
      if (nextIndex !== activeIndexRef.current) {
        activeIndexRef.current = nextIndex;
        setActiveIndex(nextIndex);
      }
    }
  ).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  return (
    <View
      className="flex-1"
      onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
    >
      {height > 0 ? (
        <FlatList
          contentContainerStyle={{ flexGrow: 1 }}
          data={clips}
          getItemLayout={(_, index) => ({
            index,
            length: height,
            offset: height * index,
          })}
          keyExtractor={(item) => item.id}
          onViewableItemsChanged={onViewableItemsChanged}
          pagingEnabled
          renderItem={({ index, item }) => (
            <ReelItem active={index === activeIndex} clip={item} height={height} />
          )}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          viewabilityConfig={viewabilityConfig}
        />
      ) : null}
    </View>
  );
}
