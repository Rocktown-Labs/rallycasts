import { Button } from "@rallycaststv/ui/components/button";
import { Card, CardContent } from "@rallycaststv/ui/components/card";
import { cn } from "@rallycaststv/ui/lib/utils";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, Plus, Settings2, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  formatDollars,
  useOrganizerAnalytics,
} from "@/lib/hooks/use-organizer-analytics";

export const Route = createFileRoute("/_auth/u/organizer/tournaments")({
  component: () => <OrganizerTournamentsPage />,
});

const filterTabs = [
  { id: "active", label: "Active" },
  { id: "past", label: "Past" },
] as const;

/**
 * The active/past split needs a clock, but the new react lint preset forbids
 * Date.now() during render. Read it in a mount effect instead: the first
 * render treats nothing as past (all events start in the future until the
 * effect runs), which settles one paint later.
 */
const useMountedClock = () => {
  const [nowMs, setNowMs] = useState(Number.POSITIVE_INFINITY);
  useEffect(() => {
    setNowMs(Date.now());
  }, []);
  return nowMs;
};

const OrganizerTournamentsPage = () => {
  const { data, isLoading } = useOrganizerAnalytics();
  const [filter, setFilter] =
    useState<(typeof filterTabs)[number]["id"]>("active");

  // Snapshot the clock once per mount; re-renders keep a stable split.
  const nowMs = useMountedClock();
  const events = useMemo(() => {
    if (!data) {
      return [];
    }
    return data.events.filter((record) => {
      const upcoming =
        new Date(record.startsAt).getTime() >= nowMs &&
        record.status !== "cancelled";
      return filter === "active" ? upcoming : !upcoming;
    });
  }, [data, filter, nowMs]);

  const typeLabels: Record<string, string> = {
    clinic: "Clinic",
    league: "League",
    open_play: "Open play",
    tournament: "Tournament",
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-primary text-xs font-semibold tracking-[0.22em] uppercase">
            Organizer Tools
          </p>
          <h1 className="mt-1 text-3xl font-bold">Tournaments</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Every event you host — tournaments, clinics, leagues, and open play.
            Open one to manage players, check-ins, and its bracket.
          </p>
        </div>
        <Link to="/u/organizer/tournaments/new">
          <Button className="rounded-lg">
            <Plus className="size-4" />
            Host a tournament
          </Button>
        </Link>
      </header>

      <div className="flex gap-2">
        {filterTabs.map((tab) => (
          <Button
            className={cn("rounded-lg", filter === tab.id && "border-primary")}
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            size="sm"
            type="button"
            variant={filter === tab.id ? "default" : "outline"}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="bg-muted h-64 animate-pulse rounded-xl" />
      ) : null}

      {!isLoading && events.length === 0 ? (
        <Card className="rounded-lg">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Calendar className="text-muted-foreground size-10" />
            <div>
              <p className="font-bold">
                {filter === "active"
                  ? "No upcoming events"
                  : "No past events yet"}
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                {filter === "active"
                  ? "Host your first tournament and registrations land here."
                  : "Finished events collect here with their final numbers."}
              </p>
            </div>
            {filter === "active" ? (
              <Link to="/u/organizer/tournaments/new">
                <Button className="rounded-lg">
                  <Plus className="size-4" />
                  Host a tournament
                </Button>
              </Link>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && events.length > 0 ? (
        <Card className="rounded-lg">
          <CardContent>
            <table className="w-full text-left text-sm">
              <thead className="text-muted-foreground text-xs">
                <tr>
                  <th className="py-2">Event</th>
                  <th className="py-2">Starts</th>
                  <th className="py-2">Registered</th>
                  <th className="py-2">Checked in</th>
                  <th className="py-2">Revenue</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {events.map((record) => (
                  <tr key={record.id}>
                    <td className="py-2 font-medium">
                      <Link
                        className="hover:text-primary hover:underline"
                        params={{ id: record.id }}
                        to="/events/$id/manage"
                      >
                        {record.name}
                      </Link>
                      <span className="text-muted-foreground ml-1.5 text-[11px]">
                        {typeLabels[record.eventType] ?? record.eventType}
                      </span>
                    </td>
                    <td className="text-muted-foreground py-2 text-xs">
                      {new Date(record.startsAt).toLocaleString()}
                    </td>
                    <td className="py-2">
                      <span className="inline-flex items-center gap-1">
                        <Users className="text-muted-foreground size-3.5" />
                        {record.registrations.registered}
                        {record.capacity ? ` / ${record.capacity}` : ""}
                      </span>
                    </td>
                    <td className="py-2 text-xs">
                      {record.registrations.checkedIn}
                    </td>
                    <td className="py-2">
                      {formatDollars(
                        (record.registrations.registered -
                          record.registrations.cancelled) *
                          record.entryFeeCents
                      )}
                    </td>
                    <td className="py-2 text-right">
                      <Link
                        className="text-primary inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                        params={{ id: record.id }}
                        to="/events/$id/manage"
                      >
                        <Settings2 className="size-3.5" /> Manage
                      </Link>
                      <Link
                        className="text-muted-foreground ml-3 inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                        params={{ id: record.id }}
                        to="/events/$id/bracket"
                      >
                        Bracket
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};
