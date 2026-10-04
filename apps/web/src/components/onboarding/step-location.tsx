import { debounce } from "@tanstack/pacer";
import { useStore } from "@tanstack/react-form";
import {
  Building2,
  Check,
  CheckCircle2,
  Compass,
  Loader2,
  MapPin,
  Search,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import type { CourtSuggestion } from "@/lib/google-places";
import { mapGooglePlaceToCourtSuggestion } from "@/lib/google-places";
import { useGeolocation, usePlaceSearch } from "@/lib/hooks";
import { withForm } from "@/lib/hooks/onboarding-form";

import { US_STATES, wizardFormOpts } from "./shared-form";

export const StepLocation = withForm({
  ...wizardFormOpts,
  props: {
    setStep: (() => null) as (step: number) => void,
    step: 1,
  },
  render: (props) => <StepLocationForm {...props} />,
});

const StepLocationForm = (props: React.ComponentProps<typeof StepLocation>) => {
  const { form, setStep } = props;
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [cityError, setCityError] = useState<string | null>(null);
  const [stateError, setStateError] = useState<string | null>(null);
  const [courtError, setCourtError] = useState<string | null>(null);

  // Reactive subscription to form location values
  const locationValues = useStore(form.store, (state) => state.values.location);
  const homeCourtName = locationValues.homeCourtName || "";
  const homeCity = locationValues.homeCity || "";
  const homeState = locationValues.homeState || "";

  const {
    error: geoError,
    isLoading: isGeoLoading,
    location: geoLoc,
    requestLocation,
  } = useGeolocation(true);

  // Debounce venue search with TanStack Pacer to avoid spamming Google Places API
  const debouncedSetQuery = useMemo(
    () =>
      debounce(
        (q: string) => {
          setDebouncedQuery(q.trim());
        },
        { wait: 350 }
      ),
    []
  );

  const handleSearchInput = (val: string) => {
    setSearchQuery(val);
    setShowDropdown(true);
    debouncedSetQuery(val);
  };

  const { data, isFetching } = usePlaceSearch(debouncedQuery);

  const suggestions = useMemo(
    () => (data?.places ?? []).map(mapGooglePlaceToCourtSuggestion),
    [data?.places]
  );

  const selectCourt = (addr: CourtSuggestion) => {
    form.setFieldValue("location.homeCourtName", addr.addressLabel);
    if (addr.city) {
      form.setFieldValue("location.homeCity", addr.city);
      setCityError(null);
    }
    if (addr.stateCode) {
      form.setFieldValue(
        "location.homeState",
        addr.stateCode.toUpperCase().slice(0, 2)
      );
      setStateError(null);
    }
    form.setFieldValue("location.homeLatitude", addr.latitude);
    form.setFieldValue("location.homeLongitude", addr.longitude);
    form.setFieldValue("location.radarPlaceId", addr.placeId ?? "");
    setCourtError(null);
    setSearchQuery("");
    setShowDropdown(false);
    toast.success(`Home court pinned: ${addr.addressLabel}`);
  };

  const selectCustomCourt = (courtName: string) => {
    const trimmed = courtName.trim();
    if (!trimmed) {
      return;
    }
    form.setFieldValue("location.homeCourtName", trimmed);
    setCourtError(null);
    setSearchQuery("");
    setShowDropdown(false);
    toast.success(`Home court set: ${trimmed}`);
  };

  const handleUseCurrentLocation = () => {
    toast.info("Detecting your location via GPS and network...");
    requestLocation();
  };

  // When geolocation arrives, pre-populate City/State and trigger nearby search
  useEffect(() => {
    if (geoLoc?.city) {
      form.setFieldValue("location.homeCity", geoLoc.city);
      setCityError(null);
    }
    if (geoLoc?.stateCode) {
      form.setFieldValue(
        "location.homeState",
        geoLoc.stateCode.toUpperCase().slice(0, 2)
      );
      setStateError(null);
    }
    if (geoLoc?.lat && geoLoc?.lng) {
      form.setFieldValue("location.homeLatitude", geoLoc.lat);
      form.setFieldValue("location.homeLongitude", geoLoc.lng);
    }
    if (geoLoc?.city && !homeCourtName) {
      setSearchQuery(`${geoLoc.city} pickleball`);
      setDebouncedQuery(`${geoLoc.city} pickleball`);
      setShowDropdown(true);
      toast.success(`Located ${geoLoc.city}, ${geoLoc.stateCode ?? ""}`);
    }
  }, [geoLoc, form, homeCourtName]);

  useEffect(() => {
    if (geoError) {
      toast.error(`Location detection: ${geoError}`);
    }
  }, [geoError]);

  const handleContinue = () => {
    let hasError = false;

    const trimmedCity = homeCity.trim();
    const trimmedState = homeState.trim().toUpperCase();
    let courtName = homeCourtName.trim();

    if (trimmedCity) {
      setCityError(null);
    } else {
      setCityError("City is required");
      hasError = true;
    }

    if (/^[A-Z]{2}$/u.test(trimmedState)) {
      setStateError(null);
    } else {
      setStateError(
        "State code must be exactly 2 uppercase letters (e.g. AR, CA, NY)"
      );
      hasError = true;
    }

    // If user typed a court name in the search box but didn't click "Select", auto-use what they entered
    if (!courtName && searchQuery.trim()) {
      courtName = searchQuery.trim();
      form.setFieldValue("location.homeCourtName", courtName);
    }

    if (courtName) {
      setCourtError(null);
    } else {
      setCourtError("Please search and select your home court or park");
      hasError = true;
    }

    if (hasError) {
      toast.error(
        "Please provide your home city, 2-letter state code, and home court."
      );
      return;
    }

    setStep(2);
  };

  return (
    <form.FormGroup name="location" onGroupSubmit={handleContinue}>
      {(formGroup) => (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            formGroup.handleSubmit();
          }}
        >
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-tight">
                Where is your home court?
              </h2>
              <p className="text-muted-foreground text-xs sm:text-sm">
                Connect your local court so we can match you with local players,
                nearby tournament brackets, and court highlights.
              </p>
            </div>

            {/* Quick Geolocation button */}
            <div className="border-primary/20 bg-primary/5 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5 shadow-xs">
              <div className="text-foreground/80 flex items-center gap-2.5 text-xs">
                <div className="bg-primary/10 text-primary rounded-lg p-1.5">
                  <Compass className="size-4 shrink-0" />
                </div>
                <div>
                  <p className="text-foreground font-semibold">
                    Instant court matching
                  </p>
                  <p className="text-muted-foreground text-[11px]">
                    Auto-detect city and state from your current device location
                  </p>
                </div>
              </div>
              <button
                className="bg-background border-border/80 hover:border-primary/50 hover:bg-accent inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3.5 py-1.5 text-xs font-semibold shadow-xs transition-colors"
                disabled={isGeoLoading}
                onClick={handleUseCurrentLocation}
                type="button"
              >
                {isGeoLoading ? (
                  <>
                    <Loader2 className="text-primary size-3.5 animate-spin" />
                    Locating...
                  </>
                ) : (
                  <>
                    <MapPin className="text-primary size-3.5" />
                    Use Current Location
                  </>
                )}
              </button>
            </div>

            {/* City and State */}
            <div className="grid gap-4 sm:grid-cols-2">
              <form.AppField name="location.homeCity">
                {(field) => (
                  <field.FormInput
                    error={cityError ?? undefined}
                    icon={Building2}
                    label="Home City"
                    placeholder="e.g. Searcy"
                    required={true}
                  />
                )}
              </form.AppField>
              <form.AppField name="location.homeState">
                {(field) => (
                  <field.FormInput
                    error={stateError ?? undefined}
                    hint="2-letter postal code (e.g. AR, CA, NY)"
                    icon={MapPin}
                    label="Home State"
                    list="us-states-datalist"
                    maxLength={2}
                    placeholder="AR"
                    required={true}
                    uppercase={true}
                  />
                )}
              </form.AppField>
              <datalist id="us-states-datalist">
                {US_STATES.map((state) => (
                  <option key={state.code} value={state.code}>
                    {state.name} ({state.code})
                  </option>
                ))}
              </datalist>
            </div>

            {/* Real Address & Court Search via Google Places API (Debounced via TanStack Pacer) */}
            <div className="relative space-y-2">
              <div className="flex items-center justify-between">
                <label
                  className="text-sm font-medium"
                  htmlFor="court-search-input"
                >
                  Search for your home court or park
                  <span
                    aria-hidden="true"
                    className="text-destructive ml-1 font-bold"
                  >
                    *
                  </span>
                </label>
                {isFetching && (
                  <span className="text-muted-foreground flex animate-pulse items-center gap-1 text-[11px]">
                    <Loader2 className="text-primary size-3 animate-spin" />
                    Searching venues...
                  </span>
                )}
              </div>

              <div className="relative">
                <Search className="text-muted-foreground pointer-events-none absolute top-3 left-3 size-4" />
                <input
                  aria-label="Search courts"
                  className="border-input bg-background/50 placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring h-10 w-full rounded-xl border py-1 pr-3 pl-9 text-xs font-medium transition-colors outline-none focus-visible:ring-1 sm:text-sm"
                  id="court-search-input"
                  onChange={(e) => handleSearchInput(e.target.value)}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Type park or court name (e.g. Berryhill Park, Crestwood Park)..."
                  type="text"
                  value={searchQuery}
                />
              </div>

              {courtError && (
                <p className="text-destructive text-xs">{courtError}</p>
              )}

              {/* Dropdown with Google Places Results or Custom Court Option */}
              {showDropdown && debouncedQuery.length >= 2 && (
                <div className="border-border bg-popover text-popover-foreground divide-border/40 absolute z-30 mt-1 max-h-64 w-full divide-y overflow-y-auto rounded-xl border shadow-xl">
                  {renderCourtSuggestions({
                    debouncedQuery,
                    isFetching,
                    onSelectCourt: selectCourt,
                    onSelectCustom: selectCustomCourt,
                    suggestions,
                  })}
                </div>
              )}
            </div>

            {/* Selected Pinned Court Card */}
            {homeCourtName ? (
              <div className="border-primary/30 bg-primary/5 flex items-center justify-between gap-3 rounded-xl border p-4 shadow-xs">
                <div className="flex min-w-0 items-start gap-3">
                  <CheckCircle2 className="text-primary mt-0.5 size-5 shrink-0" />
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-primary flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase">
                      <Sparkles className="text-brand-yellow size-3" />
                      Pinned Home Court
                    </p>
                    <p className="text-foreground truncate text-sm font-bold">
                      {homeCourtName}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {[homeCity, homeState].filter(Boolean).join(", ")}
                    </p>
                  </div>
                </div>
                <button
                  className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer text-xs font-medium underline"
                  onClick={() => {
                    form.setFieldValue("location.homeCourtName", "");
                    setSearchQuery("");
                  }}
                  type="button"
                >
                  Change
                </button>
              </div>
            ) : null}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                className="border-input bg-background/50 hover:bg-accent hover:text-accent-foreground inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border px-5 text-sm font-medium transition-colors"
                onClick={() => setStep(0)}
                type="button"
              >
                Back
              </button>
              <button
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl px-6 text-sm font-bold shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99]"
                onClick={handleContinue}
                type="button"
              >
                Continue to Game
                <Check className="size-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </form>
      )}
    </form.FormGroup>
  );
};

function renderCourtSuggestions({
  debouncedQuery,
  isFetching,
  onSelectCourt,
  onSelectCustom,
  suggestions,
}: {
  debouncedQuery: string;
  isFetching: boolean;
  onSelectCourt: (addr: CourtSuggestion) => void;
  onSelectCustom: (courtName: string) => void;
  suggestions: CourtSuggestion[];
}) {
  if (isFetching) {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 p-4 text-center text-xs">
        <Loader2 className="text-primary size-3.5 animate-spin" />
        Searching pickleball courts...
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="space-y-2.5 p-4 text-center text-xs">
        <p className="text-muted-foreground">
          No venues found matching &quot;{debouncedQuery}&quot;.
        </p>
        <button
          className="bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors"
          onClick={() => onSelectCustom(debouncedQuery)}
          type="button"
        >
          <MapPin className="size-3.5" />
          Use &quot;{debouncedQuery}&quot; as my home court
        </button>
      </div>
    );
  }

  return (
    <>
      {suggestions.map((addr) => (
        <button
          className="hover:bg-muted/70 flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left text-xs transition-colors"
          key={addr.placeId ?? addr.formattedAddress}
          onClick={() => onSelectCourt(addr)}
          type="button"
        >
          <MapPin className="text-primary mt-0.5 size-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="text-foreground block truncate font-bold">
              {addr.addressLabel}
            </span>
            <span className="text-muted-foreground block truncate text-[11px]">
              {addr.formattedAddress}
            </span>
          </div>
          <span className="bg-primary/10 border-primary/20 text-primary shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold">
            Select
          </span>
        </button>
      ))}
      <div className="border-border/40 bg-muted/20 border-t p-2.5 text-center">
        <button
          className="text-primary cursor-pointer text-xs font-medium hover:underline"
          onClick={() => onSelectCustom(debouncedQuery)}
          type="button"
        >
          Can&apos;t find it? Use &quot;{debouncedQuery}&quot; as my home court
        </button>
      </div>
    </>
  );
}
