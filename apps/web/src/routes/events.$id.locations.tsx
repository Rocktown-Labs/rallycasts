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
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <MapPin className="size-5 text-primary" /> Venue & Court Layout
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Location and court details published by the event organizer.
        </p>
      </div>

      <Card className="overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 size-5 shrink-0 text-primary" />
            <div className="space-y-2">
              <h3 className="font-bold text-sm">Event location</h3>
              <p className="text-sm text-muted-foreground">
                {hasVenue
                  ? "The validated venue location is available on this event."
                  : "The organizer has not published a venue location yet."}
              </p>
              {event.courtLabelsJson ? (
                <p className="text-xs text-muted-foreground">
                  Courts: {event.courtLabelsJson}
                </p>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border border-border/50 bg-card p-5 shadow-sm">
        <h3 className="flex items-center gap-1.5 border-b border-border/50 pb-2 text-sm font-bold">
          <Info className="size-4 text-primary" /> Event guidance
        </h3>
        <div className="mt-4 flex items-start gap-2.5 text-xs">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-muted-foreground">
            Check-in and court assignment instructions will appear here when the
            organizer publishes them.
          </p>
        </div>
      </Card>
    </div>
  );
}
