import { env } from "@rallycaststv/env/native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { apiClient } from "@/lib/api-client";

const PUSH_TOKEN_STORAGE_KEY = "rallycasts.expoPushToken";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const getProjectId = (): string | undefined =>
  env.EXPO_PUBLIC_EAS_PROJECT_ID ??
  (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)
    ?.projectId ??
  Constants.easConfig?.projectId;

const ensureAndroidChannel = async () => {
  if (Platform.OS !== "android") {
    return;
  }
  await Notifications.setNotificationChannelAsync("default", {
    importance: Notifications.AndroidImportance.MAX,
    lightColor: "#BCDF21",
    name: "RallyCasts",
    vibrationPattern: [0, 250, 250, 250],
  });
};

/**
 * Registers the device with Expo Push and stores the token on the signed-in
 * account. Registration is idempotent: the server moves a token between users
 * when the same device signs into a different account.
 */
export const registerForPushNotifications = async (): Promise<string | null> => {
  if (Platform.OS === "web") {
    return null;
  }
  const projectId = getProjectId();
  if (!projectId) {
    // Push is intentionally skipped until an EAS project ID is configured.
    return null;
  }

  await ensureAndroidChannel();
  const existingPermission = await Notifications.getPermissionsAsync();
  let permission = existingPermission.status;
  if (permission !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    permission = requested.status;
  }
  if (permission !== "granted") {
    return null;
  }

  try {
    const token = (
      await Notifications.getExpoPushTokenAsync({ projectId })
    ).data;
    await apiClient.api.v1.push.register.$post({
      json: {
        platform: Platform.OS === "ios" ? "ios" : "android",
        token,
      },
    });
    await SecureStore.setItemAsync(PUSH_TOKEN_STORAGE_KEY, token);
    return token;
  } catch {
    return null;
  }
};

export const unregisterPushNotifications = async (): Promise<void> => {
  if (Platform.OS === "web") {
    return;
  }
  const token = await SecureStore.getItemAsync(PUSH_TOKEN_STORAGE_KEY);
  if (!token) {
    return;
  }
  try {
    await apiClient.api.v1.push.unregister.$post({ json: { token } });
  } catch {
    // A stale token will be disabled by Expo receipt handling.
  }
  await SecureStore.deleteItemAsync(PUSH_TOKEN_STORAGE_KEY);
};
