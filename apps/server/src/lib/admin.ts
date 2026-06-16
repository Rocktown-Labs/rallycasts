import type { AppEnv } from "./types";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const splitEmails = (value: string | undefined) =>
  (value ?? "").split(",").map(normalizeEmail).filter(Boolean);

export const getAdminEmails = (env: AppEnv["Bindings"]) =>
  new Set([
    ...splitEmails(env.ADMIN_EMAILS),
    ...splitEmails(env.RALLYCASTS_ADMIN_EMAIL),
  ]);

export const isPlatformAdminEmail = (
  email: string | null | undefined,
  env: AppEnv["Bindings"]
) => (email ? getAdminEmails(env).has(normalizeEmail(email)) : false);
