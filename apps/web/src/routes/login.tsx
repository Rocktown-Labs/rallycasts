import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import z from "zod";

import ForgotPasswordForm from "@/components/forgot-password-form";
import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";

const RouteComponent = () => {
  const { mode } = useSearch({ from: "/login" });
  const [activeMode, setActiveMode] = useState<"signin" | "signup" | "forgot">(
    mode ?? "signin"
  );

  useEffect(() => {
    if (mode) {
      setActiveMode(mode);
    }
  }, [mode]);

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
  mode: z.enum(["signin", "signup", "forgot"]).optional(),
});

export const Route = createFileRoute("/login")({
  component: RouteComponent,
  validateSearch: loginSearchSchema,
});
