export interface GooglePlaceSuggestion {
  address: string;
  latitude: number;
  longitude: number;
  name: string;
  placeId: string;
}

export interface CourtSuggestion {
  addressLabel: string;
  city: string;
  countryCode: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  placeId?: string;
  source: "google_places";
  stateCode: string;
}

const parsePlaceCityState = (
  address: string
): { city: string; state: string } => {
  const parts = address.split(",").map((part) => part.trim());
  if (parts.length >= 3) {
    const [state] = parts.at(-2)?.split(" ") ?? [];
    return {
      city: parts.at(-3) ?? "Unknown",
      state: state || "US",
    };
  }
  return { city: "Unknown", state: "US" };
};

export const mapGooglePlaceToCourtSuggestion = (
  place: GooglePlaceSuggestion
): CourtSuggestion => {
  const location = parsePlaceCityState(place.address);
  return {
    addressLabel: place.name,
    city: location.city,
    countryCode: "US",
    formattedAddress: place.address,
    latitude: place.latitude,
    longitude: place.longitude,
    placeId: place.placeId,
    source: "google_places",
    stateCode: location.state,
  };
};
