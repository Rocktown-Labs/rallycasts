import { Button, buttonVariants } from "@rallycaststv/ui/components/button";
import { Card, CardContent } from "@rallycaststv/ui/components/card";
import { cn } from "@rallycaststv/ui/lib/utils";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Camera,
  DollarSign,
  ShieldCheck,
  Sparkles,
  Video,
} from "lucide-react";

export const Route = createFileRoute("/casters/")({
  component: CastersPage,
});

const steps = [
  {
    copy: "We help you apply, verify your setup, and start the background-check flow.",
    icon: ShieldCheck,
    title: "Fast onboarding",
    value: "$50",
  },
  {
    copy: "Turn availability on when you can record. Requests are assigned by coverage, quality, and fit.",
    icon: CalendarClock,
    title: "Accept nearby jobs",
    value: "Flexible",
  },
  {
    copy: "Record the games, upload the footage, and let RallyCasts handle delivery.",
    icon: Video,
    title: "Capture the match",
    value: "Clean clips",
  },
  {
    copy: "Premium casters get paid for match coverage, events, and organizer work.",
    icon: DollarSign,
    title: "Earn weekly",
    value: "$40-60/hr",
  },
] as const;

const tiers = [
  "Player premium: better discovery, saved parks, deeper analytics.",
  "Caster premium: onboarding, verification, priority tools, payout support.",
  "Organizer premium: event pages, recording packages, sponsor-ready media.",
] as const;

function CastersPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-4 animate-in fade-in duration-300">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-primary p-6 text-white shadow-xl sm:p-8">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-md bg-secondary/20 px-2.5 py-1 text-xs font-semibold text-[#bcdf21]">
            <Sparkles className="size-3" />
            <span>Premium Caster Onboarding Open</span>
          </div>
          <h1 className="text-3xl font-logo sm:text-4xl tracking-wide lowercase">
            casters
          </h1>
          <p className="text-sm text-gray-200 sm:text-base leading-relaxed">
            Get paid to record local pickleball matches. RallyCasts is building
            the on-demand camera crew for local pickleball.
          </p>
        </div>
      </div>

      <section className="grid min-h-[28rem] items-center gap-8 border-b border-border py-6 lg:grid-cols-[1.05fr_.95fr]">
        <div>
          <h2 className="text-3xl font-bold tracking-normal md:text-5xl">
            Get paid to record pickleball matches.
          </h2>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground">
            Casters do not get publicly browsed like profiles; they are assigned
            to requests based on location, reliability, and match needs.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/onboarding"
              className={cn(buttonVariants(), "rounded-md font-semibold")}
            >
              Start caster onboarding
              <ArrowRight className="size-4" />
            </Link>
            <Link to="/u/casts/new">
              <Button
                className="rounded-md font-semibold cursor-pointer"
                variant="outline"
              >
                <Video className="mr-1.5 size-4 text-emerald-500" />
                Need a caster? Order hours ($20/hr)
              </Button>
            </Link>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            $50 guided onboarding • Background-check support • Weekly payouts
          </p>
        </div>
        <Card className="overflow-hidden rounded-lg">
          <CardContent className="space-y-5 p-6">
            <div className="rounded-lg border border-primary/25 bg-primary/10 p-5">
              <Camera className="size-8 text-primary" />
              <h2 className="mt-4 text-2xl font-bold">
                The premium path is for people who want to be operational fast.
              </h2>
              <p className="mt-3 text-sm text-muted-foreground">
                We help you prepare the basics, understand quality standards,
                and get ready for paid requests without turning the app into a
                public caster directory.
              </p>
            </div>
            <div className="grid gap-3">
              {tiers.map((tier) => (
                <div
                  key={tier}
                  className="flex items-start gap-3 rounded-md border border-border p-3 text-sm"
                >
                  <BadgeCheck className="mt-0.5 size-4 text-primary" />
                  <span>{tier}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">How caster work happens</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Players and organizers request coverage. RallyCasts handles
            assignment. Repeat requests unlock after trust and match history,
            similar to asking for a preferred pro once you have worked together.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {steps.map(({ copy, icon: Icon, title, value }, index) => (
            <Card key={title} className="rounded-lg">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold text-muted">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="grid size-10 place-items-center rounded-md bg-primary/15 text-primary">
                    <Icon className="size-5" />
                  </span>
                </div>
                <h3 className="mt-6 font-semibold">{title}</h3>
                <p className="mt-1 text-sm font-semibold text-primary">
                  {value}
                </p>
                <p className="mt-3 text-sm text-muted-foreground">{copy}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
