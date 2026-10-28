import { env } from "@rallycaststv/env/native";
import { hc } from "hono/client";
import type { AppType } from "server";

import { authClient } from "@/lib/auth-client";

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
