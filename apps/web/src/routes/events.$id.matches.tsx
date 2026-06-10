import { Card, CardContent } from "@rallycaststv/ui/components/card";
import { createFileRoute } from "@tanstack/react-router";
import { Clock, MapPin, Swords, Video, Trophy } from "lucide-react";

export const Route = createFileRoute("/events/$id/matches")({
  component: EventMatchesTab,
});

interface Match {
  id: string;
  round: string;
  t1: string;
  t2: string;
  score?: string;
  court: string;
  time: string;
  status: "scheduled" | "live" | "completed";
  caster?: string;
}

const mockMatches: Match[] = [
  {
    court: "Court 1",
    id: "m1",
    round: "Quarterfinals",
    score: "11-9, 11-7",
    status: "completed",
    t1: "Sarah & CG",
    t2: "David & Emma",
    time: "10:00 AM",
  },
  {
    court: "Court 2",
    id: "m2",
    round: "Quarterfinals",
    score: "11-8, 6-11, 11-5",
    status: "completed",
    t1: "Mike & John",
    t2: "Lucas & Nathan",
    time: "10:30 AM",
  },
  {
    caster: "Premium Caster Alex",
    court: "Court 1",
    id: "m3",
    round: "Semifinals",
    score: "11-8, 11-6",
    status: "completed",
    t1: "Sarah & CG",
    t2: "Mike & John",
    time: "1:00 PM",
  },
  {
    caster: "Assigning Caster...",
    court: "Court 1",
    id: "m4",
    round: "Finals",
    status: "scheduled",
    t1: "Sarah & CG",
    t2: "Winner SF2",
    time: "3:00 PM",
  },
];

function getMatchStatusClass(
  status: "scheduled" | "live" | "completed"
): string {
  if (status === "completed") {
    return "bg-muted text-muted-foreground";
  }
  if (status === "live") {
    return "bg-red-500/20 text-red-400 animate-pulse";
  }
  return "bg-yellow-500/20 text-yellow-400";
}

function EventMatchesTab() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Swords className="size-5 text-primary" /> Event Matches
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Review court schedules, active matches, and historical tournament
          results.
        </p>
      </div>

      <div className="space-y-4">
        {mockMatches.map((match) => (
          <Card
            key={match.id}
            className="border border-border/50 bg-card rounded-xl overflow-hidden shadow-sm"
          >
            <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full capitalize">
                    {match.round}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${getMatchStatusClass(
                      match.status
                    )}`}
                  >
                    {match.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 font-semibold text-sm">
                  <span
                    className={
                      match.status === "completed" &&
                      match.score?.startsWith("11")
                        ? "text-primary"
                        : ""
                    }
                  >
                    {match.t1}
                  </span>
                  <span className="text-xs text-muted-foreground font-normal">
                    vs
                  </span>
                  <span>{match.t2}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5" /> {match.time}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" /> {match.court}
                </span>
                {match.score && (
                  <span className="inline-flex items-center gap-1 font-bold text-foreground">
                    <Trophy className="size-3.5 text-brand-yellow" />{" "}
                    {match.score}
                  </span>
                )}
                {match.caster && (
                  <span className="inline-flex items-center gap-1 text-red-400 font-medium">
                    <Video className="size-3.5" /> Casted: {match.caster}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
