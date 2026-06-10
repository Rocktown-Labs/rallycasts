import { Button } from "@rallycaststv/ui/components/button";
import { createFileRoute } from "@tanstack/react-router";
import { Calendar, Eye, User, Video } from "lucide-react";

export const Route = createFileRoute("/_auth/u/history")({
  component: HistoryPage,
});

const history = [
  {
    duration: "32:15",
    title: "Championship Finals - Smith vs. Jones",
    watched: "2026-06-01",
  },
  {
    duration: "15:42",
    title: "Tournament Highlights - Summer Open",
    watched: "2026-06-03",
  },
  {
    duration: "45:30",
    title: "Training Session with Coach Williams",
    watched: "2026-06-04",
  },
];

function HistoryPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <h1 className="text-3xl font-bold">Your History</h1>
      <div className="flex w-fit rounded-md bg-muted p-1">
        <Button className="rounded-md" size="sm">
          <Video className="size-4" /> Videos
        </Button>
        <Button size="sm" variant="ghost">
          <User className="size-4" /> Profiles
        </Button>
        <Button size="sm" variant="ghost">
          <Calendar className="size-4" /> Events
        </Button>
      </div>
      <div className="rounded-lg border border-border p-6">
        <h2 className="mb-5 flex items-center gap-2 text-xl font-bold">
          <Video className="size-5 text-primary" />
          Watched Videos
        </h2>
        <div className="divide-y divide-border">
          {history.map((item) => (
            <div
              key={item.title}
              className="grid gap-4 py-5 md:grid-cols-[9rem_1fr_auto] md:items-center"
            >
              <div className="relative aspect-video rounded-md bg-muted">
                <span className="absolute right-2 bottom-2 rounded bg-black/80 px-1.5 py-0.5 text-xs text-white">
                  {item.duration}
                </span>
              </div>
              <div>
                <h3 className="font-medium text-sm">{item.title}</h3>
                <p className="text-xs text-muted-foreground">
                  Watched on {item.watched}
                </p>
              </div>
              <Button className="rounded-md text-xs" variant="outline">
                <Eye className="size-4" />
                Watch Again
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
