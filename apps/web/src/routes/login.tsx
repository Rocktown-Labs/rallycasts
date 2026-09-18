import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import z from "zod";

import ForgotPasswordForm from "@/components/forgot-password-form";
import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";

const RouteComponent = () => {
  const {
    error,
    error_description: errorDescription,
    mode,
  } = useSearch({ from: "/login" });
  const [activeMode, setActiveMode] = useState<"signin" | "signup" | "forgot">(
    mode ?? "signin"
  );

  useEffect(() => {
    if (mode) {
      setActiveMode(mode);
    }
  }, [mode]);

  useEffect(() => {
    if (error === "account_not_linked") {
      toast.error(
        "This account is not linked yet. Please sign in with your email and password, then link Google in Settings."
      );
    } else if (error) {
      toast.error(errorDescription || error);
    }
  }, [error, errorDescription]);

  if (activeMode === "forgot") {
    return (
      <ForgotPasswordForm onSwitchToSignIn={() => setActiveMode("signin")} />
    );
  }

  return activeMode === "signin" ? (
    <SignInForm onSwitchToSignUp={() => setActiveMode("signup")} />
  ) : (
    <SignUpForm onSwitchToSignIn={() => setActiveMode("signin")} />
  );
};

const loginSearchSchema = z.object({
  error: z.string().optional(),
  error_description: z.string().optional(),
  mode: z.enum(["signin", "signup", "forgot"]).optional(),
});

export const Route = createFileRoute("/login")({
  component: RouteComponent,
  validateSearch: loginSearchSchema,
});
