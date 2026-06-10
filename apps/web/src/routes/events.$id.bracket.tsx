import { Button } from "@rallycaststv/ui/components/button";
import { Card, CardContent } from "@rallycaststv/ui/components/card";
import { createFileRoute } from "@tanstack/react-router";
import { Award, Swords, Video } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/events/$id/bracket")({
  component: EventBracketTab,
});

interface MatchNode {
  id: string;
  round: string;
  p1: string;
  p2: string;
  s1?: number;
  s2?: number;
  winner?: 1 | 2;
  court?: string;
  time?: string;
  status: "scheduled" | "live" | "completed";
  casted?: boolean;
}

const mockMatches: MatchNode[] = [
  // Round 1 (Quarterfinals)
  {
    court: "Court 1",
    id: "m1",
    p1: "Sarah Johnson",
    p2: "CG Stewart",
    round: "Quarterfinals",
    s1: 11,
    s2: 9,
    status: "completed",
    time: "10:00 AM",
    winner: 1,
  },
  {
    court: "Court 2",
    id: "m2",
    p1: "Mike Rodriguez",
    p2: "John Doe",
    round: "Quarterfinals",
    s1: 7,
    s2: 11,
    status: "completed",
    time: "10:30 AM",
    winner: 2,
  },
  {
    court: "Court 3",
    id: "m3",
    p1: "David Miller",
    p2: "Emma Watson",
    round: "Quarterfinals",
    s1: 11,
    s2: 13,
    status: "completed",
    time: "11:00 AM",
    winner: 2,
  },
  {
    court: "Court 4",
    id: "m4",
    p1: "Lucas Scott",
    p2: "Nathan Hale",
    round: "Quarterfinals",
    s1: 11,
    s2: 5,
    status: "completed",
    time: "11:30 AM",
    winner: 1,
  },

  // Round 2 (Semifinals)
  {
    casted: true,
    court: "Court 1",
    id: "m5",
    p1: "Sarah Johnson",
    p2: "John Doe",
    round: "Semifinals",
    s1: 11,
    s2: 8,
    status: "completed",
    time: "1:00 PM",
    winner: 1,
  },
  {
    court: "Court 2",
    id: "m6",
    p1: "Emma Watson",
    p2: "Lucas Scott",
    round: "Semifinals",
    s1: 4,
    s2: 11,
    status: "completed",
    time: "1:30 PM",
    winner: 2,
  },

  // Round 3 (Finals)
  {
    court: "Court 1",
    id: "m7",
    p1: "Sarah Johnson",
    p2: "Lucas Scott",
    round: "Finals",
    status: "scheduled",
    time: "3:00 PM",
  },
];

function EventBracketTab() {
  const [matches, setMatches] = useState<MatchNode[]>(mockMatches);
  const [selectedMatch, setSelectedMatch] = useState<MatchNode | null>(null);

  const handleRequestCasting = (matchId: string) => {
    setMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, casted: true } : m))
    );
    setSelectedMatch((prev) =>
      prev && prev.id === matchId ? { ...prev, casted: true } : prev
    );
    toast.success(
      "Casting request sent for this match! Caster fee: $50 split 50/50."
    );
  };

  const getMatchByNodeId = (id: string) => matches.find((m) => m.id === id);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Award className="size-5 text-primary" /> Tournament Bracket
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Follow the paths of the tournament players. Click any match for more
          info and to request caster recording.
        </p>
      </div>

      {/* Bracket Tree Layout */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-8 py-6 overflow-x-auto min-w-[700px]">
        {/* Quarterfinals Column */}
        <div className="flex flex-col justify-around h-[400px] flex-1 max-w-[240px]">
          <h3 className="text-center text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
            Quarterfinals
          </h3>
          {["m1", "m2", "m3", "m4"].map((id) => {
            const m = getMatchByNodeId(id);
            if (!m) {
              return null;
            }
            return (
              <button
                key={m.id}
                onClick={() => setSelectedMatch(m)}
                className={`p-3 rounded-lg border text-left text-xs transition-all w-full cursor-pointer relative ${
                  selectedMatch?.id === m.id
                    ? "border-primary bg-primary/10 shadow-lg ring-1 ring-primary"
                    : "border-border hover:border-primary/50 bg-card hover:bg-muted/10"
                }`}
              >
                {m.casted && (
                  <span className="absolute top-1 right-1 bg-red-500/20 text-red-400 text-[8px] font-bold px-1 rounded flex items-center gap-0.5">
                    <Video className="size-2" /> Live
                  </span>
                )}
                <div className="space-y-1.5 font-medium">
                  <div
                    className={`flex justify-between ${m.winner === 1 ? "font-bold text-foreground" : "text-muted-foreground"}`}
                  >
                    <span className="truncate max-w-[140px]">{m.p1}</span>
                    <span>{m.s1 ?? "-"}</span>
                  </div>
                  <div
                    className={`flex justify-between ${m.winner === 2 ? "font-bold text-foreground" : "text-muted-foreground"}`}
                  >
                    <span className="truncate max-w-[140px]">{m.p2}</span>
                    <span>{m.s2 ?? "-"}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Semifinals Column */}
        <div className="flex flex-col justify-around h-[400px] flex-1 max-w-[240px]">
          <h3 className="text-center text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
            Semifinals
          </h3>
          {["m5", "m6"].map((id) => {
            const m = getMatchByNodeId(id);
            if (!m) {
              return null;
            }
            return (
              <button
                key={m.id}
                onClick={() => setSelectedMatch(m)}
                className={`p-3 rounded-lg border text-left text-xs transition-all w-full cursor-pointer relative ${
                  selectedMatch?.id === m.id
                    ? "border-primary bg-primary/10 shadow-lg ring-1 ring-primary"
                    : "border-border hover:border-primary/50 bg-card hover:bg-muted/10"
                }`}
              >
                {m.casted && (
                  <span className="absolute top-1 right-1 bg-red-500/20 text-red-400 text-[8px] font-bold px-1 rounded flex items-center gap-0.5">
                    <Video className="size-2" /> Live
                  </span>
                )}
                <div className="space-y-1.5 font-medium">
                  <div
                    className={`flex justify-between ${m.winner === 1 ? "font-bold text-foreground" : "text-muted-foreground"}`}
                  >
                    <span className="truncate max-w-[140px]">{m.p1}</span>
                    <span>{m.s1 ?? "-"}</span>
                  </div>
                  <div
                    className={`flex justify-between ${m.winner === 2 ? "font-bold text-foreground" : "text-muted-foreground"}`}
                  >
                    <span className="truncate max-w-[140px]">{m.p2}</span>
                    <span>{m.s2 ?? "-"}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Finals Column */}
        <div className="flex flex-col justify-around h-[400px] flex-1 max-w-[240px]">
          <h3 className="text-center text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
            Finals
          </h3>
          {["m7"].map((id) => {
            const m = getMatchByNodeId(id);
            if (!m) {
              return null;
            }
            return (
              <button
                key={m.id}
                onClick={() => setSelectedMatch(m)}
                className={`p-4 rounded-xl border text-left text-xs transition-all w-full cursor-pointer relative ${
                  selectedMatch?.id === m.id
                    ? "border-primary bg-primary/10 shadow-lg ring-1 ring-primary"
                    : "border-border hover:border-primary/50 bg-card hover:bg-muted/10"
                }`}
              >
                {m.casted && (
                  <span className="absolute top-1 right-1 bg-red-500/20 text-red-400 text-[8px] font-bold px-1 rounded flex items-center gap-0.5">
                    <Video className="size-2" /> Live
                  </span>
                )}
                <div className="space-y-2 font-medium">
                  <div
                    className={`flex justify-between ${m.winner === 1 ? "font-bold text-foreground" : "text-muted-foreground"}`}
                  >
                    <span className="truncate max-w-[130px]">{m.p1}</span>
                    <span>{m.s1 ?? "-"}</span>
                  </div>
                  <div
                    className={`flex justify-between ${m.winner === 2 ? "font-bold text-foreground" : "text-muted-foreground"}`}
                  >
                    <span className="truncate max-w-[130px]">{m.p2}</span>
                    <span>{m.s2 ?? "-"}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Match Panel */}
      {selectedMatch ? (
        <Card className="border border-primary/20 bg-primary/5 rounded-xl shadow-sm p-5 animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-xl mx-auto">
          <CardContent className="p-0 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-border/50">
              <div>
                <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full capitalize">
                  {selectedMatch.round}
                </span>
                <h4 className="font-extrabold text-sm mt-1">
                  {selectedMatch.p1} vs {selectedMatch.p2}
                </h4>
              </div>
              <span
                className={`text-xs font-bold ${selectedMatch.status === "completed" ? "text-muted-foreground" : "text-brand-yellow animate-pulse"}`}
              >
                {selectedMatch.status === "completed" ? "Final" : "Scheduled"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground block">Court</span>
                <span className="font-semibold text-foreground mt-0.5 block">
                  {selectedMatch.court}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Time</span>
                <span className="font-semibold text-foreground mt-0.5 block">
                  {selectedMatch.time}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">
                  Record status
                </span>
                <span className="font-semibold text-foreground mt-0.5 block">
                  {selectedMatch.casted ? "Caster Requested" : "Unrecorded"}
                </span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              {selectedMatch.casted ? (
                <div className="flex-1 flex items-center justify-center gap-1.5 p-3.5 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-semibold">
                  <Video className="size-4 shrink-0" /> Caster request pending
                </div>
              ) : (
                <Button
                  onClick={() => handleRequestCasting(selectedMatch.id)}
                  className="flex-1 rounded-lg text-xs font-semibold py-4 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Video className="size-4" /> Request match casting
                </Button>
              )}
              {selectedMatch.status === "completed" && (
                <Button
                  variant="outline"
                  className="rounded-lg text-xs font-semibold py-4 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Swords className="size-4" /> View Match Clips
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <p className="text-center text-xs text-muted-foreground py-4">
          Select any bracket matchup above to view details, court assignments,
          and request a caster.
        </p>
      )}
    </div>
  );
}
