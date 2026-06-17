import { debounce } from "@tanstack/pacer";
import { CheckCircle, MapPin, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
import { readApiJson } from "@/lib/hooks/api";
import { withForm } from "@/lib/hooks/onboarding-form";

import { wizardFormOpts } from "./shared-form";

interface GooglePlaceSuggestion {
  address: string;
  latitude: number;
  longitude: number;
  name: string;
  placeId: string;
}

interface CourtSuggestion {
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

const parsePlaceCityState = (address: string) => {
  const parts = address.split(",").map((s) => s.trim());
  if (parts.length >= 3) {
    const stateZip = parts.at(-2)?.split(" ") || [];
    const [state] = stateZip;
    const city = parts.at(-3) || "Unknown";
    return { city, state: state || "US" };
  }
  return { city: "Unknown", state: "US" };
};

const mapGooglePlaceToCourtSuggestion = (
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
    source: "google_places" as const,
    stateCode: location.state,
  };
};

export const StepLocation = withForm({
  ...wizardFormOpts,
  props: {
    setStep: (_step: number) => void 0,
    step: 1,
  },
  render: function render({ form, setStep }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [suggestions, setSuggestions] = useState<CourtSuggestion[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    const homeCourtName = form.getFieldValue("location.homeCourtName");

    // Debounced Google Places search using TanStack Pacer
    const debouncedSearch = debounce(
      async (query: string) => {
        if (query.length < 3) {
          setSuggestions([]);
          setIsSearching(false);
          return;
        }
        try {
          const result = await readApiJson<{
            places: GooglePlaceSuggestion[];
          }>(
            apiClient.api.places.search.$get({
              query: { q: query },
            }) as Promise<{
              json: () => Promise<{ places: GooglePlaceSuggestion[] }>;
              ok: boolean;
              status: number;
              statusText: string;
            }>
          );
          setSuggestions(result.places.map(mapGooglePlaceToCourtSuggestion));
        } catch (error) {
          console.error("Places search error:", error);
          setSuggestions([]);
        } finally {
          setIsSearching(false);
        }
      },
      { wait: 400 }
    );

    useEffect(() => {
      if (searchQuery.length >= 3) {
        setIsSearching(true);
        debouncedSearch(searchQuery);
      } else {
        setSuggestions([]);
        setIsSearching(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery]);

    const selectCourt = (addr: CourtSuggestion) => {
      form.setFieldValue("location.homeCourtName", addr.addressLabel);
      form.setFieldValue("location.homeCity", addr.city);
      form.setFieldValue("location.homeState", addr.stateCode);
      form.setFieldValue("location.homeLatitude", addr.latitude);
      form.setFieldValue("location.homeLongitude", addr.longitude);
      form.setFieldValue("location.radarPlaceId", addr.placeId ?? "");
      setSearchQuery("");
      setShowDropdown(false);
      toast.success(`Home court set to ${addr.addressLabel}`);
    };

    let dropdownContent: React.ReactNode;
    if (isSearching) {
      dropdownContent = (
        <div className="p-4 text-xs text-muted-foreground text-center animate-pulse">
          Searching venues...
        </div>
      );
    } else if (suggestions.length === 0) {
      dropdownContent = (
        <div className="p-3 text-xs text-muted-foreground text-center">
          No matches found.
        </div>
      );
    } else {
      dropdownContent = (
        <div className="py-1">
          {suggestions.map((addr, idx) => (
            <button
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-center gap-2 border-b border-border/50 last:border-0"
              key={idx}
              onClick={() => selectCourt(addr)}
              type="button"
            >
              <MapPin className="size-4 text-primary shrink-0" />
              <div>
                <span className="font-semibold block text-xs sm:text-sm">
                  {addr.addressLabel}
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  {addr.formattedAddress}
                </span>
              </div>
            </button>
          ))}
        </div>
      );
    }

    return (
      <form.FormGroup name="location" onGroupSubmit={() => setStep(2)}>
        {(formGroup) => (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              formGroup.handleSubmit();
            }}
          >
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-xl font-bold">Where do you play?</h2>
                <p className="text-sm text-muted-foreground">
                  Find your home court so we can show you nearby players,
                  events, and clips.
                </p>
              </div>

              {/* City / State manual entry */}
              <div className="grid gap-4 md:grid-cols-2">
                <form.AppField name="location.homeCity">
                  {(field) => (
                    <field.FormInput
                      label="City"
                      placeholder="e.g. Little Rock"
                    />
                  )}
                </form.AppField>
                <form.AppField name="location.homeState">
                  {(field) => (
                    <field.FormInput label="State" placeholder="e.g. AR" />
                  )}
                </form.AppField>
              </div>

              {/* Google Places Search */}
              <div className="relative space-y-2">
                <label className="text-sm font-medium" htmlFor="court-search">
                  Search for your home court
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <input
                    aria-label="Search courts"
                    className="h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-2.5 py-1 text-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
                    id="court-search"
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Type court name or park..."
                    type="text"
                    value={searchQuery}
                  />
                </div>

                {showDropdown && searchQuery.length >= 3 && (
                  <div className="absolute z-20 w-full mt-1 bg-popover border border-border rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {dropdownContent}
                  </div>
                )}
              </div>

              {/* Selected court display */}
              {homeCourtName && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
                  <CheckCircle className="size-5 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase text-primary tracking-wider">
                      Home Court
                    </p>
                    <p className="text-sm font-bold">{homeCourtName}</p>
                    <p className="text-xs text-muted-foreground">
                      {form.getFieldValue("location.homeCity")},{" "}
                      {form.getFieldValue("location.homeState")}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <button
                  className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                  onClick={() => setStep(0)}
                  type="button"
                >
                  Back
                </button>
                <form.AppForm>
                  <form.SubmitButton>Continue</form.SubmitButton>
                </form.AppForm>
              </div>
            </div>
          </form>
        )}
      </form.FormGroup>
    );
  },
});
