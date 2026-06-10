import { env } from "@rallycaststv/env/web";
import { hc } from "hono/client";
import type { AppType } from "server";

export const apiClient = hc<AppType>(env.VITE_SERVER_URL, {
  fetch: (input, init) =>
    fetch(input, {
      ...init,
      credentials: "include",
    }),
});
