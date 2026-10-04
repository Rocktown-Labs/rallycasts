import {
  useSendVerificationEmail,
  useSignInEmail,
  useSignInSocial,
} from "@better-auth-ui/react";
import { Button } from "@rallycaststv/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rallycaststv/ui/components/card";
import { Input } from "@rallycaststv/ui/components/input";
import { Label } from "@rallycaststv/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { authClient } from "@/lib/auth-client";
import { getAuthErrorCode, getAuthErrorMessage } from "@/lib/auth-errors";

import Loader from "./loader";

const SignInForm = ({ onSwitchToSignUp }: { onSwitchToSignUp: () => void }) => {
  const navigate = useNavigate({
    from: "/",
  });
  const { isPending } = authClient.useSession();
  const [isResending, setIsResending] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const signInEmail = useSignInEmail(authClient, {
    onError: (error, variables) => {
      if (getAuthErrorCode(error) === "EMAIL_NOT_VERIFIED") {
        setVerificationEmail(variables.email);
      }
      toast.error(getAuthErrorMessage(error));
    },
    onSuccess: () => {
      navigate({ to: "/u" });
      toast.success("Sign in successful");
    },
  });
  const signInSocial = useSignInSocial(authClient, {
    onError: (error) => toast.error(getAuthErrorMessage(error)),
  });
  const sendVerificationEmail = useSendVerificationEmail(authClient);

  const signInWithGoogle = () => {
    signInSocial.mutate({
      callbackURL: new URL("/onboarding", window.location.origin).toString(),
      errorCallbackURL: new URL("/login", window.location.origin).toString(),
      provider: "google",
    });
  };

  const resendVerification = async () => {
    if (!verificationEmail || isResending) {
      return;
    }

    setIsResending(true);
    try {
      await sendVerificationEmail.mutateAsync({
        callbackURL: new URL("/onboarding", window.location.origin).toString(),
        email: verificationEmail,
      });
      toast.success("A fresh verification link is on its way");
    } catch (error) {
      toast.error(getAuthErrorMessage(error));
    } finally {
      setIsResending(false);
    }
  };

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      try {
        await signInEmail.mutateAsync({
          callbackURL: new URL(
            "/onboarding",
            window.location.origin
          ).toString(),
          email: value.email,
          password: value.password,
        });
      } catch {
        // The mutation handler presents the Better Auth error to the user.
      }
    },
    validators: {
      onSubmit: z.object({
        email: z.string().email("Invalid email address"),
        password: z.string().min(8, "Password must be at least 8 characters"),
      }),
    },
  });

  if (isPending) {
    return <Loader />;
  }

  return (
    <div className="mx-auto mt-16 flex min-h-[70vh] w-full max-w-md flex-col justify-center p-4">
      <Card className="border-border bg-card/60 rounded-xl border p-2 shadow-xl backdrop-blur-md">
        <CardHeader className="pb-4 text-center">
          <img
            src="/logo.svg?v=3"
            alt="RallyCasts"
            className="mx-auto mb-4 h-12 w-auto"
          />
          <CardTitle className="text-foreground mt-2 text-2xl font-bold tracking-tight">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-muted-foreground text-xs">
            Sign in to access your dashboard and follow home courts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            onClick={signInWithGoogle}
            disabled={signInSocial.isPending}
            className="h-9 w-full rounded-md text-xs font-semibold"
          >
            {signInSocial.isPending ? "Connecting..." : "Continue with Google"}
          </Button>
          <div className="text-muted-foreground my-4 flex items-center gap-3 text-[10px]">
            <div className="bg-border h-px flex-1" />
            <span>OR SIGN IN WITH EMAIL</span>
            <div className="bg-border h-px flex-1" />
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
            className="space-y-4"
          >
            <div>
              <form.Field name="email">
                {(field) => (
                  <div className="space-y-1.5">
                    <Label
                      htmlFor={field.name}
                      className="text-xs font-semibold"
                    >
                      Email
                    </Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="email"
                      placeholder="you@example.com"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="bg-background/50 border-muted focus-visible:ring-primary focus-visible:border-primary h-9 rounded-md text-xs"
                    />
                    {field.state.meta.errors.map((error) => (
                      <p
                        key={error?.message}
                        className="text-destructive text-[10px] font-medium"
                      >
                        {error?.message}
                      </p>
                    ))}
                  </div>
                )}
              </form.Field>
            </div>

            <div>
              <form.Field name="password">
                {(field) => (
                  <div className="space-y-1.5">
                    <Label
                      htmlFor={field.name}
                      className="text-xs font-semibold"
                    >
                      Password
                    </Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="password"
                      placeholder="••••••••"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="bg-background/50 border-muted focus-visible:ring-primary focus-visible:border-primary h-9 rounded-md text-xs"
                    />
                    {field.state.meta.errors.map((error) => (
                      <p
                        key={error?.message}
                        className="text-destructive text-[10px] font-medium"
                      >
                        {error?.message}
                      </p>
                    ))}
                  </div>
                )}
              </form.Field>
            </div>

            <form.Subscribe
              selector={(state) => ({
                canSubmit: state.canSubmit,
                isSubmitting: state.isSubmitting,
              })}
            >
              {({ canSubmit, isSubmitting }) => (
                <Button
                  type="submit"
                  className="bg-primary text-brand-yellow hover:bg-primary/95 mt-2 h-9 w-full rounded-md text-xs font-semibold shadow-md transition-all"
                  disabled={!canSubmit || isSubmitting || signInEmail.isPending}
                >
                  {isSubmitting || signInEmail.isPending
                    ? "Signing In..."
                    : "Sign In"}
                </Button>
              )}
            </form.Subscribe>
          </form>

          {verificationEmail && (
            <div className="border-brand-yellow/40 bg-brand-yellow/10 mt-4 rounded-md border p-3 text-center">
              <p className="text-muted-foreground text-xs">
                Your email is not verified. Check your inbox or resend the
                verification link.
              </p>
              <Button
                type="button"
                variant="link"
                onClick={() => void resendVerification()}
                disabled={isResending}
                className="text-primary dark:text-brand-yellow h-auto p-0 pt-2 text-xs font-semibold hover:underline"
              >
                {isResending ? "Sending..." : "Resend verification email"}
              </Button>
            </div>
          )}

          <div className="mt-4 text-center">
            <Button
              variant="link"
              onClick={() =>
                navigate({
                  search: { mode: "forgot" },
                  to: "/login",
                })
              }
              className="text-muted-foreground hover:text-primary dark:hover:text-brand-yellow h-auto cursor-pointer p-0 text-[11px] font-medium hover:underline"
            >
              Forgot your password?
            </Button>
          </div>

          <div className="mt-4 text-center text-xs">
            <span className="text-muted-foreground">Need an account? </span>
            <Button
              variant="link"
              onClick={onSwitchToSignUp}
              className="text-primary dark:text-brand-yellow h-auto cursor-pointer p-0 text-xs font-semibold hover:underline"
            >
              Sign Up
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignInForm;
