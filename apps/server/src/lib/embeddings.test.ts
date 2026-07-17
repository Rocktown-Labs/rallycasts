import { afterEach, describe, expect, it, vi } from "vitest";

import { generateEmbedding } from "./embeddings";

describe("generateEmbedding", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses Gemini Embedding 2 with 768 dimensions when selected", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ embedding: { values: [0.1, 0.2, 0.3] } })
    );

    const result = await generateEmbedding(
      {
        GOOGLE_GENERATIVE_AI_API_KEY: "google-key",
        SEARCH_EMBEDDING_PROVIDER: "gemini",
      },
      "title: Berryhill Park | text: pickleball courts in Searcy",
      "document"
    );

    expect(result).toEqual({
      model: "gemini-embedding-2:768",
      values: [0.1, 0.2, 0.3],
    });
    expect(fetch).toHaveBeenCalledWith(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent",
      expect.objectContaining({
        body: JSON.stringify({
          content: {
            parts: [
              {
                text: "title: Berryhill Park | text: pickleball courts in Searcy",
              },
            ],
          },
          output_dimensionality: 768,
        }),
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": "google-key",
        },
        method: "POST",
      })
    );
  });

  it("falls back to Workers AI when Gemini is not selected", async () => {
    const result = await generateEmbedding(
      {
        AI: {
          run: () => Promise.resolve({ data: [[0.4, 0.5]] }),
        },
        GOOGLE_GENERATIVE_AI_API_KEY: "google-key",
      },
      "advanced doubles strategy",
      "query"
    );

    expect(result).toEqual({
      model: "@cf/baai/bge-base-en-v1.5",
      values: [0.4, 0.5],
    });
  });
});
