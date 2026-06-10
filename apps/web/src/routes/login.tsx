import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import z from "zod";

import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";

const RouteComponent = () => {
  const { mode } = useSearch({ from: "/login" });
  const [showSignIn, setShowSignIn] = useState(mode === "signin");

  useEffect(() => {
    if (mode) {
      setShowSignIn(mode === "signin");
    }
  }, [mode]);

  return showSignIn ? (
    <SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
  ) : (
    <SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
  );
};

const loginSearchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
});

export const Route = createFileRoute("/login")({
  component: RouteComponent,
  validateSearch: loginSearchSchema,
});
