import { Button } from "@rallycaststv/ui/components/button";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Calendar, Compass, Home, Play, Users } from "lucide-react";

interface CourtNotFoundProps {
  description?: string;
  title?: string;
}

export const CourtNotFound = ({
  description = "Looks like this shot bounced way past the baseline. The court, event, or player profile you're looking for doesn't exist or has moved.",
  title = "Ball Out of Bounds",
}: CourtNotFoundProps) => (
  <div className="relative flex min-h-[calc(100vh-var(--header-height,3.5rem))] w-full flex-col items-center justify-center overflow-hidden px-4 py-16 text-center">
    {/* Background glow effects */}
    <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
      <div className="size-96 rounded-full bg-primary/15 blur-3xl" />
      <div className="absolute size-72 rounded-full bg-brand-yellow/10 blur-2xl" />
    </div>

    <div className="relative mx-auto flex max-w-xl flex-col items-center">
      {/* Pickleball Court SVG Graphic */}
      <div className="relative mb-8 flex items-center justify-center">
        <svg
          aria-hidden="true"
          className="h-48 w-80 drop-shadow-2xl sm:h-56 sm:w-96"
          fill="none"
          viewBox="0 0 380 220"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Court surface */}
          <rect
            className="fill-primary/20 stroke-primary/50"
            height="160"
            rx="12"
            strokeWidth="2"
            width="320"
            x="30"
            y="30"
          />

          {/* Baseline and sidelines */}
          <rect
            className="stroke-primary/80"
            height="140"
            rx="4"
            strokeDasharray="4 2"
            strokeWidth="1.5"
            width="300"
            x="40"
            y="40"
          />

          {/* The Kitchen / Non-Volley Zone (Left and Right) */}
          <rect
            className="fill-brand-yellow/10 stroke-brand-yellow/40"
            height="140"
            strokeWidth="1.5"
            width="90"
            x="145"
            y="40"
          />

          {/* Net line across middle */}
          <line
            className="stroke-border"
            strokeDasharray="3 3"
            strokeWidth="3"
            x1="190"
            x2="190"
            y1="30"
            y2="190"
          />
          {/* Net top cord */}
          <line
            className="stroke-foreground/60"
            strokeWidth="2"
            x1="188"
            x2="192"
            y1="25"
            y2="195"
          />

          {/* Center service lines */}
          <line
            className="stroke-primary/60"
            strokeWidth="1.5"
            x1="40"
            x2="145"
            y1="110"
            y2="110"
          />
          <line
            className="stroke-primary/60"
            strokeWidth="1.5"
            x1="235"
            x2="340"
            y1="110"
            y2="110"
          />

          {/* Out of bounds chalk impact & bouncing ball */}
          {/* Bounce trajectory line */}
          <path
            className="stroke-brand-yellow/40"
            d="M 120 110 Q 220 30, 290 170 Q 320 130, 345 185"
            strokeDasharray="4 4"
            strokeWidth="2"
          />

          {/* Chalk dust burst */}
          <ellipse
            className="fill-brand-yellow/30"
            cx="345"
            cy="185"
            rx="16"
            ry="5"
          />

          {/* The Pickleball with signature air holes */}
          <g transform="translate(345, 175)">
            <circle
              className="fill-brand-yellow stroke-black/40"
              filter="drop-shadow(0 4px 6px rgba(0,0,0,0.3))"
              r="18"
              strokeWidth="1.5"
            />
            {/* Highlight curve */}
            <path
              className="stroke-white/60"
              d="M -10 -8 A 12 12 0 0 1 8 -10"
              strokeLinecap="round"
              strokeWidth="2"
            />
            {/* Characteristic holes */}
            <circle className="fill-black/30" cx="-7" cy="-7" r="2.2" />
            <circle className="fill-black/30" cx="4" cy="-8" r="2" />
            <circle className="fill-black/30" cx="9" cy="-1" r="2.2" />
            <circle className="fill-black/30" cx="-2" cy="-1" r="2.4" />
            <circle className="fill-black/30" cx="-9" cy="4" r="2" />
            <circle className="fill-black/30" cx="2" cy="7" r="2.2" />
            <circle className="fill-black/30" cx="-5" cy="10" r="1.8" />
            <circle className="fill-black/30" cx="8" cy="7" r="1.8" />
          </g>

          {/* "OUT!" referee callout tag */}
          <g transform="translate(295, 25)">
            <rect className="fill-destructive" height="22" rx="4" width="48" />
            <text
              className="fill-white text-[11px] font-black tracking-wider"
              dominantBaseline="central"
              textAnchor="middle"
              x="24"
              y="11"
            >
              OUT!
            </text>
          </g>
        </svg>
      </div>

      {/* 404 Status Pill */}
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-yellow/30 bg-brand-yellow/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-brand-yellow">
        <span className="size-2 rounded-full bg-brand-yellow animate-pulse" />
        404 &bull; Out of Bounds
      </div>

      {/* Headlines */}
      <h1 className="mb-3 text-3xl font-black tracking-tight text-foreground sm:text-4xl md:text-5xl">
        {title}
      </h1>
      <p className="mb-8 max-w-md text-sm text-muted-foreground sm:text-base leading-relaxed">
        {description}
      </p>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link to="/">
          <Button className="h-10 rounded-lg bg-primary px-5 font-semibold text-brand-yellow hover:bg-primary/90 shadow-lg shadow-primary/20">
            <Home className="mr-2 size-4" />
            Back to Home Court
          </Button>
        </Link>

        <Link to="/events">
          <Button
            className="h-10 rounded-lg border-border/80 px-4 font-medium hover:bg-accent/10"
            variant="outline"
          >
            <Calendar className="mr-2 size-4 text-primary" />
            Find Events
          </Button>
        </Link>

        <Link to="/players">
          <Button
            className="h-10 rounded-lg border-border/80 px-4 font-medium hover:bg-accent/10"
            variant="outline"
          >
            <Users className="mr-2 size-4 text-brand-yellow" />
            Find Players
          </Button>
        </Link>
      </div>

      {/* Helpful links card */}
      <div className="mt-12 w-full rounded-xl border border-border/50 bg-card/60 p-4 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
          <Link
            className="flex items-center gap-1.5 transition-colors hover:text-foreground"
            to="/events"
          >
            <Compass className="size-3.5 text-primary" />
            Explore Tournaments
          </Link>
          <span className="text-border">&bull;</span>
          <Link
            className="flex items-center gap-1.5 transition-colors hover:text-foreground"
            to="/events/hosts"
          >
            <Play className="size-3.5 text-brand-yellow" />
            Tournament Hosts
          </Link>
          <span className="text-border">&bull;</span>
          <button
            className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
            onClick={() => window.history.back()}
            type="button"
          >
            <ArrowLeft className="size-3.5" />
            Go Back
          </button>
        </div>
      </div>
    </div>
  </div>
);
