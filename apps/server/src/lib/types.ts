import type { createAuth } from "@rallycaststv/auth";

import type { EventActivityMessage } from "./event-activity";

type Auth = ReturnType<typeof createAuth>;
export type AuthSession = NonNullable<
  Awaited<ReturnType<Auth["api"]["getSession"]>>
>;

interface EmbeddingResponse {
  data?: number[][];
}

interface WorkersAiBinding {
  run: (
    model: "@cf/baai/bge-base-en-v1.5",
    input: { text: string[] }
  ) => Promise<EmbeddingResponse>;
}

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
  Bindings: Env & {
    ADMIN_EMAILS?: string;
    AI?: WorkersAiBinding;
    EVENT_ACTIVITY_QUEUE?: Queue<EventActivityMessage>;
    EVENT_COORDINATOR: DurableObjectNamespace;
    GOOGLE_GENERATIVE_AI_API_KEY?: string;
    MUX_WEBHOOK_SECRET?: string;
    RALLYCASTS_ADMIN_EMAIL?: string;
    SEARCH_INDEX?: VectorizeBinding;
    SEARCH_EMBEDDING_PROVIDER?: "gemini" | "workers-ai";
    STRIPE_SECRET_KEY?: string;
    STRIPE_WEBHOOK_SECRET?: string;
    VENUE_PRESENCE: DurableObjectNamespace;
  };
  Variables: {
    authSession: AuthSession;
  };
}
