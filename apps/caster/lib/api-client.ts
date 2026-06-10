import { env } from "@rallycaststv/env/native";
import { hc } from "hono/client";
import type { AppType } from "server";

export const apiClient = hc<AppType>(env.EXPO_PUBLIC_SERVER_URL);
