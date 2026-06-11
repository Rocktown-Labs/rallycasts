import type { createAuth } from "@rallycaststv/auth";

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
    AI?: WorkersAiBinding;
    SEARCH_INDEX?: VectorizeBinding;
    VENUE_PRESENCE: DurableObjectNamespace;
  };
  Variables: {
    authSession: AuthSession;
  };
}
