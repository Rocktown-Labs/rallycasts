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
      const res = await apiClient.api.v1.casters[":id"].$get({
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

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6 animate-in fade-in duration-300">
      <div>
        <Link
          to="/casters"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="size-3.5" /> Back to Casters
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-emerald-500/10 text-emerald-500 font-bold px-2.5 py-0.5 rounded-full capitalize">
            {caster.status || "available for dispatch"}
          </span>
          <span className="text-xs bg-yellow-500/10 text-yellow-500 font-bold px-2.5 py-0.5 rounded-full capitalize">
            Verified Caster
          </span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight mt-2 text-foreground">
          {caster.displayName || "RallyCasts Caster"}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          On-demand court camera crew. Dispatched to local pickleball parks to
          film, score, and stream your games.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card className="border border-border/50 bg-card rounded-xl shadow-xs">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-start gap-3.5">
                <DollarSign className="size-5 text-emerald-500 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-sm">
                    Standard Hourly Rate
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    $20 / hour standard rate • Platform split & order by the
                    hour
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
                    Professional tripod, stabilization gimbal, and directional
                    court audio kits.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/50 bg-card rounded-xl shadow-xs">
            <CardContent className="p-6 space-y-3">
              <h3 className="font-bold text-base flex items-center gap-1.5">
                <Camera className="size-4 text-primary" /> About Caster
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {caster.bio ||
                  "Verified on-court caster ready to capture match plays, tournament runs, and highlight reels."}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border border-border/50 bg-card rounded-xl shadow-xs p-5 space-y-4">
            <h3 className="font-bold text-sm">Request to Your Court</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Request this caster or next available caster to show up at your
              court and record your match.
            </p>
            <div className="rounded-lg bg-muted/40 p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Standard Rate:</span>
                <span className="font-bold text-foreground">$20 / hour</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Review Guarantee:</span>
                <span className="font-medium text-emerald-500">
                  Private Approval
                </span>
              </div>
            </div>
            <Link to="/u/casts/new" className="block">
              <Button className="w-full rounded-lg text-xs font-semibold py-5 flex items-center justify-center gap-1.5 cursor-pointer">
                <Calendar className="size-4" /> Order Caster Hours
              </Button>
            </Link>
            <p className="text-[11px] text-muted-foreground text-center">
              Footage is sent to you for review before publishing.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
