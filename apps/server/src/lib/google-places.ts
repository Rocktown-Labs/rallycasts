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
  html_attributions: string[];
  results: {
    place_id: string;
    name: string;
    formatted_address?: string;
    vicinity?: string;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    photos?: {
      photo_reference: string;
      height: number;
      width: number;
      html_attributions: string[];
    }[];
    rating?: number;
    user_ratings_total?: number;
    types?: string[];
    opening_hours?: {
      open_now?: boolean;
    };
  }[];
  status: string;
  next_page_token?: string;
  error_message?: string;
}

export interface GooglePlaceDetailsResponse {
  html_attributions: string[];
  result: {
    place_id: string;
    name: string;
    formatted_address?: string;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    photos?: {
      photo_reference: string;
      height: number;
      width: number;
      html_attributions: string[];
    }[];
    rating?: number;
    user_ratings_total?: number;
    types?: string[];
    formatted_phone_number?: string;
    website?: string;
    opening_hours?: {
      open_now?: boolean;
      weekday_text?: string[];
    };
    editorial_summary?: {
      overview?: string;
    };
  };
  status: string;
  error_message?: string;
}

const GOOGLE_PLACES_BASE_URL = "https://maps.googleapis.com/maps/api/place";

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
    const url = new URL(`${GOOGLE_PLACES_BASE_URL}/nearbysearch/json`);
    url.searchParams.set("location", `${latitude},${longitude}`);
    url.searchParams.set("radius", String(radius));
    url.searchParams.set("keyword", keyword);
    url.searchParams.set("type", "park");
    url.searchParams.set("key", this.apiKey);

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.status}`);
    }

    const data = (await response.json()) as GooglePlaceSearchResponse;

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      throw new Error(
        `Google Places API error: ${data.status} - ${data.error_message || ""}`
      );
    }

    return (data.results || []).map((place) => this.mapPlaceResult(place));
  }

  async searchText(
    query: string,
    latitude?: number,
    longitude?: number
  ): Promise<GooglePlaceResult[]> {
    const url = new URL(`${GOOGLE_PLACES_BASE_URL}/textsearch/json`);
    url.searchParams.set("query", query);
    if (latitude && longitude) {
      url.searchParams.set("location", `${latitude},${longitude}`);
      url.searchParams.set("radius", "50000");
    }
    url.searchParams.set("key", this.apiKey);

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.status}`);
    }

    const data = (await response.json()) as GooglePlaceSearchResponse;

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      throw new Error(
        `Google Places API error: ${data.status} - ${data.error_message || ""}`
      );
    }

    return (data.results || []).map((place) => this.mapPlaceResult(place));
  }

  async getPlaceDetails(placeId: string): Promise<GooglePlaceResult> {
    const url = new URL(`${GOOGLE_PLACES_BASE_URL}/details/json`);
    url.searchParams.set("place_id", placeId);
    url.searchParams.set(
      "fields",
      "place_id,name,formatted_address,geometry,photos,rating,user_ratings_total,types,formatted_phone_number,website,opening_hours,editorial_summary"
    );
    url.searchParams.set("key", this.apiKey);

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.status}`);
    }

    const data = (await response.json()) as GooglePlaceDetailsResponse;

    if (data.status !== "OK") {
      throw new Error(
        `Google Places API error: ${data.status} - ${data.error_message || ""}`
      );
    }

    return this.mapPlaceDetailsResult(data.result);
  }

  getPhotoUrl(photoReference: string, maxWidth = 400): string {
    const url = new URL(`${GOOGLE_PLACES_BASE_URL}/photo`);
    url.searchParams.set("photoreference", photoReference);
    url.searchParams.set("maxwidth", String(maxWidth));
    url.searchParams.set("key", this.apiKey);
    return url.toString();
  }

  private mapPlaceResult(
    place: GooglePlaceSearchResponse["results"][0]
  ): GooglePlaceResult {
    const photoUrl = place.photos?.[0]?.photo_reference
      ? this.getPhotoUrl(place.photos[0].photo_reference)
      : undefined;

    return {
      address: place.formatted_address || place.vicinity || "",
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      name: place.name,
      openNow: place.opening_hours?.open_now,
      photoUrl,
      placeId: place.place_id,
      rating: place.rating,
      types: place.types || [],
      userRatingsTotal: place.user_ratings_total,
    };
  }

  private mapPlaceDetailsResult(
    place: GooglePlaceDetailsResponse["result"]
  ): GooglePlaceResult {
    const photoUrl = place.photos?.[0]?.photo_reference
      ? this.getPhotoUrl(place.photos[0].photo_reference)
      : undefined;

    return {
      address: place.formatted_address || "",
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      name: place.name,
      openNow: place.opening_hours?.open_now,
      photoUrl,
      placeId: place.place_id,
      rating: place.rating,
      types: place.types || [],
      userRatingsTotal: place.user_ratings_total,
    };
  }
}

export function createGooglePlacesClient(): GooglePlacesClient {
  return new GooglePlacesClient();
}
