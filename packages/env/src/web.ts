import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const viteEnv = (
  import.meta as ImportMeta & {
    env: Record<string, string | boolean | undefined>;
  }
).env;

const defaultServerUrl =
  viteEnv.DEV === true ? "http://localhost:3000" : "https://api.rallycasts.com";

export const env = createEnv({
  client: {
    VITE_FOURTHWALL_STOREFRONT_TOKEN: z.string().optional(),
    VITE_FOURTHWALL_STOREFRONT_URL: z.url().optional(),
    VITE_RADAR_PUBLISHABLE_KEY: z.string().optional(),
    VITE_SENTRY_DSN: z.string().optional(),
    VITE_SERVER_URL: z.url(),
  },
  clientPrefix: "VITE_",
  emptyStringAsUndefined: true,
  runtimeEnv: {
    ...viteEnv,
    VITE_SERVER_URL:
      typeof viteEnv.VITE_SERVER_URL === "string"
        ? viteEnv.VITE_SERVER_URL
        : defaultServerUrl,
  },
});
