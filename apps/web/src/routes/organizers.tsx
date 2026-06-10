import { buttonVariants } from "@rallycaststv/ui/components/button";
import { Card, CardContent } from "@rallycaststv/ui/components/card";
import { cn } from "@rallycaststv/ui/lib/utils";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  Megaphone,
  Trophy,
  Video,
} from "lucide-react";

export const Route = createFileRoute("/organizers")({
  component: OrganizersPage,
});

const features = [
  {
    copy: "Give leagues, clinics, and tournaments a home that players can discover nearby.",
    icon: CalendarDays,
    title: "Publish event pages",
  },
  {
    copy: "Request RallyCasts coverage for finals, featured courts, and sponsor reels.",
    icon: Video,
    title: "Bundle recording",
  },
  {
    copy: "Promote events into local discovery where active players already look for games.",
    icon: Megaphone,
    title: "Grow attendance",
  },
] as const;

function OrganizersPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-10">
      <section className="rounded-lg border border-border bg-[linear-gradient(135deg,hsl(142_100%_18%/.22),transparent_58%,hsl(78_100%_60%/.12))] p-8">
        <Trophy className="size-10 text-primary" />
        <h1 className="mt-6 max-w-3xl text-4xl font-bold md:text-5xl">
          Upgrade to an organizer account.
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Organizer premium is for leagues, clubs, parks, and tournaments that
          want discoverable events, recording packages, and better player
          turnout.
        </p>
        <div className="mt-8">
          <Link to="/onboarding" className={cn(buttonVariants(), "rounded-md")}>
            Start organizer upgrade
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {features.map(({ copy, icon: Icon, title }) => (
          <Card key={title} className="rounded-lg">
            <CardContent className="p-6">
              <span className="grid size-10 place-items-center rounded-md bg-primary/15 text-primary">
                <Icon className="size-5" />
              </span>
              <h2 className="mt-5 font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{copy}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
