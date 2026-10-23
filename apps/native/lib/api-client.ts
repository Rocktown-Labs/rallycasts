import { env } from "@rallycaststv/env/native";
import { hc } from "hono/client";
import type { AppType } from "server";

import { authClient } from "@/lib/auth-client";

/**
 * React Native keeps its own native cookie jar, which can drift from the
 * SecureStore-managed session cookies that the better-auth expo client owns.
 * Send the stored session cookies explicitly and keep the native jar out of
 * it, per the better-auth Expo integration guide.
 */
const fetchWithSessionCookies: typeof fetch = async (input, init) => {
  const headers = new Headers(init?.headers);
  const cookies = authClient.getCookie();
  if (cookies) {
    headers.set("cookie", cookies);
  }
  return fetch(input, { ...init, credentials: "omit", headers });
};

export const apiClient = hc<AppType>(env.EXPO_PUBLIC_SERVER_URL, {
  fetch: fetchWithSessionCookies,
});
