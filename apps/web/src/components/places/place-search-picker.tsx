import { Input } from "@rallycaststv/ui/components/input";

import { usePlaceSearch } from "@/lib/hooks";

export interface SelectedPlace {
  address: string;
  name: string;
  placeId: string;
}

export function PlaceSearchPicker({
  id,
  label = "Location",
  onPlaceChange,
  onQueryChange,
  query,
  selectedPlace,
}: {
  id: string;
  label?: string;
  onPlaceChange: (place: SelectedPlace | null) => void;
  onQueryChange: (query: string) => void;
  query: string;
  selectedPlace: SelectedPlace | null;
}) {
  const { data, isFetching } = usePlaceSearch(query);
  const places = data?.places ?? [];
  const showResults = query.trim().length >= 3 && !selectedPlace;

  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="text-xs font-semibold text-muted-foreground"
      >
        {label}
      </label>
      <Input
        id={id}
        placeholder="Search an address, park, club, or facility"
        value={query}
        onChange={(event) => {
          onQueryChange(event.target.value);
          onPlaceChange(null);
        }}
        required
        className="text-xs rounded-md"
      />
      {selectedPlace ? (
        <p className="rounded-md border border-primary/30 bg-primary/5 p-2 text-xs">
          {selectedPlace.name} · {selectedPlace.address}
        </p>
      ) : null}
      {showResults ? (
        <div className="max-h-44 overflow-y-auto rounded-md border bg-card">
          {isFetching ? (
            <p className="p-3 text-xs text-muted-foreground">
              Validating locations...
            </p>
          ) : null}
          {places.slice(0, 5).map((place) => (
            <button
              className="block w-full border-b p-3 text-left text-xs transition-colors last:border-b-0 hover:bg-muted"
              key={place.placeId}
              onClick={() => {
                onPlaceChange({
                  address: place.address,
                  name: place.name,
                  placeId: place.placeId,
                });
                onQueryChange(`${place.name}, ${place.address}`);
              }}
              type="button"
            >
              <span className="font-semibold">{place.name}</span>
              <span className="mt-1 block text-muted-foreground">
                {place.address}
              </span>
            </button>
          ))}
          {!isFetching && places.length === 0 ? (
            <p className="p-3 text-xs text-muted-foreground">
              No validated places found.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
