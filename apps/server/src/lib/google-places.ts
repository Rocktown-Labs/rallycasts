import { env } from "cloudflare:workers";

import { haversineDistance } from "./geo";

export interface GooglePlaceResult {
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  isPickleballCandidate?: boolean;
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
const PICKLEBALL_PARK_SEARCH_TYPES = [
  "park",
  "city_park",
  "sports_complex",
  "sports_activity_location",
  "tennis_court",
] as const;
const LODGING_PLACE_TYPES = new Set([
  "bed_and_breakfast",
  "campground",
  "camping_cabin",
  "cottage",
  "extended_stay_hotel",
  "farmstay",
  "guest_house",
  "hostel",
  "hotel",
  "lodging",
  "motel",
  "private_guest_room",
  "resort_hotel",
  "rv_park",
]);
const PICKLEBALL_QUERY = "pickleball courts";
const PICKLEBALL_SEARCH_RESULT_LIMIT = 20;
const SPORTS_COURT_TYPES = new Set([
  "athletic_field",
  "sports_activity_location",
  "sports_club",
  "sports_complex",
  "tennis_court",
]);

export class GooglePlacesClient {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey =
      apiKey ||
      (env as { GOOGLE_PLACES_API_KEY?: string }).GOOGLE_PLACES_API_KEY ||
      "";
  }

  searchNearby(
    latitude: number,
    longitude: number,
    radius = 50_000,
    keyword = "pickleball"
  ): Promise<GooglePlaceResult[]> {
    if (keyword !== "pickleball") {
      return this.searchText(keyword, latitude, longitude);
    }

    return this.searchPickleballParks(latitude, longitude, radius);
  }

  async searchPickleballParks(
    latitude: number,
    longitude: number,
    radius = 50_000
  ): Promise<GooglePlaceResult[]> {
    const textSearchResults = await Promise.allSettled([
      this.searchText(PICKLEBALL_QUERY, latitude, longitude, {
        maxResultCount: PICKLEBALL_SEARCH_RESULT_LIMIT,
        radius,
      }),
      ...PICKLEBALL_PARK_SEARCH_TYPES.map((includedType) =>
        this.searchText(PICKLEBALL_QUERY, latitude, longitude, {
          includedType,
          maxResultCount: PICKLEBALL_SEARCH_RESULT_LIMIT,
          radius,
        })
      ),
    ]);

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
        maxResultCount: PICKLEBALL_SEARCH_RESULT_LIMIT,
        rankPreference: "DISTANCE",
      }
    );

    return GooglePlacesClient.dedupePlaces([
      ...textSearchResults.flatMap((result) =>
        result.status === "fulfilled" ? result.value : []
      ),
      ...(data.places ?? []).map((place) => this.mapPlaceResult(place)),
    ])
      .filter((place) => GooglePlacesClient.isPickleballParkResult(place))
      .toSorted(
        (left, right) =>
          haversineDistance(
            latitude,
            longitude,
            left.latitude,
            left.longitude
          ) -
          haversineDistance(
            latitude,
            longitude,
            right.latitude,
            right.longitude
          )
      );
  }

  async searchText(
    query: string,
    latitude?: number,
    longitude?: number,
    options?: {
      includedType?: (typeof PICKLEBALL_PARK_SEARCH_TYPES)[number];
      maxResultCount?: number;
      radius?: number;
    }
  ): Promise<GooglePlaceResult[]> {
    const body: Record<string, unknown> = {
      maxResultCount: options?.maxResultCount ?? 8,
      textQuery: query,
    };

    if (options?.includedType) {
      body.includedType = options.includedType;
    }

    if (latitude !== undefined && longitude !== undefined) {
      const locationCircle = {
        circle: {
          center: { latitude, longitude },
          radius: options?.radius ?? 50_000,
        },
      };
      body.locationBias = locationCircle;
      body.rankPreference = "DISTANCE";
    }

    const data = await this.postSearch(
      "/places:searchText",
      SEARCH_FIELD_MASK,
      body
    );

    const isPickleballCandidate = query.toLowerCase().includes("pickleball");

    return (data.places ?? []).map((place) =>
      this.mapPlaceResult(place, { isPickleballCandidate })
    );
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

  private static dedupePlaces(
    places: GooglePlaceResult[]
  ): GooglePlaceResult[] {
    const seen = new Set<string>();
    const deduped: GooglePlaceResult[] = [];

    for (const place of places) {
      if (seen.has(place.placeId)) {
        continue;
      }
      seen.add(place.placeId);
      deduped.push(place);
    }

    return deduped;
  }

  private static isPickleballParkResult(place: GooglePlaceResult): boolean {
    if (place.types.some((type) => LODGING_PLACE_TYPES.has(type))) {
      return false;
    }

    const hasAllowedType = place.types.some((type) =>
      SPORTS_COURT_TYPES.has(type)
    );
    const searchableText = `${place.name} ${place.address}`.toLowerCase();
    const hasPickleballSignal = searchableText.includes("pickleball");

    return place.isPickleballCandidate || hasAllowedType || hasPickleballSignal;
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

  private mapPlaceResult(
    place: GooglePlace,
    options?: { isPickleballCandidate?: boolean }
  ): GooglePlaceResult {
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
      isPickleballCandidate: options?.isPickleballCandidate || undefined,
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
