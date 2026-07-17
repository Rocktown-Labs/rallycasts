import { afterEach, describe, expect, it, vi } from "vitest";

import { generateEmbedding } from "./embeddings";

describe("generateEmbedding", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses Gemini Embedding 2 with 768 dimensions", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ embedding: { values: [0.1, 0.2, 0.3] } })
    );

    const result = await generateEmbedding(
      {
        GOOGLE_GENERATIVE_AI_API_KEY: "google-key",
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

  it("returns null when the Gemini API key is missing", async () => {
    const result = await generateEmbedding(
      {},
      "advanced doubles strategy",
      "query"
    );

    expect(result).toBeNull();
  });
});
