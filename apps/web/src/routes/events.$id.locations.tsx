import { Card, CardContent } from "@rallycaststv/ui/components/card";
import { createFileRoute } from "@tanstack/react-router";
import { MapPin, ShieldCheck, Compass, Info } from "lucide-react";

export const Route = createFileRoute("/events/$id/locations")({
  component: EventLocationsTab,
});

function EventLocationsTab() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <MapPin className="size-5 text-primary" /> Venue & Court Layout
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Find addresses, court layouts, parking guidelines, and checking
          details.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[1.5fr_1fr]">
        <Card className="border border-border/50 bg-card rounded-xl overflow-hidden shadow-sm">
          <CardContent className="p-0">
            {/* Mock map layout */}
            <div className="h-64 bg-[radial-gradient(circle_at_50%_50%,hsl(142_100%_18%/.35),hsl(240_10%_4%/.8))] flex items-center justify-center border-b border-border/50 relative">
              <div className="absolute inset-0 grid grid-cols-4 grid-rows-2 p-6 gap-3 opacity-60">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="border border-primary/20 rounded-md bg-primary/5 flex items-center justify-center text-[10px] text-primary/45 font-bold font-mono"
                  >
                    Court {i + 1}
                  </div>
                ))}
              </div>
              <div className="relative z-10 text-center space-y-2 bg-background/90 p-4 rounded-xl border border-border max-w-xs">
                <Compass className="size-8 text-primary mx-auto animate-spin-slow" />
                <h4 className="font-bold text-xs">Court Layout View</h4>
                <p className="text-[10px] text-muted-foreground">
                  Event matches scheduled on Courts 1, 2, 3 and 4.
                </p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <h3 className="font-bold text-sm">Event Check-In Location</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Check-in table is located next to Court 1 by the main pavilion.
                Please check in 30 minutes before your first scheduled match to
                receive your tournament packet and court assignment.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/50 bg-card rounded-xl shadow-sm p-5 space-y-4">
          <h3 className="font-bold text-sm flex items-center gap-1.5 border-b border-border/50 pb-2">
            <Info className="size-4 text-primary" /> Amenities & Rules
          </h3>
          <div className="space-y-3.5 text-xs">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="size-4 text-primary shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold">Water & Facilities</h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Water fountains and restrooms are located adjacent to court
                  entrance.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <ShieldCheck className="size-4 text-primary shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold">Paddle Regulations</h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  All paddles must be USA Pickleball approved. Random checks may
                  occur.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <ShieldCheck className="size-4 text-primary shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold">Parking Information</h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Free public parking in the main lot. Overflow parking
                  available behind rec center.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
