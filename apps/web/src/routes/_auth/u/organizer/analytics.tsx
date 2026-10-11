import { Button } from "@rallycaststv/ui/components/button";
import { Card, CardContent } from "@rallycaststv/ui/components/card";
import { barX, defineChart } from "@tanstack/charts";
import { Chart } from "@tanstack/charts/react";
import { scaleBand } from "@tanstack/charts/scales/band";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, Calendar, Users, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo } from "react";

import type { OrganizerAnalytics } from "@/lib/hooks/use-organizer-analytics";
import {
  formatDollars,
  useOrganizerAnalytics,
} from "@/lib/hooks/use-organizer-analytics";

export const Route = createFileRoute("/_auth/u/organizer/analytics")({
  component: () => <OrganizerAnalyticsPage />,
});

const buildStatTiles = (
  totals: OrganizerAnalytics["totals"]
): {
  icon: ReactNode;
  label: string;
  trend: string;
  value: string;
}[] => [
  {
    icon: <Calendar className="size-5" />,
    label: "Active events",
    trend: `${totals.pastEvents} past`,
    value: `${totals.activeEvents}`,
  },
  {
    icon: <Users className="size-5" />,
    label: "Registrations",
    trend: `${totals.checkedInRegistrations} checked in`,
    value: `${totals.registrations}`,
  },
  {
    icon: <Wallet className="size-5" />,
    label: "Entry revenue",
    trend: "net of cancellations",
    value: formatDollars(totals.revenueCents),
  },
  {
    icon: <Activity className="size-5" />,
    label: "Ad impressions",
    trend: `${totals.adClicks} clicks`,
    value: `${totals.adImpressions}`,
  },
];

const OrganizerAnalyticsPage = () => {
  const { data, isLoading } = useOrganizerAnalytics();

  const registrationsChart = useMemo(() => {
    if (!data) {
      return null;
    }
    const rows = data.registrationsByDay.map((day) => ({
      date: day.date.slice(5),
      registrations: day.registrations,
    }));
    if (rows.length === 0) {
      return null;
    }
    return defineChart({
      marks: [barX(rows, { x: "registrations", y: "date" })],
      scales: {
        x: {
          axis: { label: "Registrations" },
          nice: true,
          scale: scaleLinear,
        },
        y: { scale: () => scaleBand<string>().padding(0.1) },
      },
    });
  }, [data]);

  const campaignChart = useMemo(() => {
    if (!data) {
      return null;
    }
    const rows = data.campaigns
      .map((campaign) => ({
        impressions: campaign.impressions,
        name: campaign.name,
      }))
      .filter((row) => row.impressions > 0);
    if (rows.length === 0) {
      return null;
    }
    return defineChart({
      marks: [barX(rows, { x: "impressions", y: "name" })],
      scales: {
        x: {
          axis: { label: "Impressions" },
          nice: true,
          scale: scaleLinear,
        },
        y: { scale: () => scaleBand<string>().padding(0.1) },
      },
    });
  }, [data]);

  const totals = data?.totals;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <p className="text-primary text-xs font-semibold tracking-[0.22em] uppercase">
          Organizer Tools
        </p>
        <h1 className="mt-1 text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          How your events, registrations, and ads are doing, in one place.
        </p>
      </header>

      {isLoading ? (
        <div className="bg-muted h-64 animate-pulse rounded-xl" />
      ) : null}

      {!isLoading && totals ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {totals
              ? buildStatTiles(totals).map(({ icon, label, trend, value }) => (
                  <Card className="rounded-lg" key={label}>
                    <CardContent className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-muted-foreground text-xs font-semibold">
                          {label}
                        </p>
                        <p className="mt-1 text-2xl font-extrabold">{value}</p>
                        <p className="text-muted-foreground mt-1 text-xs">
                          {trend}
                        </p>
                      </div>
                      <span className="bg-primary/10 text-primary grid size-10 place-items-center rounded-lg">
                        {icon}
                      </span>
                    </CardContent>
                  </Card>
                ))
              : null}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="rounded-lg">
              <CardContent className="space-y-3">
                <h2 className="font-bold">Registrations over time</h2>
                {registrationsChart ? (
                  <Chart
                    ariaDescription="New event registrations per day"
                    ariaLabel="Registrations over time"
                    aspectRatio={16 / 9}
                    definition={registrationsChart}
                  />
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No registrations yet. Share your tournament pages and this
                    fills in.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-lg">
              <CardContent className="space-y-3">
                <h2 className="font-bold">Ad delivery</h2>
                {campaignChart ? (
                  <Chart
                    ariaDescription="Impressions delivered per ad campaign"
                    ariaLabel="Ad impressions by campaign"
                    aspectRatio={16 / 9}
                    definition={campaignChart}
                  />
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No delivered impressions yet. Run a campaign from the Ads
                    tab and delivery shows up here.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-lg">
            <CardContent className="space-y-3">
              <h2 className="font-bold">Event detail</h2>
              {data && data.events.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-muted-foreground text-xs">
                      <tr>
                        <th className="py-2">Event</th>
                        <th className="py-2">Starts</th>
                        <th className="py-2">Registered</th>
                        <th className="py-2">Checked in</th>
                        <th className="py-2">Revenue</th>
                        <th className="py-2">Capacity fill</th>
                      </tr>
                    </thead>
                    <tbody className="divide-border divide-y">
                      {data.events.map((record) => (
                        <tr key={record.id}>
                          <td className="py-2 font-medium">{record.name}</td>
                          <td className="text-muted-foreground py-2 text-xs">
                            {new Date(record.startsAt).toLocaleDateString()}
                          </td>
                          <td className="py-2">
                            {record.registrations.registered}
                          </td>
                          <td className="py-2">
                            {record.registrations.checkedIn}
                          </td>
                          <td className="py-2">
                            {formatDollars(
                              (record.registrations.registered -
                                record.registrations.cancelled) *
                                record.entryFeeCents
                            )}
                          </td>
                          <td className="text-muted-foreground py-2 text-xs">
                            {record.capacity
                              ? `${Math.round(
                                  (record.registrations.registered /
                                    record.capacity) *
                                    100
                                )}%`
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Host an event and its numbers land here.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button className="rounded-lg" variant="outline">
              <a href="/u/organizer/tournaments">Go to tournaments</a>
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
};
