import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  client: {
    EXPO_PUBLIC_DEMO_DATA: z.optional(z.string()),
    EXPO_PUBLIC_EAS_PROJECT_ID: z.optional(z.string()),
    EXPO_PUBLIC_SERVER_URL: z.url(),
  },
  clientPrefix: "EXPO_PUBLIC_",
  emptyStringAsUndefined: true,
  runtimeEnv: process.env,
});
