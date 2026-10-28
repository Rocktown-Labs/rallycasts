import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import * as WebBrowser from "expo-web-browser";

import { authClient } from "@/lib/auth-client";
import {
  registerForPushNotifications,
  unregisterPushNotifications,
} from "@/lib/push-notifications";

const WEB_ORIGIN = "https://rallycasts.com";

export const usePushNotifications = () => {
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
    const response = Notifications.addNotificationResponseReceivedListener(
      (event) => {
        const href = event.notification.request.content.data?.href;
        if (typeof href === "string" && href.startsWith("/")) {
          void WebBrowser.openBrowserAsync(`${WEB_ORIGIN}${href}`);
        }
      }
    );
    return () => response.remove();
  }, []);
};
