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
      <div className="mx-auto max-w-3xl animate-pulse space-y-6 px-4 py-8">
        <div className="bg-muted h-6 w-24 rounded" />
        <div className="bg-muted h-10 w-96 rounded" />
        <div className="bg-muted h-48 rounded-xl" />
      </div>
    );
  }

  if (error || !data?.caster) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-12 text-center">
        <h2 className="text-destructive text-2xl font-bold">
          Caster not found
        </h2>
        <p className="text-muted-foreground text-sm">
          The caster you are looking for does not exist or is currently
          inactive.
        </p>
        <Link to="/casters">
          <Button variant="outline" className="mt-4 rounded-lg text-xs">
            Back to Casters
          </Button>
        </Link>
      </div>
    );
  }

  const { caster } = data;

  return (
    <div className="animate-in fade-in mx-auto max-w-4xl space-y-6 px-4 py-6 duration-300">
      <div>
        <Link
          to="/casters"
          className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 text-xs"
        >
          <ChevronLeft className="size-3.5" /> Back to Casters
        </Link>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-500 capitalize">
            {caster.status || "available for dispatch"}
          </span>
          <span className="rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-xs font-bold text-yellow-500 capitalize">
            Verified Caster
          </span>
        </div>
        <h1 className="text-foreground mt-2 text-3xl font-extrabold tracking-tight">
          {caster.displayName || "RallyCasts Caster"}
        </h1>
        <p className="text-muted-foreground mt-1 text-xs">
          On-demand court camera crew. Dispatched to local pickleball parks to
          film, score, and stream your games.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card className="border-border/50 bg-card rounded-xl border shadow-xs">
            <CardContent className="space-y-6 p-6">
              <div className="flex items-start gap-3.5">
                <DollarSign className="mt-0.5 size-5 text-emerald-500" />
                <div>
                  <h3 className="text-sm font-semibold">
                    Standard Hourly Rate
                  </h3>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    $20 / hour standard rate • Platform split & order by the
                    hour
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <MapPin className="text-primary mt-0.5 size-5" />
                <div>
                  <h3 className="text-sm font-semibold">Service Area</h3>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    Up to {caster.serviceRadiusMiles || 25} miles from base
                    courts
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <Camera className="text-primary mt-0.5 size-5" />
                <div>
                  <h3 className="text-sm font-semibold">Equipment Setup</h3>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    Professional tripod, stabilization gimbal, and directional
                    court audio kits.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card rounded-xl border shadow-xs">
            <CardContent className="space-y-3 p-6">
              <h3 className="flex items-center gap-1.5 text-base font-bold">
                <Camera className="text-primary size-4" /> About Caster
              </h3>
              <p className="text-muted-foreground text-xs leading-relaxed whitespace-pre-wrap">
                {caster.bio ||
                  "Verified on-court caster ready to capture match plays, tournament runs, and highlight reels."}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-border/50 bg-card space-y-4 rounded-xl border p-5 shadow-xs">
            <h3 className="text-sm font-bold">Request to Your Court</h3>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Request this caster or next available caster to show up at your
              court and record your match.
            </p>
            <div className="bg-muted/40 space-y-2 rounded-lg p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Standard Rate:</span>
                <span className="text-foreground font-bold">$20 / hour</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Review Guarantee:</span>
                <span className="font-medium text-emerald-500">
                  Private Approval
                </span>
              </div>
            </div>
            <Link to="/u/casts/new" className="block">
              <Button className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg py-5 text-xs font-semibold">
                <Calendar className="size-4" /> Order Caster Hours
              </Button>
            </Link>
            <p className="text-muted-foreground text-center text-[11px]">
              Footage is sent to you for review before publishing.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
