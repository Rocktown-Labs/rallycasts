import { env } from "@rallycaststv/env/native";

/**
 * Development-only augmentation (the mobile twin of the web app's
 * VITE_DEMO_DATA flag): when enabled, demo content is merged alongside real
 * API responses so the app can be designed and exercised against a full feed
 * while production data is still sparse. Real records always come first;
 * demo records only fill in. Release builds leave the flag unset.
 */
export const demoDataEnabled = env.EXPO_PUBLIC_DEMO_DATA === "true";

/**
 * Merge demo items after real ones, dropping demo entries whose id already
 * exists in the real list. Returns the real list untouched when the flag is
 * off or the real list is empty.
 */
export function withDemoItems<T extends { id: string }>(
  real: T[],
  demo: T[]
): T[] {
  if (!demoDataEnabled || real.length === 0) {
    return real;
  }
  const seen = new Set(real.map((item) => item.id));
  const fillers = demo.filter((item) => !seen.has(item.id));
  return [...real, ...fillers];
}
