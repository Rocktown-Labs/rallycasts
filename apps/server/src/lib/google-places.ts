import { env } from "cloudflare:workers";

export interface GooglePlaceResult {
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  photoUrl?: string;
  rating?: number;
  userRatingsTotal?: number;
  types: string[];
  openNow?: boolean;
}

export interface GooglePlaceSearchResponse {
  places?: GooglePlace[];
  nextPageToken?: string;
}

export interface GooglePlace {
  id: string;
  displayName?: {
    text?: string;
  };
  formattedAddress?: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
  photos?: {
    name: string;
    heightPx?: number;
    widthPx?: number;
  }[];
  rating?: number;
  regularOpeningHours?: {
    openNow?: boolean;
  };
  types?: string[];
  userRatingCount?: number;
}

const GOOGLE_PLACES_BASE_URL = "https://places.googleapis.com/v1";
const SEARCH_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.photos",
  "places.rating",
  "places.regularOpeningHours",
  "places.types",
  "places.userRatingCount",
].join(",");
const DETAILS_FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "photos",
  "rating",
  "regularOpeningHours",
  "types",
  "userRatingCount",
].join(",");
const EVENT_LOCATION_TYPES = [
  "athletic_field",
  "fitness_center",
  "park",
  "sports_activity_location",
  "sports_club",
  "sports_complex",
  "sports_school",
] as const;

export class GooglePlacesClient {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey =
      apiKey ||
      (env as { GOOGLE_PLACES_API_KEY?: string }).GOOGLE_PLACES_API_KEY ||
      "";
  }

  async searchNearby(
    latitude: number,
    longitude: number,
    radius = 50_000,
    keyword = "pickleball"
  ): Promise<GooglePlaceResult[]> {
    if (keyword !== "pickleball") {
      return this.searchText(keyword, latitude, longitude);
    }

    const data = await this.postSearch(
      "/places:searchNearby",
      SEARCH_FIELD_MASK,
      {
        includedTypes: [...EVENT_LOCATION_TYPES],
        locationRestriction: {
          circle: {
            center: { latitude, longitude },
            radius,
          },
        },
        maxResultCount: 12,
        rankPreference: "POPULARITY",
      }
    );

    return (data.places ?? []).map((place) => this.mapPlaceResult(place));
  }

  async searchText(
    query: string,
    latitude?: number,
    longitude?: number
  ): Promise<GooglePlaceResult[]> {
    const body: Record<string, unknown> = {
      maxResultCount: 8,
      textQuery: query,
    };

    if (latitude !== undefined && longitude !== undefined) {
      body.locationBias = {
        circle: {
          center: { latitude, longitude },
          radius: 50_000,
        },
      };
    }

    const data = await this.postSearch(
      "/places:searchText",
      SEARCH_FIELD_MASK,
      body
    );

    return (data.places ?? []).map((place) => this.mapPlaceResult(place));
  }

  async getPlaceDetails(placeId: string): Promise<GooglePlaceResult> {
    const url = new URL(
      `${GOOGLE_PLACES_BASE_URL}/places/${encodeURIComponent(placeId)}`
    );

    const response = await fetch(url.toString(), {
      headers: this.createHeaders(DETAILS_FIELD_MASK),
    });

    await GooglePlacesClient.ensureOk(response);
    const data = (await response.json()) as GooglePlace;

    return this.mapPlaceResult(data);
  }

  getPhotoUrl(photoName: string, maxWidth = 400): string {
    const url = new URL(`${GOOGLE_PLACES_BASE_URL}/${photoName}/media`);
    url.searchParams.set("maxWidthPx", String(maxWidth));
    url.searchParams.set("key", this.apiKey);
    return url.toString();
  }

  private createHeaders(fieldMask: string): HeadersInit {
    return {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": this.apiKey,
      "X-Goog-FieldMask": fieldMask,
    };
  }

  private static async ensureOk(response: Response): Promise<void> {
    if (response.ok) {
      return;
    }

    const errorBody = await GooglePlacesClient.parseErrorBody(response);
    const detail = errorBody.error?.message || errorBody.error?.status || "";
    throw new Error(
      `Google Places API error: ${response.status}${detail ? ` - ${detail}` : ""}`
    );
  }

  private static async parseErrorBody(response: Response): Promise<{
    error?: { message?: string; status?: string };
  }> {
    try {
      return (await Promise.resolve(response.json())) as {
        error?: { message?: string; status?: string };
      };
    } catch {
      return { error: { message: "" } };
    }
  }

  private async postSearch(
    path: "/places:searchNearby" | "/places:searchText",
    fieldMask: string,
    body: Record<string, unknown>
  ): Promise<GooglePlaceSearchResponse> {
    const response = await fetch(`${GOOGLE_PLACES_BASE_URL}${path}`, {
      body: JSON.stringify(body),
      headers: this.createHeaders(fieldMask),
      method: "POST",
    });

    await GooglePlacesClient.ensureOk(response);
    return (await response.json()) as GooglePlaceSearchResponse;
  }

  private mapPlaceResult(place: GooglePlace): GooglePlaceResult {
    const photoUrl = place.photos?.[0]?.name
      ? this.getPhotoUrl(place.photos[0].name)
      : undefined;
    const latitude = place.location?.latitude;
    const longitude = place.location?.longitude;

    if (latitude === undefined || longitude === undefined) {
      throw new Error(`Google Places API result missing location: ${place.id}`);
    }

    return {
      address: place.formattedAddress || "",
      latitude,
      longitude,
      name: place.displayName?.text || place.id,
      openNow: place.regularOpeningHours?.openNow,
      photoUrl,
      placeId: place.id,
      rating: place.rating,
      types: place.types || [],
      userRatingsTotal: place.userRatingCount,
    };
  }
}

export function createGooglePlacesClient(apiKey?: string): GooglePlacesClient {
  return new GooglePlacesClient(apiKey);
}
