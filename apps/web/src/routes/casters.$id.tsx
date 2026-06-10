import { Button } from "@rallycaststv/ui/components/button";
import { Card, CardContent } from "@rallycaststv/ui/components/card";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link, createFileRoute } from "@tanstack/react-router";
import {
  Camera,
  DollarSign,
  MapPin,
  ChevronLeft,
  Calendar,
} from "lucide-react";

import { apiClient } from "@/lib/api-client";

export const Route = createFileRoute("/casters/$id")({
  component: CasterDetailPage,
});

function CasterDetailPage() {
  const { id } = useParams({ from: "/casters/$id" });

  const { data, isLoading, error } = useQuery({
    queryFn: async () => {
      const res = await apiClient.api.casters[":id"].$get({
        param: { id },
      });
      if (!res.ok) {
        throw new Error("Failed to fetch caster");
      }
      return res.json();
    },
    queryKey: ["caster", id],
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

  if (error || !data?.caster) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center space-y-4">
        <h2 className="text-2xl font-bold text-destructive">
          Caster not found
        </h2>
        <p className="text-muted-foreground text-sm">
          The caster you are looking for does not exist or is currently
          inactive.
        </p>
        <Link to="/casters">
          <Button variant="outline" className="rounded-md text-xs mt-4">
            Back to Casters
          </Button>
        </Link>
      </div>
    );
  }

  const { caster } = data;
  const rateInDollars = caster.hourlyRateCents / 100;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-6 animate-in fade-in duration-300">
      <div>
        <Link
          to="/casters"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="size-3.5" /> Back to Casters
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full capitalize">
            {caster.status || "available"}
          </span>
          <span className="text-xs bg-yellow-500/10 text-yellow-500 font-bold px-2 py-0.5 rounded-full capitalize">
            Verified Caster
          </span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight mt-2 text-foreground">
          {caster.displayName || "RallyCasts Caster"}
        </h1>
      </div>

      <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card className="border border-border/50 bg-card rounded-xl shadow-sm">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-start gap-3.5">
                <DollarSign className="size-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-semibold text-sm">Rate</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    ${rateInDollars.toFixed(0)} per hour
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <MapPin className="size-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-semibold text-sm">Service Area</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Up to {caster.serviceRadiusMiles || 25} miles from base
                    courts
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <Camera className="size-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-semibold text-sm">Equipment Setup</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Professional tripod, stabilization gimbal, and high-fidelity
                    audio kits.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/50 bg-card rounded-xl shadow-sm">
            <CardContent className="p-6 space-y-3">
              <h3 className="font-bold text-base flex items-center gap-1.5">
                <Camera className="size-4 text-primary" /> About Caster
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {caster.bio ||
                  "No bio has been provided by this caster. They are verified and ready to record match plays, tournament runs, and highlight reels."}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border border-border/50 bg-card rounded-xl shadow-sm p-4 text-center space-y-4">
            <h3 className="font-bold text-sm">Book Caster</h3>
            <p className="text-xs text-muted-foreground">
              Reserve this caster to stream or capture your upcoming matches and
              leagues.
            </p>
            <Button className="w-full rounded-lg text-xs font-semibold py-5 flex items-center justify-center gap-1.5">
              <Calendar className="size-4" /> Book Recording
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
