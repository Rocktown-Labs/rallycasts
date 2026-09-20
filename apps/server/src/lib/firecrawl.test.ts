import { afterEach, describe, expect, it, vi } from "vitest";

import { createFirecrawlClient } from "./firecrawl";

describe("FirecrawlClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends a search and scrape request with markdown format by default", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        data: [
          {
            description: "City park with 6 dedicated pickleball courts",
            markdown: "# Berryhill Park\nFeatures 6 lighted pickleball courts.",
            title: "Berryhill Park Pickleball",
            url: "https://searcy.com/parks/berryhill",
          },
        ],
        success: true,
      })
    );

    const client = createFirecrawlClient("fc-test-key");
    const results = await client.searchAndScrape(
      "pickleball courts in Searcy, AR",
      {
        limit: 3,
      }
    );

    expect(results).toHaveLength(1);
    expect(results[0]?.title).toBe("Berryhill Park Pickleball");
    expect(results[0]?.markdown).toContain("6 lighted pickleball courts");

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.firecrawl.dev/v2/search",
      expect.objectContaining({
        body: JSON.stringify({
          limit: 3,
          query: "pickleball courts in Searcy, AR",
          scrapeOptions: {
            formats: ["markdown"],
          },
        }),
        headers: {
          Authorization: "Bearer fc-test-key",
          "Content-Type": "application/json",
        },
        method: "POST",
      })
    );
  });

  it("handles search when key is omitted using unauthenticated headers", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        data: {
          web: [
            {
              description: "Public recreation center",
              title: "Searcy Rec Center",
              url: "https://searcy.com/rec",
            },
          ],
        },
        success: true,
      })
    );

    const client = createFirecrawlClient();
    const results = await client.searchAndScrape("pickleball searcy");

    expect(results).toHaveLength(1);
    expect(results[0]?.title).toBe("Searcy Rec Center");
  });

  it("gracefully returns an empty list on HTTP error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Rate limit exceeded", { status: 429 })
    );

    const client = createFirecrawlClient("fc-test-key");
    const results = await client.searchAndScrape("pickleball");

    expect(results).toEqual([]);
  });

  it("gracefully returns an empty list on network exception", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new Error("Network connection dropped")
    );

    const client = createFirecrawlClient("fc-test-key");
    const results = await client.searchAndScrape("pickleball");

    expect(results).toEqual([]);
  });
});
