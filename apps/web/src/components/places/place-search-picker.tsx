import { Input } from "@rallycaststv/ui/components/input";

import { usePlaceSearch } from "@/lib/hooks";

export interface SelectedPlace {
  address: string;
  name: string;
  placeId: string;
}

export const PlaceSearchPicker = ({
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
}) => {
  const { data, isFetching } = usePlaceSearch(query);
  const places = data?.places ?? [];
  const showResults = query.trim().length >= 3 && !selectedPlace;

  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="text-muted-foreground text-xs font-semibold"
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
        className="rounded-md text-xs"
      />
      {selectedPlace ? (
        <p className="border-primary/30 bg-primary/5 rounded-md border p-2 text-xs">
          {selectedPlace.name} · {selectedPlace.address}
        </p>
      ) : null}
      {showResults ? (
        <div className="bg-card max-h-44 overflow-y-auto rounded-md border">
          {isFetching ? (
            <p className="text-muted-foreground p-3 text-xs">
              Validating locations...
            </p>
          ) : null}
          {places.slice(0, 5).map((place) => (
            <button
              className="hover:bg-muted block w-full border-b p-3 text-left text-xs transition-colors last:border-b-0"
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
              <span className="text-muted-foreground mt-1 block">
                {place.address}
              </span>
            </button>
          ))}
          {!isFetching && places.length === 0 ? (
            <p className="text-muted-foreground p-3 text-xs">
              No validated places found.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
