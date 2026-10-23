import { Stack } from "expo-router";
import React from "react";

export const unstable_settings = {
  initialRouteName: "trending",
};

export default function TrendingTabLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
