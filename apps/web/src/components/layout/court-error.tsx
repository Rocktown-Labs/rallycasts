import { Button } from "@rallycaststv/ui/components/button";
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Home,
  KeyRound,
  LogIn,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import { useState } from "react";

interface CourtErrorProps {
  error?: Error | unknown;
  errorCode?: string | null;
  errorDescription?: string | null;
  reset?: () => void;
}

const getErrorMessage = (error: Error | unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "";
};

export const CourtError = ({
  error,
  errorCode,
  errorDescription,
  reset,
}: CourtErrorProps) => {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const rawMessage = getErrorMessage(error);

  const resolvedCode = (
    errorCode ||
    (rawMessage.includes("account_not_linked") ? "account_not_linked" : "")
  ).toLowerCase();

  const isAccountNotLinked = resolvedCode === "account_not_linked";

  const handleRetry = () => {
    if (reset) {
      reset();
      return;
    }
    window.location.reload();
  };

  return (
    <div className="relative flex min-h-[calc(100vh-var(--header-height,3.5rem))] w-full flex-col items-center justify-center overflow-hidden px-4 py-16 text-center">
      {/* Background glow effects */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <div className="size-96 rounded-full bg-destructive/10 blur-3xl" />
        <div className="absolute size-80 rounded-full bg-brand-yellow/10 blur-2xl" />
      </div>

      <div className="relative mx-auto flex max-w-lg flex-col items-center">
        {/* Court Graphic / Pickleball Net Illustration */}
        <div className="relative mb-6 flex items-center justify-center">
          <svg
            aria-hidden="true"
            className="h-40 w-72 drop-shadow-xl sm:h-48 sm:w-80"
            fill="none"
            viewBox="0 0 320 180"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Court surface */}
            <rect
              className="fill-card stroke-border"
              height="130"
              rx="10"
              strokeWidth="2"
              width="280"
              x="20"
              y="25"
            />

            {/* The Kitchen line */}
            <rect
              className="fill-primary/10 stroke-primary/40"
              height="110"
              strokeWidth="1.5"
              width="70"
              x="125"
              y="35"
            />

            {/* Net posts */}
            <rect
              className="fill-muted-foreground"
              height="120"
              rx="2"
              width="6"
              x="157"
              y="30"
            />

            {/* Net mesh */}
            <line
              className="stroke-border"
              strokeDasharray="4 2"
              strokeWidth="2"
              x1="160"
              x2="160"
              y1="30"
              y2="150"
            />
            <line
              className="stroke-foreground/50"
              strokeWidth="2.5"
              x1="155"
              x2="165"
              y1="30"
              y2="30"
            />

            {/* Fault flash / net tape ball collision */}
            <g transform="translate(160, 75)">
              {/* Ball caught in net tape */}
              <circle
                className="fill-brand-yellow stroke-black/50"
                r="16"
                strokeWidth="1.5"
              />
              {/* Ball holes */}
              <circle className="fill-black/30" cx="-5" cy="-5" r="2" />
              <circle className="fill-black/30" cx="4" cy="-6" r="1.8" />
              <circle className="fill-black/30" cx="6" cy="1" r="2" />
              <circle className="fill-black/30" cx="-2" cy="0" r="2.2" />
              <circle className="fill-black/30" cx="-6" cy="5" r="1.8" />
              <circle className="fill-black/30" cx="2" cy="6" r="2" />

              {/* Warning exclamation badge on the ball */}
              <circle className="fill-destructive" cx="12" cy="-10" r="7" />
              <text
                className="fill-white text-[9px] font-black"
                dominantBaseline="central"
                textAnchor="middle"
                x="12"
                y="-10"
              >
                !
              </text>
            </g>

            {/* Net cord vibration arcs */}
            <path
              className="stroke-destructive/60"
              d="M 160 55 Q 175 75, 160 95"
              strokeLinecap="round"
              strokeWidth="1.5"
            />
          </svg>
        </div>

        {/* Status Pill */}
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-destructive/30 bg-destructive/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-destructive">
          <ShieldAlert className="size-3.5" />
          {isAccountNotLinked
            ? "Account Linking Required"
            : "Court Fault Detected"}
        </div>

        {/* Content specific to account_not_linked vs generic fault */}
        {isAccountNotLinked ? (
          <>
            <h1 className="mb-3 text-2xl font-black tracking-tight text-foreground sm:text-3xl md:text-4xl">
              Account Not Linked Yet
            </h1>
            <p className="mb-8 max-w-md text-sm text-muted-foreground sm:text-base leading-relaxed">
              An account already exists with this email address. For your
              security, please sign in with your email and password first, then
              connect Google under your Account Settings.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link to="/login">
                <Button className="h-10 rounded-lg bg-primary px-5 font-semibold text-brand-yellow hover:bg-primary/90 shadow-lg shadow-primary/20">
                  <LogIn className="mr-2 size-4" />
                  Sign In with Password
                </Button>
              </Link>

              <Link to="/reset-password">
                <Button
                  className="h-10 rounded-lg border-border/80 px-4 font-medium hover:bg-accent/10"
                  variant="outline"
                >
                  <KeyRound className="mr-2 size-4 text-brand-yellow" />
                  Reset Password
                </Button>
              </Link>

              <Link to="/">
                <Button
                  className="h-10 rounded-lg border-border/80 px-4 font-medium hover:bg-accent/10"
                  variant="outline"
                >
                  <Home className="mr-2 size-4" />
                  Home Court
                </Button>
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="mb-3 text-2xl font-black tracking-tight text-foreground sm:text-3xl md:text-4xl">
              Foot Fault in the Kitchen
            </h1>
            <p className="mb-8 max-w-md text-sm text-muted-foreground sm:text-base leading-relaxed">
              Something caught the net cord on this play. We&apos;ve flagged the
              referee and our court crew is on it. Let&apos;s replay the point.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                className="h-10 rounded-lg bg-primary px-5 font-semibold text-brand-yellow hover:bg-primary/90 shadow-lg shadow-primary/20"
                onClick={handleRetry}
                type="button"
              >
                <RotateCcw className="mr-2 size-4" />
                Replay Point (Try Again)
              </Button>

              <Link to="/">
                <Button
                  className="h-10 rounded-lg border-border/80 px-4 font-medium hover:bg-accent/10"
                  variant="outline"
                >
                  <Home className="mr-2 size-4" />
                  Back to Home Court
                </Button>
              </Link>
            </div>
          </>
        )}

        {/* Technical Error Details Drawer */}
        {(resolvedCode || rawMessage || errorDescription) && (
          <div className="mt-8 w-full max-w-md text-left">
            <button
              className="flex w-full items-center justify-between rounded-lg border border-border/60 bg-card/40 px-3.5 py-2 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground"
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              type="button"
            >
              <span className="flex items-center gap-1.5 font-medium">
                <AlertCircle className="size-3.5 text-destructive" />
                Match Diagnostic Details
              </span>
              {showTechnicalDetails ? (
                <ChevronUp className="size-3.5" />
              ) : (
                <ChevronDown className="size-3.5" />
              )}
            </button>

            {showTechnicalDetails && (
              <div className="mt-2 rounded-lg border border-border/80 bg-muted/40 p-3 text-xs font-mono text-muted-foreground break-all">
                {resolvedCode && (
                  <p>
                    <span className="text-foreground font-semibold">Code:</span>{" "}
                    {resolvedCode}
                  </p>
                )}
                {errorDescription && (
                  <p className="mt-1">
                    <span className="text-foreground font-semibold">
                      Description:
                    </span>{" "}
                    {errorDescription}
                  </p>
                )}
                {rawMessage && (
                  <p className="mt-1">
                    <span className="text-foreground font-semibold">
                      Message:
                    </span>{" "}
                    {rawMessage}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Go back helper */}
        <div className="mt-8 text-xs text-muted-foreground">
          <button
            className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
            onClick={() => window.history.back()}
            type="button"
          >
            <ArrowLeft className="size-3.5" />
            Go back to previous play
          </button>
        </div>
      </div>
    </div>
  );
};
