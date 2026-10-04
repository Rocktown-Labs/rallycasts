import { buttonVariants } from "@rallycaststv/ui/components/button";
import { Card, CardContent } from "@rallycaststv/ui/components/card";
import { cn } from "@rallycaststv/ui/lib/utils";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Camera,
  DollarSign,
  HeartHandshake,
  MapPin,
  ShieldCheck,
  Smartphone,
  Users,
  Video,
} from "lucide-react";

export const Route = createFileRoute("/casters/")({
  component: CastersPage,
});

const heroPrimaryCta = cn(
  buttonVariants(),
  "h-10 cursor-pointer rounded-lg bg-[#bcdf21] px-5 text-sm font-semibold text-black hover:bg-[#d3f34b] active:scale-97"
);

const heroOutlineCta = cn(
  buttonVariants({ variant: "outline" }),
  "h-10 cursor-pointer rounded-lg border-white/25 bg-transparent px-5 text-sm font-semibold text-white hover:bg-white/10 hover:text-white active:scale-97"
);

const solidCta = cn(
  buttonVariants(),
  "h-10 cursor-pointer rounded-lg px-5 text-sm font-semibold active:scale-97"
);

const heroStats = [
  {
    caption: "Tournaments, events, and organizer work",
    icon: DollarSign,
    label: "Premium coverage pay",
    value: "$40-60/hr",
  },
  {
    caption: "Accept the jobs you want",
    icon: CalendarClock,
    label: "Your schedule",
    value: "Flexible",
  },
  {
    caption: "Tripod recommended, not required",
    icon: Smartphone,
    label: "Your gear",
    value: "Your phone",
  },
] as const;

const steps = [
  {
    copy: "Apply in one sitting, verify your setup, and start the background-check flow the same day.",
    icon: ShieldCheck,
    title: "Start express onboarding",
    value: "$50",
  },
  {
    copy: "Flip availability on when you can film. Jobs are assigned by coverage area, quality, and fit.",
    icon: CalendarClock,
    title: "Accept nearby jobs",
    value: "Flexible",
  },
  {
    copy: "Show up, film the match, and upload the footage. RallyCasts handles delivery to the players.",
    icon: Video,
    title: "Capture the match",
    value: "Clean clips",
  },
  {
    copy: "Premium casters earn for match coverage, events, and organizer work, paid out weekly.",
    icon: DollarSign,
    title: "Get paid weekly",
    value: "$40-60/hr",
  },
] as const;

const requesterFacts = [
  { copy: "$20/hr standard rate", icon: DollarSign },
  { copy: "Split the cost with your group", icon: Users },
  { copy: "Add a tip for great work", icon: HeartHandshake },
  { copy: "Verified casters near you", icon: ShieldCheck },
] as const;

const expressBenefits = [
  {
    copy: "Your application is reviewed by the RallyCasts team, not left in a queue.",
    title: "24-hour express review",
  },
  {
    copy: "Displayed on your profile and stream feeds.",
    title: "Verified Caster badge",
  },
  {
    copy: "Phone, tripod, and audio checked so match day goes smoothly.",
    title: "Setup verification",
  },
  {
    copy: "First in line for sanctioned tournaments and club events.",
    title: "Priority assignment",
  },
  {
    copy: "Help getting set up with weekly payouts.",
    title: "Payout support",
  },
] as const;

const faqs = [
  {
    answer:
      "No. A modern phone and a tripod cover most bookings. Onboarding includes a setup check, and if you later want to stream from OBS or a second camera, that path exists too.",
    question: "Do I need pro camera gear?",
  },
  {
    answer:
      "Casters are not a public directory. When a player or organizer books coverage, RallyCasts assigns a caster based on location, availability, and track record. Good work earns the next job.",
    question: "How do jobs find me?",
  },
  {
    answer:
      "Weekly. Match coverage, events, and organizer work all pay out on the same cadence, so a full weekend of filming turns into one predictable payout.",
    question: "When do I get paid?",
  },
  {
    answer:
      "The $50 covers the work of checking you in properly: a 24-hour application review, setup verification, and background-check support. It is one time, and nothing is charged at signup.",
    question: "Why is there an onboarding fee?",
  },
] as const;

function CastersPage() {
  return (
    <main className="animate-in fade-in mx-auto max-w-7xl space-y-12 px-4 py-6 duration-300">
      <CasterHero />
      <HowItWorks />
      <RequesterBand />
      <ExpressOnboarding />
      <FaqSection />
      <FinalCta />
    </main>
  );
}

function CasterHero() {
  return (
    <section className="bg-primary overflow-hidden rounded-3xl p-8 text-white shadow-xl md:p-12">
      <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_.95fr]">
        <div className="max-w-xl">
          <p className="flex items-center gap-2 text-xs font-bold tracking-[0.22em] text-[#bcdf21] uppercase">
            <Camera className="size-4" />
            Express caster onboarding is open
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-balance md:text-6xl">
            Get paid to record pickleball matches.
          </h1>
          <p className="mt-5 max-w-lg text-sm leading-relaxed text-white/75 md:text-base">
            RallyCasts is the on-demand camera crew for local pickleball.
            Players and organizers book a caster by the hour. You film on your
            phone, upload the footage, and get paid weekly.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link className={heroPrimaryCta} to="/onboarding">
              Start caster onboarding
              <ArrowRight className="size-4" />
            </Link>
            <Link className={heroOutlineCta} to="/u/casts/new">
              <Video className="size-4" />
              Need a caster? Order hours ($20/hr)
            </Link>
          </div>
          <p className="mt-5 text-xs text-white/60">
            $50 guided onboarding · Background-check support · Weekly payouts
          </p>
        </div>
        <RequestSlip />
      </div>
      <div className="mt-10 grid gap-3 sm:grid-cols-3">
        {heroStats.map(({ caption, icon: Icon, label, value }) => (
          <div
            className="rounded-lg border border-white/15 bg-black/15 p-4 backdrop-blur-sm"
            key={label}
          >
            <div className="flex items-center gap-2 text-xs text-white/75">
              <Icon className="size-4 text-[#bcdf21]" />
              {label}
            </div>
            <p className="mt-2 text-2xl font-black">{value}</p>
            <p className="text-[11px] text-white/60">{caption}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function RequestSlip() {
  return (
    <div>
      <div className="rounded-2xl border border-white/15 bg-black/25 p-5 shadow-2xl shadow-black/20 backdrop-blur-md sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-xs font-semibold text-white/85">
            <span className="size-2 rounded-full bg-[#bcdf21]" />
            New coverage request
          </p>
          <span className="bg-secondary/20 rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wider text-[#bcdf21] uppercase">
            Near you
          </span>
        </div>
        <h3 className="mt-4 text-lg font-bold text-white">
          Crestwood Pickleball Park
        </h3>
        <div className="mt-1.5 space-y-1 text-xs text-white/70">
          <p className="flex items-center gap-1.5">
            <CalendarClock className="size-3.5" />
            Saturday, 9:00 to 11:00 AM
          </p>
          <p className="flex items-center gap-1.5">
            <MapPin className="size-3.5" />
            Court 4 · 4 players
          </p>
        </div>
        <div className="mt-5 space-y-2.5 border-t border-white/10 pt-4 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-white/60">Hours booked</span>
            <span className="font-semibold">2</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/60">Standard rate</span>
            <span className="font-semibold">$20/hr</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/60">Caster tip</span>
            <span className="font-semibold">$5</span>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-4 text-xs">
          <BadgeCheck className="size-4 shrink-0 text-[#bcdf21]" />
          <span className="text-white/85">
            Caster matched by location and track record
          </span>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-white/50">
        A typical Saturday request, the kind that lands in your queue.
      </p>
    </div>
  );
}

function HowItWorks() {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-primary text-xs font-bold tracking-[0.18em] uppercase">
          How it works
        </p>
        <h2 className="mt-1.5 text-3xl font-black tracking-tight md:text-4xl">
          From signup to filmed match
        </h2>
        <p className="text-muted-foreground mt-3 max-w-2xl text-sm leading-relaxed md:text-base">
          Requests come in from players and organizers, and RallyCasts assigns
          each job by location, quality, and fit. Once you film with someone,
          they can request you again for future matches, like asking for a
          preferred pro.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {steps.map(({ copy, icon: Icon, title, value }, index) => (
          <Card className="rounded-xl" key={title}>
            <CardContent className="px-5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground/40 text-2xl font-black tracking-tight">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="bg-primary/10 text-primary grid size-10 place-items-center rounded-lg">
                  <Icon className="size-5" />
                </span>
              </div>
              <h3 className="mt-5 text-sm font-semibold">{title}</h3>
              <span className="bg-primary/10 text-primary mt-2 inline-flex w-fit rounded-md px-2 py-0.5 text-xs font-semibold">
                {value}
              </span>
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                {copy}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function RequesterBand() {
  return (
    <section className="border-primary/15 overflow-hidden rounded-3xl border bg-[linear-gradient(135deg,hsl(142_100%_18%/.07),hsl(78_100%_60%/.07))] p-6 sm:p-8 md:p-10">
      <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_.9fr]">
        <div>
          <p className="text-primary text-xs font-bold tracking-[0.18em] uppercase">
            For players and organizers
          </p>
          <h2 className="mt-1.5 text-3xl font-black tracking-tight md:text-4xl">
            Need a caster for your next match?
          </h2>
          <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-relaxed md:text-base">
            Tell us the park, the court, and the time window. We assign a
            verified local caster with a phone, a tripod, and a good eye for the
            game. Split the cost with your group, add a tip, and watch the
            footage in the app after the match.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className={solidCta} to="/u/casts/new">
              <Video className="size-4" />
              Order caster hours
            </Link>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {requesterFacts.map(({ copy, icon: Icon }) => (
            <div
              className="border-primary/15 bg-card/80 flex items-center gap-2.5 rounded-lg border px-3.5 py-3 text-sm font-medium"
              key={copy}
            >
              <span className="bg-primary/10 text-primary grid size-8 shrink-0 place-items-center rounded-md">
                <Icon className="size-4" />
              </span>
              {copy}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ExpressOnboarding() {
  return (
    <section className="grid items-center gap-8 lg:grid-cols-[.95fr_1.05fr]">
      <div>
        <p className="text-primary text-xs font-bold tracking-[0.18em] uppercase">
          Express onboarding
        </p>
        <h2 className="mt-1.5 text-3xl font-black tracking-tight md:text-4xl">
          What the $50 gets you
        </h2>
        <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-relaxed md:text-base">
          Express is for casters who want to be operational fast. You apply, we
          verify your setup, and you come out verified, background-checked, and
          first in line for tournament coverage.
        </p>
        <p className="text-muted-foreground mt-4 max-w-xl text-sm leading-relaxed">
          You don&apos;t pay the $50 at signup. It is collected once your setup
          review is complete.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className={solidCta} to="/onboarding">
            Start caster onboarding
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
      <Card className="rounded-2xl py-6">
        <CardContent className="px-6">
          <p className="text-muted-foreground text-xs font-bold tracking-[0.18em] uppercase">
            Included in express
          </p>
          <div className="mt-5 space-y-4">
            {expressBenefits.map(({ copy, title }) => (
              <div className="flex items-start gap-3" key={title}>
                <BadgeCheck className="text-primary mt-0.5 size-4 shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold">{title}</h3>
                  <p className="text-muted-foreground mt-0.5 text-sm">{copy}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function FaqSection() {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-primary text-xs font-bold tracking-[0.18em] uppercase">
          Questions
        </p>
        <h2 className="mt-1.5 text-3xl font-black tracking-tight md:text-4xl">
          Before you sign up
        </h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {faqs.map(({ answer, question }) => (
          <div
            className="border-border/60 bg-card rounded-xl border p-5 shadow-xs"
            key={question}
          >
            <h3 className="text-sm font-semibold">{question}</h3>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              {answer}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="bg-primary overflow-hidden rounded-3xl p-8 text-center text-white shadow-xl md:p-12">
      <h2 className="text-3xl font-black tracking-tight text-balance md:text-5xl">
        Courts near you need filming.
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-sm text-white/75 md:text-base">
        Start express onboarding and pick up your first job at a park near you.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link className={heroPrimaryCta} to="/onboarding">
          Start caster onboarding
          <ArrowRight className="size-4" />
        </Link>
        <Link className={heroOutlineCta} to="/u/casts/new">
          <Video className="size-4" />
          Need a caster? Order hours ($20/hr)
        </Link>
      </div>
      <p className="mt-5 text-xs text-white/60">
        $50 guided onboarding · Background-check support · Weekly payouts
      </p>
    </section>
  );
}
