import { Button } from "@rallycaststv/ui/components/button";
import { Input } from "@rallycaststv/ui/components/input";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Calendar, MapPin, Sparkles, Trophy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/rally/cards";
import { useGeolocation, useOrganizers } from "@/lib/hooks";

export const Route = createFileRoute("/organizers")({
  component: OrganizersPage,
});

interface OrganizerCardProps {
  bio?: string | null;
  displayUsername?: string | null;
  homeCity?: string | null;
  homeState?: string | null;
  id: string;
  image?: string | null;
  name: string;
  onboardingStatus?: string | null;
  skillLevel?: string | null;
  username: string | null;
}

const stateNames: Record<string, string> = {
  AR: "Arkansas",
  AZ: "Arizona",
  CA: "California",
  CO: "Colorado",
  FL: "Florida",
  NY: "New York",
  TX: "Texas",
};

const getStateName = (code: string) => stateNames[code.toUpperCase()] || code;

const handleContact = (name: string) => {
  toast.success(`Message thread initiated with ${name}!`);
};

function OrganizerCard({ org }: { org: OrganizerCardProps }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 flex flex-col justify-between min-h-[190px]">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative z-10 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-full overflow-hidden border border-border/80 bg-muted flex items-center justify-center">
              {org.image ? (
                <img
                  src={org.image}
                  alt={org.name || "Organizer avatar"}
                  className="size-full object-cover"
                />
              ) : (
                <Trophy className="size-5 text-muted-foreground" />
              )}
            </div>

            <div>
              <Link
                to="/players/$username"
                params={{
                  username: org.username || org.displayUsername || "",
                }}
                className="font-bold hover:underline text-foreground block text-sm"
              >
                {org.name || `@${org.username || org.displayUsername}`}
              </Link>
              {org.name && (
                <span className="text-xs text-muted-foreground block">
                  @{org.username || org.displayUsername}
                </span>
              )}
            </div>
          </div>

          <div className="rounded-lg bg-primary/10 border border-primary/20 px-2.5 py-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
              Host
            </span>
          </div>
        </div>

        <div className="space-y-2 text-xs">
          <p className="text-muted-foreground line-clamp-2 leading-relaxed">
            {org.bio || "Leagues coordinator & tournament host."}
          </p>
          <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="size-3 text-primary/70" />
              {org.homeCity && org.homeState
                ? `${org.homeCity}, ${org.homeState}`
                : (org.homeState ?? "Unknown")}
            </span>
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-5 pt-4 border-t border-border/50 flex items-center justify-between gap-2">
        <Link
          to="/players/$username"
          params={{
            username: org.username || org.displayUsername || "",
          }}
          className="text-xs text-primary hover:underline font-semibold"
        >
          View profile
        </Link>

        <div className="flex gap-2">
          <Link to="/events">
            <Button
              size="sm"
              variant="outline"
              className="h-8 rounded-md text-xs border-primary/20 hover:bg-primary/5 hover:text-primary transition-all duration-200"
            >
              <Calendar className="size-3 mr-1" /> Events
            </Button>
          </Link>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleContact(org.name || "Organizer")}
            className="h-8 rounded-md text-xs hover:bg-muted"
          >
            Contact
          </Button>
        </div>
      </div>
    </div>
  );
}

function OrganizersPage() {
  const [query, setQuery] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [viewAllSection, setViewAllSection] = useState<
    "near-you" | "global" | null
  >(null);

  const { location } = useGeolocation();
  const userState = location?.stateCode || "AR";

  const { data, isLoading } = useOrganizers(query);
  const organizers = (data?.players ?? []) as OrganizerCardProps[];

  // Filter based on state selection
  const filteredOrganizers = organizers.filter((org) => {
    const matchesState = selectedState
      ? org.homeState?.toLowerCase() === selectedState.toLowerCase()
      : true;
    return matchesState;
  });

  // Local organizers in user's state
  const localOrganizers = filteredOrganizers.filter(
    (org) => org.homeState?.toUpperCase() === userState.toUpperCase()
  );

  // Global organizers (all filtered)
  const globalOrganizers = filteredOrganizers;

  const isSearching = query !== "" || selectedState !== "";

  let mainContent;

  if (isLoading) {
    mainContent = (
      <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 animate-in fade-in duration-300">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="h-48 animate-pulse rounded-2xl bg-muted/40 border border-border/50"
          />
        ))}
      </div>
    );
  } else if (isSearching) {
    mainContent = (
      <div className="space-y-6 animate-in fade-in duration-300">
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Search Results ({filteredOrganizers.length})
        </h2>
        {filteredOrganizers.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
            {filteredOrganizers.map((org) => (
              <OrganizerCard key={org.id} org={org} />
            ))}
          </div>
        ) : (
          <EmptyState
            message="No organizers match the chosen search query or filters."
            title="No search results"
          />
        )}
      </div>
    );
  } else if (viewAllSection) {
    const getSectionDetails = () => {
      switch (viewAllSection) {
        case "near-you": {
          return {
            list: localOrganizers,
            title: `Organizers Near You in ${getStateName(userState)}`,
          };
        }
        case "global": {
          return { list: globalOrganizers, title: "All Organizers" };
        }
        default: {
          return { list: [], title: "" };
        }
      }
    };

    const section = getSectionDetails();

    mainContent = (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {section.title} ({section.list.length})
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewAllSection(null)}
            className="rounded-md h-8 text-xs"
          >
            ← Back to Directory
          </Button>
        </div>
        {section.list.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
            {section.list.map((org) => (
              <OrganizerCard key={org.id} org={org} />
            ))}
          </div>
        ) : (
          <EmptyState
            message="No organizers found in this section."
            title="No organizers found"
          />
        )}
      </div>
    );
  } else {
    mainContent = (
      <div className="space-y-10 animate-in fade-in duration-500">
        {/* Section 1: Near You */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Near You ({getStateName(userState)})
            </h2>
            {localOrganizers.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewAllSection("near-you")}
                className="text-primary hover:text-primary/80 font-semibold text-xs rounded-md"
              >
                View All
              </Button>
            )}
          </div>
          {localOrganizers.length > 0 ? (
            <div
              className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth -mx-4 px-4 md:-mx-0 md:px-0"
              style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}
            >
              {localOrganizers.map((org) => (
                <div
                  key={org.id}
                  className="w-[300px] sm:w-[330px] shrink-0 snap-start"
                >
                  <OrganizerCard org={org} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              message="No organizers registered in your state yet."
              title="No local organizers"
            />
          )}
        </div>

        {/* Section 2: Global Organizers */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              All Organizers
            </h2>
            {globalOrganizers.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewAllSection("global")}
                className="text-primary hover:text-primary/80 font-semibold text-xs rounded-md"
              >
                View All
              </Button>
            )}
          </div>
          {globalOrganizers.length > 0 ? (
            <div
              className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth -mx-4 px-4 md:-mx-0 md:px-0"
              style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}
            >
              {globalOrganizers.map((org) => (
                <div
                  key={org.id}
                  className="w-[300px] sm:w-[330px] shrink-0 snap-start"
                >
                  <OrganizerCard org={org} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              message="No organizers registered on the platform yet."
              title="No organizers"
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-4 animate-in fade-in duration-300">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-primary p-6 text-white shadow-xl sm:p-8">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-md bg-secondary/20 px-2.5 py-1 text-xs font-semibold text-[#bcdf21]">
            <Sparkles className="size-3" />
            <span>Tournament & Leagues Coverage</span>
          </div>
          <h1 className="text-3xl font-logo sm:text-4xl tracking-wide lowercase">
            organizers
          </h1>
          <p className="text-sm text-gray-200 sm:text-base leading-relaxed">
            Discover local league coordinators, venue directors, and tournament
            organizers hosting games near you.
          </p>
        </div>
      </div>

      {/* Filters & Search - Rounded Md */}
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-[3fr_1fr]">
          <Input
            placeholder="Search organizers by name, handle, or city..."
            value={query}
            onChange={(event) => {
              // Reset detail view on type
              setViewAllSection(null);
              setQuery(event.target.value);
            }}
            className="w-full bg-muted/40 border-border/80 focus:border-primary/50 rounded-md h-10 px-4"
          />
          <select
            value={selectedState}
            onChange={(e) => {
              setViewAllSection(null);
              setSelectedState(e.target.value);
            }}
            className="h-10 rounded-md border border-border bg-background px-4 py-2 text-sm text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
          >
            <option value="">All States</option>
            <option value="AR">Arkansas</option>
            <option value="CO">Colorado</option>
            <option value="AZ">Arizona</option>
            <option value="TX">Texas</option>
            <option value="FL">Florida</option>
            <option value="CA">California</option>
          </select>
        </div>
      </div>

      {/* List / Grid Display */}
      {mainContent}
    </div>
  );
}
