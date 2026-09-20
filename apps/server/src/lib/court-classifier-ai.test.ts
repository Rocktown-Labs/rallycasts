import { describe, expect, it, vi } from "vitest";

import {
  analyzeVenueReviewsWithGemma,
  extractVenuesFromScrapedWebWithGemma,
  GEMMA_MODEL,
  parseGemmaJsonResponse,
} from "./court-classifier-ai";

describe("court-classifier-ai", () => {
  it("targets the @cf/google/gemma-4-26b-a4b-it model", () => {
    expect(GEMMA_MODEL).toBe("@cf/google/gemma-4-26b-a4b-it");
  });

  describe("parseGemmaJsonResponse", () => {
    it("parses clean JSON objects", () => {
      const result = parseGemmaJsonResponse<{ test: boolean }>(
        '{"test": true}'
      );
      expect(result).toEqual({ test: true });
    });

    it("strips markdown code blocks", () => {
      const result = parseGemmaJsonResponse<{ courts: number }>(
        '```json\n{"courts": 6}\n```'
      );
      expect(result).toEqual({ courts: 6 });
    });

    it("returns null for malformed text", () => {
      expect(parseGemmaJsonResponse("This is not JSON")).toBeNull();
      expect(parseGemmaJsonResponse(null)).toBeNull();
    });
  });

  describe("analyzeVenueReviewsWithGemma", () => {
    it("calls Gemma to classify reviews and extract court attributes", async () => {
      const mockAi = {
        run: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  confidence: 0.95,
                  courtCount: 6,
                  hasLights: true,
                  indoor: false,
                  isDualSport: false,
                  isPickleballVenue: true,
                  surface: "asphalt",
                }),
              },
            },
          ],
        }),
      } as unknown as Ai;

      const result = await analyzeVenueReviewsWithGemma(
        mockAi,
        "Berryhill Park",
        "Great pickleball courts with lights on until 10pm.",
        "Searcy, AR"
      );

      expect(result).toEqual({
        confidence: 0.95,
        courtCount: 6,
        hasLights: true,
        indoor: false,
        isDualSport: false,
        isPickleballVenue: true,
        surface: "asphalt",
      });

      expect(mockAi.run).toHaveBeenCalledWith(
        "@cf/google/gemma-4-26b-a4b-it",
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: "system" }),
            expect.objectContaining({
              content: expect.stringContaining("Berryhill Park"),
              role: "user",
            }),
          ]),
        })
      );
    });

    it("returns null when review text is empty", async () => {
      const mockAi = { run: vi.fn() } as unknown as Ai;
      const result = await analyzeVenueReviewsWithGemma(
        mockAi,
        "Berryhill Park",
        "   "
      );

      expect(result).toBeNull();
      expect(mockAi.run).not.toHaveBeenCalled();
    });
  });

  describe("extractVenuesFromScrapedWebWithGemma", () => {
    it("extracts verified venues from Firecrawl markdown results", async () => {
      const mockAi = {
        run: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  venues: [
                    {
                      address: "Berryhill Park Rd, Searcy, AR",
                      courtCount: 6,
                      hasLights: true,
                      indoor: false,
                      name: "Berryhill Park Pickleball Courts",
                      notes: "Dedicated outdoor courts with lights",
                    },
                  ],
                }),
              },
            },
          ],
        }),
      } as unknown as Ai;

      const scrapedPages = [
        {
          markdown:
            "# Searcy Parks & Rec\nBerryhill Park has 6 dedicated pickleball courts with LED lighting.",
          title: "Searcy Parks & Recreation",
          url: "https://searcy.com/parks",
        },
      ];

      const venues = await extractVenuesFromScrapedWebWithGemma(
        mockAi,
        "Searcy",
        "AR",
        scrapedPages
      );

      expect(venues).toHaveLength(1);
      expect(venues[0]?.name).toBe("Berryhill Park Pickleball Courts");
      expect(venues[0]?.courtCount).toBe(6);
      expect(venues[0]?.hasLights).toBe(true);

      expect(mockAi.run).toHaveBeenCalledWith(
        "@cf/google/gemma-4-26b-a4b-it",
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining("Searcy, AR"),
              role: "user",
            }),
          ]),
        })
      );
    });
  });
});
