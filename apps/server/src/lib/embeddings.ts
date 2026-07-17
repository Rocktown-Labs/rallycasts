import type { AppEnv } from "./types";

const GEMINI_EMBEDDING_MODEL = "gemini-embedding-2" as const;
const GEMINI_EMBEDDING_DIMENSIONS = 768;
const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

type EmbeddingBindings = Pick<
  AppEnv["Bindings"],
  "GOOGLE_GENERATIVE_AI_API_KEY"
>;

export type EmbeddingPurpose = "document" | "query";

export interface EmbeddingResult {
  model: string;
  values: number[];
}

export const formatSearchDocumentInput = (title: string, content: string) =>
  `title: ${title || "none"} | text: ${content}`;

export const formatSearchQueryInput = (query: string) =>
  `task: search result | query: ${query}`;

export const generateEmbedding = async (
  env: EmbeddingBindings,
  input: string,
  purpose: EmbeddingPurpose
): Promise<EmbeddingResult | null> => {
  if (!env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return null;
  }

  const values = await generateGeminiEmbedding(
    env.GOOGLE_GENERATIVE_AI_API_KEY,
    purpose === "query" ? formatSearchQueryInput(input) : input
  );

  return values
    ? {
        model: `${GEMINI_EMBEDDING_MODEL}:${GEMINI_EMBEDDING_DIMENSIONS}`,
        values,
      }
    : null;
};

const generateGeminiEmbedding = async (
  apiKey: string,
  input: string
): Promise<number[] | null> => {
  const response = await fetch(
    `${GEMINI_API_BASE_URL}/models/${GEMINI_EMBEDDING_MODEL}:embedContent`,
    {
      body: JSON.stringify({
        content: {
          parts: [{ text: input }],
        },
        output_dimensionality: GEMINI_EMBEDDING_DIMENSIONS,
      }),
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      method: "POST",
    }
  );

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    embedding?: { values?: number[] };
    embeddings?: { values?: number[] }[];
  };

  return payload.embedding?.values ?? payload.embeddings?.[0]?.values ?? null;
};
