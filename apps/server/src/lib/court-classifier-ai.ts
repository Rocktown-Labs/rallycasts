import type { FirecrawlSearchResult } from "./firecrawl";

export const GEMMA_MODEL = "@cf/google/gemma-4-26b-a4b-it" as const;

export interface CourtReviewAnalysis {
  confidence: number;
  courtCount: number | null;
  hasLights: boolean | null;
  indoor: boolean | null;
  isDualSport: boolean;
  isPickleballVenue: boolean;
  surface: "asphalt" | "concrete" | "sport_court" | "other" | null;
}

export interface ExtractedWebCourt {
  address?: string;
  courtCount?: number | null;
  hasLights?: boolean | null;
  indoor?: boolean | null;
  name: string;
  notes?: string;
}

export function parseGemmaJsonResponse<T>(
  rawText: string | null | undefined
): T | null {
  if (!rawText) {
    return null;
  }

  const cleaned = rawText
    .replace(/^```(?:json)?\s*/iu, "")
    .replace(/\s*```$/u, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/u);
    if (jsonMatch?.[0]) {
      try {
        return JSON.parse(jsonMatch[0]) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function analyzeVenueReviewsWithGemma(
  ai: Ai,
  venueName: string,
  reviewsText: string,
  address?: string
): Promise<CourtReviewAnalysis | null> {
  if (!reviewsText.trim()) {
    return null;
  }

  const prompt = `Venue Name: "${venueName}"
Address: "${address || "Unknown"}"

Reviews and Description:
"${reviewsText.slice(0, 4000)}"

Analyze whether this venue provides pickleball courts and extract facility details.
Return a JSON object with this exact structure:
{
  "isPickleballVenue": boolean,
  "isDualSport": boolean,
  "courtCount": number | null,
  "hasLights": boolean | null,
  "indoor": boolean | null,
  "surface": "asphalt" | "concrete" | "sport_court" | "other" | null,
  "confidence": number
}`;

  try {
    const response = (await ai.run(GEMMA_MODEL, {
      messages: [
        {
          content:
            "You are an expert sports venue analyzer. You verify pickleball facilities and extract court attributes. Respond only with valid JSON.",
          role: "system",
        },
        {
          content: prompt,
          role: "user",
        },
      ],
    })) as {
      choices?: { message?: { content?: string } }[];
      response?: string;
    };

    const content =
      response.choices?.[0]?.message?.content ?? response.response;
    return parseGemmaJsonResponse<CourtReviewAnalysis>(content);
  } catch (error) {
    console.warn("Gemma review analysis error:", error);
    return null;
  }
}

export async function extractVenuesFromScrapedWebWithGemma(
  ai: Ai,
  city: string,
  state: string | undefined,
  scrapedPages: FirecrawlSearchResult[]
): Promise<ExtractedWebCourt[]> {
  const combinedMarkdown = scrapedPages
    .filter((page) => Boolean(page.markdown))
    .map(
      (page) =>
        `### Source: ${page.title || page.url}\n${(page.markdown || "").slice(0, 3000)}`
    )
    .join("\n\n")
    .slice(0, 12_000);

  if (!combinedMarkdown.trim()) {
    return [];
  }

  const prompt = `Target Location: ${city}${state ? `, ${state}` : ""}

Web Content from Municipal / Recreation Pages:
${combinedMarkdown}

Extract all distinct pickleball courts or parks in or near ${city} mentioned in this content.
Return a JSON object with this exact structure:
{
  "venues": [
    {
      "name": "Venue Name",
      "address": "Street address if found, otherwise omit",
      "courtCount": number | null,
      "hasLights": boolean | null,
      "indoor": boolean | null,
      "notes": "Short snippet about court lines, drop-in play, or surface"
    }
  ]
}`;

  try {
    const response = (await ai.run(GEMMA_MODEL, {
      messages: [
        {
          content:
            "You are a sports facility data extraction specialist. Extract verified pickleball facilities from municipal markdown. Respond only with valid JSON.",
          role: "system",
        },
        {
          content: prompt,
          role: "user",
        },
      ],
    })) as {
      choices?: { message?: { content?: string } }[];
      response?: string;
    };

    const content =
      response.choices?.[0]?.message?.content ?? response.response;
    const parsed = parseGemmaJsonResponse<{ venues: ExtractedWebCourt[] }>(
      content
    );

    return parsed?.venues ?? [];
  } catch (error) {
    console.warn("Gemma web extraction error:", error);
    return [];
  }
}
