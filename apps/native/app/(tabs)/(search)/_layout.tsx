import { Stack } from "expo-router";
import React from "react";

export const unstable_settings = {
  initialRouteName: "search",
};

export default function SearchTabLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
