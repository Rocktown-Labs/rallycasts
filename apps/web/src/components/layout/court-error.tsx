import { Button } from "@rallycaststv/ui/components/button";
import { Link } from "@tanstack/react-router";
import {
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

/** Compact sibling of the CourtNotFound ball: a pickleball with its holes. */
const PickleballMark = () => (
  <svg
    aria-hidden="true"
    className="size-7"
    fill="none"
    viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="16" cy="16" r="12.5" stroke="currentColor" strokeWidth="2.5" />
    <circle className="fill-current" cx="11.5" cy="12.5" r="1.5" />
    <circle className="fill-current" cx="20.5" cy="12.5" r="1.5" />
    <circle className="fill-current" cx="13" cy="21" r="1.5" />
    <circle className="fill-current" cx="19.5" cy="20" r="1.5" />
  </svg>
);

export const CourtError = ({
  error,
  errorCode,
  errorDescription,
  reset,
}: CourtErrorProps) => {
  const [showDetails, setShowDetails] = useState(false);

  const rawMessage = getErrorMessage(error);

  const resolvedCode = (
    errorCode ||
    (rawMessage.includes("account_not_linked") ? "account_not_linked" : "")
  ).toLowerCase();

  const isAccountNotLinked = resolvedCode === "account_not_linked";
  const hasDetails = Boolean(resolvedCode || errorDescription || rawMessage);

  const heading = isAccountNotLinked ? "Already on the roster." : "Rain delay.";
  const body = isAccountNotLinked
    ? "An account with this email already exists. Sign in with your password first, then connect Google from your account settings."
    : "Something went wrong on our side of the net. Give it another shot, or head back to the court.";

  const handleRetry = () => {
    if (reset) {
      reset();
      return;
    }
    window.location.reload();
  };

  return (
    <div className="animate-in fade-in flex min-h-[calc(100vh-var(--header-height,3.5rem))] w-full flex-col items-center justify-center px-4 py-16 text-center duration-200">
      <div className="mx-auto flex w-full max-w-md flex-col items-center">
        <div className="border-destructive/20 bg-destructive/10 text-destructive mb-6 flex size-14 items-center justify-center rounded-2xl border shadow-sm">
          <PickleballMark />
        </div>

        <div role="alert">
          <h1 className="text-foreground text-3xl font-black tracking-tight sm:text-4xl">
            {heading}
          </h1>
          <p className="text-muted-foreground mx-auto mt-3 max-w-sm text-sm leading-relaxed">
            {body}
          </p>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {isAccountNotLinked ? (
            <>
              <Link to="/login">
                <Button className="h-9 cursor-pointer rounded-lg px-4 font-medium transition-transform duration-150 ease-out active:scale-97">
                  <LogIn className="size-3.5" />
                  Sign In
                </Button>
              </Link>
              <Link to="/reset-password">
                <Button
                  className="hover:bg-accent/10 h-9 cursor-pointer rounded-lg px-4 font-medium transition-transform duration-150 ease-out active:scale-97"
                  variant="outline"
                >
                  <KeyRound className="size-3.5" />
                  Reset Password
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Button
                className="h-9 cursor-pointer rounded-lg px-4 font-medium transition-transform duration-150 ease-out active:scale-97"
                onClick={handleRetry}
                type="button"
              >
                <RotateCcw className="size-3.5" />
                Try Again
              </Button>
              <Link to="/">
                <Button
                  className="hover:bg-accent/10 h-9 cursor-pointer rounded-lg px-4 font-medium transition-transform duration-150 ease-out active:scale-97"
                  variant="outline"
                >
                  <Home className="size-3.5" />
                  Back to the Court
                </Button>
              </Link>
            </>
          )}
        </div>

        {hasDetails && (
          <div className="mt-8 w-full max-w-sm text-left">
            <button
              aria-controls="court-error-details"
              aria-expanded={showDetails}
              className="text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center gap-1 text-xs font-medium transition-colors"
              onClick={() => setShowDetails(!showDetails)}
              type="button"
            >
              Technical details
              {showDetails ? (
                <ChevronUp className="size-3.5" />
              ) : (
                <ChevronDown className="size-3.5" />
              )}
            </button>

            {showDetails && (
              <div
                className="border-border/80 bg-muted/40 text-muted-foreground mt-2 rounded-lg border p-3 font-mono text-xs break-all"
                id="court-error-details"
              >
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
      </div>
    </div>
  );
};
