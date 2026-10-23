import "@/polyfills";
import "@/global.css";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import { HeroUINativeProvider, useThemeColor } from "heroui-native";
import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

import {
  AppThemeProvider,
  useAppTheme,
} from "@/contexts/app-theme-context";
import { queryClient } from "@/lib/query-client";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

function NavigationTheme({ children }: { children: React.ReactNode }) {
  const { isDark } = useAppTheme();
  const background = useThemeColor("background");
  const foreground = useThemeColor("foreground");
  const border = useThemeColor("border");
  const primary = useThemeColor("accent");
  const baseTheme = isDark ? DarkTheme : DefaultTheme;

  const theme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      background,
      border,
      card: background,
      primary,
      text: foreground,
    },
  };

  return (
    <ThemeProvider value={theme}>
      <StatusBar style={isDark ? "light" : "dark"} />
      {children}
    </ThemeProvider>
  );
}

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
        name="notifications"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="casters"
        options={{
          headerShown: false,
        }}
      />
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
        name="sign-in"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="sign-up"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="you"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="messages/[id]"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="comments/[id]"
        options={{
          headerShown: false,
          presentation: "formSheet",
          sheetAllowedDetents: [0.5, 1.0],
          sheetGrabberVisible: true,
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
              <NavigationTheme>
                <StackLayout />
              </NavigationTheme>
            </HeroUINativeProvider>
          </AppThemeProvider>
        </QueryClientProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
