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
import z from "zod";

import { authClient } from "@/lib/auth-client";

import Loader from "./loader";

const signInWithGoogle = async () => {
  const { error } = await authClient.signIn.social({
    callbackURL: new URL("/onboarding", window.location.origin).toString(),
    provider: "google",
  });

  if (error) {
    toast.error(error.message || error.statusText);
  }
};

const SignInForm = ({ onSwitchToSignUp }: { onSwitchToSignUp: () => void }) => {
  const navigate = useNavigate({
    from: "/",
  });
  const { isPending } = authClient.useSession();
  const [isResending, setIsResending] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");

  const resendVerification = async () => {
    if (!verificationEmail || isResending) {
      return;
    }

    setIsResending(true);
    const { error } = await authClient.sendVerificationEmail({
      callbackURL: new URL("/onboarding", window.location.origin).toString(),
      email: verificationEmail,
    });
    setIsResending(false);

    if (error) {
      toast.error(error.message || error.statusText);
      return;
    }

    toast.success("A fresh verification link is on its way");
  };

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.signIn.email(
        {
          callbackURL: new URL(
            "/onboarding",
            window.location.origin
          ).toString(),
          email: value.email,
          password: value.password,
        },
        {
          onError: (error) => {
            if (error.error.code === "EMAIL_NOT_VERIFIED") {
              setVerificationEmail(value.email);
            }
            toast.error(error.error.message || error.error.statusText);
          },
          onSuccess: () => {
            navigate({
              to: "/u",
            });
            toast.success("Sign in successful");
          },
        }
      );
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
    <div className="mx-auto w-full mt-16 max-w-md p-4 flex flex-col justify-center min-h-[70vh]">
      <Card className="border border-border bg-card/60 backdrop-blur-md shadow-xl rounded-xl p-2">
        <CardHeader className="text-center pb-4">
          <img
            src="/logo.svg?v=3"
            alt="RallyCasts"
            className="mx-auto mb-4 h-12 w-auto"
          />
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground mt-2">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Sign in to access your dashboard and follow home courts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            onClick={() => void signInWithGoogle()}
            className="h-9 w-full rounded-md text-xs font-semibold"
          >
            Continue with Google
          </Button>
          <div className="my-4 flex items-center gap-3 text-[10px] text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span>OR SIGN IN WITH EMAIL</span>
            <div className="h-px flex-1 bg-border" />
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
                      className="h-9 text-xs rounded-md bg-background/50 border-muted focus-visible:ring-primary focus-visible:border-primary"
                    />
                    {field.state.meta.errors.map((error) => (
                      <p
                        key={error?.message}
                        className="text-[10px] text-destructive font-medium"
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
                      className="h-9 text-xs rounded-md bg-background/50 border-muted focus-visible:ring-primary focus-visible:border-primary"
                    />
                    {field.state.meta.errors.map((error) => (
                      <p
                        key={error?.message}
                        className="text-[10px] text-destructive font-medium"
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
                  className="w-full h-9 mt-2 text-xs font-semibold rounded-md bg-primary text-brand-yellow hover:bg-primary/95 transition-all shadow-md"
                  disabled={!canSubmit || isSubmitting}
                >
                  {isSubmitting ? "Signing In..." : "Sign In"}
                </Button>
              )}
            </form.Subscribe>
          </form>

          {verificationEmail && (
            <div className="mt-4 rounded-md border border-brand-yellow/40 bg-brand-yellow/10 p-3 text-center">
              <p className="text-xs text-muted-foreground">
                Your email is not verified. Check your inbox or resend the
                verification link.
              </p>
              <Button
                type="button"
                variant="link"
                onClick={() => void resendVerification()}
                disabled={isResending}
                className="h-auto p-0 pt-2 text-xs font-semibold text-primary hover:underline dark:text-brand-yellow"
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
              className="text-muted-foreground hover:text-primary dark:hover:text-brand-yellow font-medium hover:underline p-0 h-auto text-[11px] cursor-pointer"
            >
              Forgot your password?
            </Button>
          </div>

          <div className="mt-4 text-center text-xs">
            <span className="text-muted-foreground">Need an account? </span>
            <Button
              variant="link"
              onClick={onSwitchToSignUp}
              className="text-primary dark:text-brand-yellow font-semibold hover:underline p-0 h-auto text-xs cursor-pointer"
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
