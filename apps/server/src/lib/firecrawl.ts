export interface FirecrawlSearchResult {
  description?: string;
  markdown?: string;
  metadata?: {
    description?: string;
    sourceURL?: string;
    statusCode?: number;
    title?: string;
  };
  title?: string;
  url: string;
}

export interface FirecrawlSearchOptions {
  categories?: ("research" | "pdf" | "developer")[];
  excludeDomains?: string[];
  includeDomains?: string[];
  limit?: number;
  scrapeFormats?: ("markdown" | "links" | "html")[];
}

interface FirecrawlSearchApiResponse {
  data?:
    | FirecrawlSearchResult[]
    | {
        images?: unknown[];
        news?: unknown[];
        web?: FirecrawlSearchResult[];
      };
  error?: string;
  success?: boolean;
}

const buildSearchPayload = (
  query: string,
  options?: FirecrawlSearchOptions
): Record<string, unknown> => {
  const payload: Record<string, unknown> = {
    limit: options?.limit ?? 5,
    query,
    scrapeOptions: {
      formats: options?.scrapeFormats ?? ["markdown"],
    },
  };

  if (options?.includeDomains && options.includeDomains.length > 0) {
    payload.includeDomains = options.includeDomains;
  } else if (options?.excludeDomains && options.excludeDomains.length > 0) {
    payload.excludeDomains = options.excludeDomains;
  }

  if (options?.categories && options.categories.length > 0) {
    payload.categories = options.categories;
  }

  return payload;
};

const extractSearchData = (
  json: FirecrawlSearchApiResponse
): FirecrawlSearchResult[] => {
  if (Array.isArray(json.data)) {
    return json.data;
  }

  if (json.data?.web && Array.isArray(json.data.web)) {
    return json.data.web;
  }

  return [];
};

export class FirecrawlClient {
  private readonly apiKey?: string;
  private readonly baseUrl: string;

  constructor(apiKey?: string, baseUrl = "https://api.firecrawl.dev") {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async searchAndScrape(
    query: string,
    options?: FirecrawlSearchOptions
  ): Promise<FirecrawlSearchResult[]> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    const payload = buildSearchPayload(query, options);

    try {
      const response = await fetch(`${this.baseUrl}/v2/search`, {
        body: JSON.stringify(payload),
        headers,
        method: "POST",
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        console.warn(
          `Firecrawl search request failed [status ${response.status}]: ${errorText}`
        );
        return [];
      }

      const json = (await response.json()) as FirecrawlSearchApiResponse;

      if (!json.success && json.error) {
        console.warn(`Firecrawl API returned error: ${json.error}`);
        return [];
      }

      return extractSearchData(json);
    } catch (error) {
      console.warn("Firecrawl search network failure:", error);
      return [];
    }
  }
}

export const createFirecrawlClient = (apiKey?: string) =>
  new FirecrawlClient(apiKey);
