import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  client: {
    VITE_RADAR_PUBLISHABLE_KEY: z.string().optional(),
    VITE_SERVER_URL: z.url(),
  },
  clientPrefix: "VITE_",
  emptyStringAsUndefined: true,
  runtimeEnv: (
    import.meta as ImportMeta & {
      env: Record<string, string | undefined>;
    }
  ).env,
});
