import "../../worker-configuration.d.ts";
import type { createAuth } from "@rallycaststv/auth";

import type { AdEventMessage as AppAdEventMessage } from "./ads";
import type { EventActivityMessage } from "./event-activity";

type Auth = ReturnType<typeof createAuth>;
export type AuthSession = NonNullable<
  Awaited<ReturnType<Auth["api"]["getSession"]>>
>;

interface VectorizeBinding {
  deleteByIds?: (ids: string[]) => Promise<unknown>;
  query: (
    vector: number[],
    options: { topK: number }
  ) => Promise<{ matches: { id: string; score?: number }[] }>;
  upsert: (
    vectors: {
      id: string;
      metadata?: Record<string, unknown>;
      values: number[];
    }[]
  ) => Promise<unknown>;
}

export interface AppEnv {
  Bindings: WranglerEnv & {
    ADS_ANALYTICS?: AnalyticsEngineDataset;
    ADS_EVENTS?: Queue<AppAdEventMessage>;
    AI?: Ai;
    ALLOW_DEMO_ENDPOINTS?: string;
    BETTER_AUTH_SECRET: string;
    BETTER_AUTH_URL: string;
    CHAT_ROOMS: DurableObjectNamespace;
    CORS_ORIGIN?: string;
    EVENT_ACTIVITY_QUEUE?: Queue<EventActivityMessage>;
    EVENT_COORDINATOR: DurableObjectNamespace;
    E2E_SEED_TOKEN?: string;
    FIRECRAWL_API_KEY?: string;
    GITHUB_CLIENT_ID?: string;
    GITHUB_CLIENT_SECRET?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    GOOGLE_GENERATIVE_AI_API_KEY?: string;
    GOOGLE_PLACES_API_KEY?: string;
    MEDIA_BUCKET?: R2Bucket;
    MUX_SIGNING_KEY_ID?: string;
    MUX_SIGNING_KEY_SECRET?: string;
    MUX_TOKEN_ID?: string;
    MUX_TOKEN_SECRET?: string;
    MUX_WEBHOOK_SECRET?: string;
    R2_PUBLIC_URL?: string;
    RADAR_SECRET_KEY?: string;
    RATE_LIMITER?: RateLimit;
    RATE_LIMITER_STRICT?: RateLimit;
    RADAR_WEBHOOK_SECRET?: string;
    RESEND_API_KEY?: string;
    RESEND_WEBHOOK_SECRET?: string;
    SEARCH_INDEX?: VectorizeBinding;
    SENTRY_DSN?: string;
    STRIPE_SECRET_KEY?: string;
    STRIPE_WEBHOOK_SECRET?: string;
    USER_NOTIFICATIONS: DurableObjectNamespace;
    VENUE_PRESENCE: DurableObjectNamespace;
  };
  Variables: {
    authSession: AuthSession;
  };
}
