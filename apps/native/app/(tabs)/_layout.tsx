import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Tabs } from "expo-router";
import { useThemeColor } from "heroui-native";
import React from "react";
import { Platform } from "react-native";

export default function TabLayout() {
  const foreground = useThemeColor("foreground");
  const background = useThemeColor("background");
  const muted = useThemeColor("muted");
  const border = useThemeColor("border");

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: "none",
        tabBarActiveTintColor: "#bcdf21",
        tabBarInactiveTintColor: muted,
        tabBarStyle: {
          backgroundColor: background,
          borderTopColor: border,
          borderTopWidth: 0.5,
          paddingTop: 6,
          height: Platform.OS === "ios" ? 88 : 64,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginBottom: Platform.OS === "ios" ? 0 : 6,
        },
      }}
      screenListeners={{
        tabPress: () => {
          if (Platform.OS === "ios") {
            Haptics.selectionAsync();
          }
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="trending"
        options={{
          title: "Trending",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "flame" : "flame-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="players"
        options={{
          title: "Players",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "people" : "people-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: "Events",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "calendar" : "calendar-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="you"
        options={{
          title: "You",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
