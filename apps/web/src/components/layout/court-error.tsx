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
    <div className="relative flex min-h-[calc(100vh-var(--header-height,3.5rem))] w-full flex-col items-center justify-center overflow-hidden px-4 py-16 text-center animate-in fade-in duration-200">
      {/* Subtle ambient glow backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <div className="size-80 rounded-full bg-destructive/5 blur-3xl" />
        <div className="absolute size-64 rounded-full bg-primary/5 blur-2xl" />
      </div>

      <div className="relative mx-auto flex max-w-md flex-col items-center">
        {/* Minimalist icon container */}
        <div className="relative mb-5 flex size-14 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10 text-destructive shadow-sm">
          <AlertCircle className="size-6" />
        </div>

        {/* Quiet status badge */}
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground">
          <span className="size-1.5 rounded-full bg-destructive animate-pulse" />
          {isAccountNotLinked
            ? "Account Linking Required"
            : "Something Went Wrong"}
        </div>

        {/* Content specific to account_not_linked vs generic runtime error */}
        {isAccountNotLinked ? (
          <>
            <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Account Not Linked Yet
            </h1>
            <p className="mb-8 text-sm text-muted-foreground leading-relaxed">
              An account already exists with this email address. Please sign in
              with your email and password first, then connect Google under your
              Account Settings.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link to="/login">
                <Button className="h-9 rounded-lg px-4 font-medium transition-transform duration-150 ease-out active:scale-97 cursor-pointer">
                  <LogIn className="mr-2 size-3.5" />
                  Sign In with Password
                </Button>
              </Link>

              <Link to="/reset-password">
                <Button
                  className="h-9 rounded-lg border-border/80 px-4 font-medium transition-transform duration-150 ease-out active:scale-97 hover:bg-accent/10"
                  variant="outline"
                >
                  <KeyRound className="mr-2 size-3.5" />
                  Reset Password
                </Button>
              </Link>

              <Link to="/">
                <Button
                  className="h-9 rounded-lg border-border/80 px-4 font-medium transition-transform duration-150 ease-out active:scale-97 hover:bg-accent/10"
                  variant="outline"
                >
                  <Home className="mr-2 size-3.5" />
                  Home Court
                </Button>
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Unable to Load Page
            </h1>
            <p className="mb-8 text-sm text-muted-foreground leading-relaxed">
              We encountered an unexpected issue loading this section. You can
              try refreshing the page or head back to home court.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                className="h-9 rounded-lg px-4 font-medium transition-transform duration-150 ease-out active:scale-97 cursor-pointer"
                onClick={handleRetry}
                type="button"
              >
                <RotateCcw className="mr-2 size-3.5" />
                Try Again
              </Button>

              <Link to="/">
                <Button
                  className="h-9 rounded-lg border-border/80 px-4 font-medium transition-transform duration-150 ease-out active:scale-97 hover:bg-accent/10"
                  variant="outline"
                >
                  <Home className="mr-2 size-3.5" />
                  Back to Home Court
                </Button>
              </Link>
            </div>
          </>
        )}

        {/* Technical Error Details Drawer */}
        {(resolvedCode || rawMessage || errorDescription) && (
          <div className="mt-8 w-full max-w-sm text-left">
            <button
              className="flex w-full items-center justify-between rounded-lg border border-border/60 bg-card/40 px-3.5 py-2 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground cursor-pointer"
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              type="button"
            >
              <span className="flex items-center gap-1.5 font-medium">
                <AlertCircle className="size-3.5 text-destructive" />
                Diagnostic Details
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
        <div className="mt-6 text-xs text-muted-foreground">
          <button
            className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground cursor-pointer active:scale-97"
            onClick={() => window.history.back()}
            type="button"
          >
            <ArrowLeft className="size-3.5" />
            Go back to previous page
          </button>
        </div>
      </div>
    </div>
  );
};
