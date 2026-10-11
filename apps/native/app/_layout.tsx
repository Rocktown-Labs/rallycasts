import "@/polyfills";
import "@/global.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { HeroUINativeProvider, useThemeColor } from "heroui-native";
import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { AppThemeProvider } from "@/contexts/app-theme-context";
import { queryClient } from "@/lib/query-client";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

function StackLayout() {
  const bg = useThemeColor("background");
  const fg = useThemeColor("foreground");

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: bg,
        },
        headerTintColor: fg,
        headerTitleStyle: {
          fontWeight: "700",
        },
        contentStyle: {
          backgroundColor: bg,
        },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="account"
        options={{
          presentation: "modal",
          title: "My Account",
        }}
      />
      <Stack.Screen
        name="u/me"
        options={{
          title: "Player Dashboard",
        }}
      />
      <Stack.Screen
        name="u/organizer"
        options={{
          title: "Organizer Dashboard",
        }}
      />
      <Stack.Screen
        name="videos/[id]"
        options={{
          title: "Match Highlights",
        }}
      />
      <Stack.Screen
        name="players/[username]"
        options={{
          title: "Player Profile",
        }}
      />
      <Stack.Screen
        name="events/[id]"
        options={{
          title: "Tournament Details",
        }}
      />
      <Stack.Screen
        name="venues/[id]"
        options={{
          title: "Court Details",
        }}
      />
      <Stack.Screen
        name="modal"
        options={{ presentation: "modal", title: "Modal" }}
      />
      <Stack.Screen name="+not-found" options={{ title: "Not Found" }} />
    </Stack>
  );
}

export default function Layout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <QueryClientProvider client={queryClient}>
          <AppThemeProvider>
            <HeroUINativeProvider>
              <StackLayout />
            </HeroUINativeProvider>
          </AppThemeProvider>
        </QueryClientProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
