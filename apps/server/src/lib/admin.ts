import type { createDb } from "@rallycaststv/db";
import { userProfile } from "@rallycaststv/db/schema/domain";
import { eq } from "drizzle-orm";

import type { AppEnv } from "./types";

export const isPlatformAdminUser = async (
  db: ReturnType<typeof createDb>,
  userId: string
): Promise<boolean> => {
  const [profile] = await db
    .select({ platformRole: userProfile.platformRole })
    .from(userProfile)
    .where(eq(userProfile.userId, userId))
    .limit(1);

  return profile?.platformRole === "admin";
};

export const isConfiguredOrigin = (
  origin: string | undefined,
  env: AppEnv["Bindings"]
) => {
  if (!origin) {
    return false;
  }

  const configuredOrigins = (env.CORS_ORIGIN ?? "")
    .split(",")
    .map((value: string) => value.trim())
    .filter(Boolean);

  return (
    configuredOrigins.includes(origin) ||
    origin === "rallycaststv://" ||
    origin.startsWith("exp://")
  );
};
