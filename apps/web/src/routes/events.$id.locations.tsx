import { Card, CardContent } from "@rallycaststv/ui/components/card";
import { createFileRoute } from "@tanstack/react-router";
import { Info, MapPin, ShieldCheck } from "lucide-react";

import { useEventContext } from "./events.$id";

export const Route = createFileRoute("/events/$id/locations")({
  component: EventLocationsTab,
});

function EventLocationsTab() {
  const { event } = useEventContext();
  const hasVenue = Boolean(event.venueId);

  return (
    <div className="animate-in fade-in space-y-6 duration-300">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <MapPin className="text-primary size-5" /> Venue & Court Layout
        </h2>
        <p className="text-muted-foreground mt-1 text-xs">
          Location and court details published by the event organizer.
        </p>
      </div>

      <Card className="border-border/50 bg-card overflow-hidden rounded-xl border shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <MapPin className="text-primary mt-0.5 size-5 shrink-0" />
            <div className="space-y-2">
              <h3 className="text-sm font-bold">Event location</h3>
              <p className="text-muted-foreground text-sm">
                {hasVenue
                  ? "The validated venue location is available on this event."
                  : "The organizer has not published a venue location yet."}
              </p>
              {event.courtLabelsJson ? (
                <p className="text-muted-foreground text-xs">
                  Courts: {event.courtLabelsJson}
                </p>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card rounded-xl border p-5 shadow-sm">
        <h3 className="border-border/50 flex items-center gap-1.5 border-b pb-2 text-sm font-bold">
          <Info className="text-primary size-4" /> Event guidance
        </h3>
        <div className="mt-4 flex items-start gap-2.5 text-xs">
          <ShieldCheck className="text-primary mt-0.5 size-4 shrink-0" />
          <p className="text-muted-foreground">
            Check-in and court assignment instructions will appear here when the
            organizer publishes them.
          </p>
        </div>
      </Card>
    </div>
  );
}
