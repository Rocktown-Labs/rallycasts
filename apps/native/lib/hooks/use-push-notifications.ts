import { useQueryClient } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect } from "react";

import { authClient } from "@/lib/auth-client";
import {
  registerForPushNotifications,
  unregisterPushNotifications,
} from "@/lib/push-notifications";

const WEB_ORIGIN = "https://rallycasts.com";

const exactNativeRoutes = new Set([
  "/account",
  "/casters",
  "/notifications",
  "/u/me",
  "/u/organizer",
  "/you",
]);

const nativeDetailPatterns = [
  /^\/comments\/[^/]+$/u,
  /^\/events\/[^/]+$/u,
  /^\/live\/[^/]+$/u,
  /^\/messages\/[^/]+$/u,
  /^\/players\/[^/]+$/u,
  /^\/venues\/[^/]+$/u,
  /^\/videos\/[^/]+$/u,
];

const openNotificationHref = (
  href: string,
  push: ReturnType<typeof useRouter>["push"]
) => {
  const isNativeRoute =
    exactNativeRoutes.has(href) ||
    nativeDetailPatterns.some((pattern) => pattern.test(href));
  if (isNativeRoute) {
    push(href as never);
    return;
  }
  void Linking.openURL(`${WEB_ORIGIN}${href}`);
};

/**
 * Wires Expo push registration to the auth session and routes notification
 * taps into the app. Mount once, inside the root layout.
 */
export const usePushNotifications = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const userId = session?.user?.id;

  useEffect(() => {
    if (isPending) {
      return;
    }
    if (userId) {
      void registerForPushNotifications();
    } else {
      void unregisterPushNotifications();
    }
  }, [isPending, userId]);

  useEffect(() => {
    const received = Notifications.addNotificationReceivedListener(() => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    });
    const response = Notifications.addNotificationResponseReceivedListener(
      (event) => {
        const href = event.notification.request.content.data?.href;
        if (typeof href === "string" && href.startsWith("/")) {
          openNotificationHref(href, router.push);
        }
        void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      }
    );

    return () => {
      received.remove();
      response.remove();
    };
  }, [queryClient, router.push]);
};
