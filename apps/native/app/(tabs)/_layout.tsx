import * as Haptics from "expo-haptics";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import React from "react";
import { Platform } from "react-native";

import { useAppTheme } from "@/contexts/app-theme-context";

export default function TabLayout() {
  const { isDark } = useAppTheme();

  return (
    <NativeTabs
      blurEffect={
        isDark ? "systemUltraThinMaterialDark" : "systemUltraThinMaterialLight"
      }
      screenListeners={{
        tabPress: () => {
          if (Platform.OS === "ios") {
            Haptics.selectionAsync();
          }
        },
      }}
      tintColor="#bcdf21"
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          md="home"
          sf={{ default: "house", selected: "house.fill" }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="trending">
        <NativeTabs.Trigger.Label>Trending</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          md="local_fire_department"
          sf={{ default: "flame", selected: "flame.fill" }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="events">
        <NativeTabs.Trigger.Label>Events</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="calendar_month" sf="calendar" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="messages">
        <NativeTabs.Trigger.Label>Messages</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          md="chat_bubble"
          sf={{ default: "message", selected: "message.fill" }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="search">
        <NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="search" sf="magnifyingglass" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
