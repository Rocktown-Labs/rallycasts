import type { createDb } from "@rallycaststv/db";
import { user as authUser } from "@rallycaststv/db/schema/auth";
import { userProfile } from "@rallycaststv/db/schema/domain";
import { eq } from "drizzle-orm";

import type { AppEnv } from "./types";

/** True for local development (localhost API URL or localhost CORS origins). */
export const isLocalEnv = (env: AppEnv["Bindings"]) => {
  const authUrl = env.BETTER_AUTH_URL ?? "";
  if (authUrl.includes("localhost") || authUrl.includes("127.0.0.1")) {
    return true;
  }
  return (env.CORS_ORIGIN ?? "")
    .split(",")
    .some(
      (origin) => origin.includes("localhost") || origin.includes("127.0.0.1")
    );
};

export const isPlatformAdminUser = async (
  db: ReturnType<typeof createDb>,
  userId: string
): Promise<boolean> => {
  const [profile] = await db
    .select({ platformRole: userProfile.platformRole })
    .from(userProfile)
    .where(eq(userProfile.userId, userId))
    .limit(1);
  if (profile?.platformRole === "admin") {
    return true;
  }
  // better-auth admin plugin role (auto-granted from ADMIN_EMAILS).
  const [record] = await db
    .select({ role: authUser.role })
    .from(authUser)
    .where(eq(authUser.id, userId))
    .limit(1);
  return record?.role === "admin";
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

  // The Expo dev scheme is only trusted for local development; production
  // clients use the pinned rallycaststv:// scheme or send no Origin at all.
  if (origin.startsWith("exp://") && !isLocalEnv(env)) {
    return false;
  }

  return (
    configuredOrigins.includes(origin) ||
    origin === "rallycaststv://" ||
    origin.startsWith("exp://")
  );
};
