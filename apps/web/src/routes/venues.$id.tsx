import { Button } from "@rallycaststv/ui/components/button";
import { Card, CardContent } from "@rallycaststv/ui/components/card";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link, createFileRoute } from "@tanstack/react-router";
import { MapPin, Users, Info, ChevronLeft, Calendar } from "lucide-react";

import type { EventCardData } from "@/components/rally/cards";
import { apiClient } from "@/lib/api-client";

export const Route = createFileRoute("/venues/$id")({
  component: VenueDetailPage,
});

function VenueDetailPage() {
  const { id } = useParams({ from: "/venues/$id" });

  const { data, isLoading, error } = useQuery({
    queryFn: async () => {
      const res = await apiClient.api.venues[":id"].$get({
        param: { id },
      });
      if (!res.ok) {
        throw new Error("Failed to fetch venue");
      }
      return res.json();
    },
    queryKey: ["venue", id],
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6 animate-pulse">
        <div className="h-6 w-24 bg-muted rounded" />
        <div className="h-10 w-96 bg-muted rounded" />
        <div className="h-48 bg-muted rounded-xl" />
      </div>
    );
  }

  if (error || !data?.venue) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center space-y-4">
        <h2 className="text-2xl font-bold text-destructive">Venue not found</h2>
        <p className="text-muted-foreground text-sm">
          The court or park you are looking for does not exist or has been
          removed.
        </p>
        <Link to="/">
          <Button variant="outline" className="rounded-md text-xs mt-4">
            Back to Home
          </Button>
        </Link>
      </div>
    );
  }

  const { venue, events = [] } = data;
  const location = [venue.city, venue.state, venue.postalCode]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-6 animate-in fade-in duration-300">
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="size-3.5" /> Back to Home
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full capitalize">
            {venue.venueType || "park"}
          </span>
          <span className="text-xs bg-emerald-500/10 text-emerald-500 font-bold px-2 py-0.5 rounded-full">
            Active Venue
          </span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight mt-2 text-foreground">
          {venue.name}
        </h1>
      </div>

      <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card className="border border-border/50 bg-card rounded-xl shadow-sm">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-start gap-3.5">
                <MapPin className="size-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-semibold text-sm">Address</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {venue.addressLine1 || "No street address listed"}
                    {venue.addressLine2 ? `, ${venue.addressLine2}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">{location}</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <Users className="size-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-semibold text-sm">Court Configuration</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {venue.courtCount ?? 0} active pickleball courts available
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/50 bg-card rounded-xl shadow-sm">
            <CardContent className="p-6 space-y-3">
              <h3 className="font-bold text-base flex items-center gap-1.5">
                <Info className="size-4 text-primary" /> Court Details
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {venue.description ||
                  "Beautiful open-play venue with standard nets. Great lighting for evening matches."}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border border-border/50 bg-card rounded-xl shadow-sm p-4 text-center space-y-4">
            <h3 className="font-bold text-sm">Active Events</h3>
            <p className="text-xs text-muted-foreground">
              See tournaments, leagues, and social dink play scheduled at{" "}
              {venue.name}.
            </p>
          </Card>
        </div>
      </div>

      {/* Events section */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Calendar className="size-5 text-primary" /> Upcoming Events here
        </h2>
        {events.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {events.map((evt: EventCardData) => {
              const dateStr = new Date(evt.startsAt).toLocaleDateString(
                "en-US",
                {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }
              );
              return (
                <Card
                  key={evt.id}
                  className="border border-border/50 bg-card hover:bg-muted/30 transition-all rounded-lg p-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full capitalize">
                        {evt.eventType.replace("_", " ")}
                      </span>
                      <h4 className="font-bold text-sm mt-1.5">{evt.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {dateStr}
                      </p>
                    </div>
                    <Link to="/events/$id" params={{ id: evt.id }}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs rounded-md"
                      >
                        Details
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground bg-muted/20 border border-border/50 rounded-lg p-6 text-center">
            No upcoming tournaments or open play sessions are scheduled here at
            this time.
          </p>
        )}
      </div>
    </div>
  );
}
