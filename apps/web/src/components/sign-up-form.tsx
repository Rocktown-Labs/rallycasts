import {
  useSendVerificationEmail,
  useSignInSocial,
  useSignUpEmail,
} from "@better-auth-ui/react";
import { Button } from "@rallycaststv/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rallycaststv/ui/components/card";
import { Checkbox } from "@rallycaststv/ui/components/checkbox";
import { Input } from "@rallycaststv/ui/components/input";
import { Label } from "@rallycaststv/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { authClient } from "@/lib/auth-client";
import { getAuthErrorMessage } from "@/lib/auth-errors";

import Loader from "./loader";

const SignUpForm = ({ onSwitchToSignIn }: { onSwitchToSignIn: () => void }) => {
  const navigate = useNavigate({
    from: "/",
  });
  const { isPending } = authClient.useSession();
  const [isResending, setIsResending] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationSent, setVerificationSent] = useState(false);
  const signUpEmail = useSignUpEmail(authClient, {
    onError: (error) => toast.error(getAuthErrorMessage(error)),
  });
  const signInSocial = useSignInSocial(authClient, {
    onError: (error) => toast.error(getAuthErrorMessage(error)),
  });
  const sendVerificationEmail = useSendVerificationEmail(authClient);

  const signInWithGoogle = () => {
    signInSocial.mutate({
      callbackURL: new URL("/onboarding", window.location.origin).toString(),
      errorCallbackURL: new URL(
        "/login?mode=signup",
        window.location.origin
      ).toString(),
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
      acceptTerms: false,
      email: "",
      name: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      try {
        const data = await signUpEmail.mutateAsync({
          callbackURL: new URL(
            "/onboarding",
            window.location.origin
          ).toString(),
          email: value.email,
          name: value.name,
          password: value.password,
        });

        if (data.token) {
          navigate({ to: "/onboarding" });
          toast.success("Sign up successful");
          return;
        }

        setVerificationEmail(value.email);
        setVerificationSent(true);
        toast.success("Check your email to verify your account");
      } catch {
        // The mutation handler presents the Better Auth error to the user.
      }
    },
    validators: {
      onSubmit: z.object({
        acceptTerms: z.boolean().refine((val) => val === true, {
          message: "You must accept the Terms of Service and Privacy Policy",
        }),
        email: z.string().email("Invalid email address"),
        name: z.string().min(2, "Name must be at least 2 characters"),
        password: z.string().min(8, "Password must be at least 8 characters"),
      }),
    },
  });

  if (isPending) {
    return <Loader />;
  }

  if (verificationSent) {
    return (
      <div className="mx-auto mt-10 flex min-h-[80vh] w-full max-w-md flex-col justify-center p-4">
        <Card className="border-border bg-card/60 rounded-xl border p-2 shadow-xl backdrop-blur-md">
          <CardHeader className="pb-4 text-center">
            <CardTitle className="text-foreground mt-2 text-2xl font-bold tracking-tight">
              Check Your Email
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs">
              We sent a verification link to your email address. Verify your
              account before signing in.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-center text-sm">
              If you do not see it, check your spam folder. You can also send a
              fresh link.
            </p>
            <Button
              onClick={() => void resendVerification()}
              disabled={isResending}
              className="bg-primary text-brand-yellow hover:bg-primary/95 h-9 w-full rounded-md text-xs font-semibold"
            >
              {isResending ? "Sending..." : "Resend Verification Email"}
            </Button>
            <Button
              onClick={onSwitchToSignIn}
              variant="outline"
              className="h-9 w-full rounded-md text-xs font-semibold"
            >
              Back to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-10 flex min-h-[80vh] w-full max-w-md flex-col justify-center p-4">
      <Card className="border-border bg-card/60 rounded-xl border p-2 shadow-xl backdrop-blur-md">
        <CardHeader className="pb-4 text-center">
          <img
            src="/logo.svg?v=3"
            alt="RallyCasts"
            className="mx-auto mb-4 h-12 w-auto"
          />
          <CardTitle className="text-foreground mt-2 text-2xl font-bold tracking-tight">
            Create Account
          </CardTitle>
          <CardDescription className="text-muted-foreground text-xs">
            Sign up to start sharing court updates and follow local players
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
            <span>OR SIGN UP WITH EMAIL</span>
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
              <form.Field name="name">
                {(field) => (
                  <div className="space-y-1.5">
                    <Label
                      htmlFor={field.name}
                      className="text-xs font-semibold"
                    >
                      Name
                    </Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      placeholder="John Doe"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="bg-background/50 border-muted focus-visible:ring-primary focus-visible:border-primary h-9 rounded-md text-xs"
                    />
                    {field.state.meta.errors.map((error, i) => (
                      <p
                        key={
                          typeof error === "string"
                            ? error
                            : (error as { message?: string })?.message || i
                        }
                        className="text-destructive text-[10px] font-medium"
                      >
                        {typeof error === "string"
                          ? error
                          : (error as { message?: string })?.message}
                      </p>
                    ))}
                  </div>
                )}
              </form.Field>
            </div>

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
                    {field.state.meta.errors.map((error, i) => (
                      <p
                        key={
                          typeof error === "string"
                            ? error
                            : (error as { message?: string })?.message || i
                        }
                        className="text-destructive text-[10px] font-medium"
                      >
                        {typeof error === "string"
                          ? error
                          : (error as { message?: string })?.message}
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
                    {field.state.meta.errors.map((error, i) => (
                      <p
                        key={
                          typeof error === "string"
                            ? error
                            : (error as { message?: string })?.message || i
                        }
                        className="text-destructive text-[10px] font-medium"
                      >
                        {typeof error === "string"
                          ? error
                          : (error as { message?: string })?.message}
                      </p>
                    ))}
                  </div>
                )}
              </form.Field>
            </div>

            <div>
              <form.Field name="acceptTerms">
                {(field) => (
                  <div className="flex items-start gap-2 pt-1">
                    <Checkbox
                      id={field.name}
                      name={field.name}
                      checked={field.state.value}
                      onCheckedChange={(checked) =>
                        field.handleChange(!!checked)
                      }
                      className="animate-in fade-in zoom-in-50 mt-0.5 duration-200"
                    />
                    <div className="space-y-1">
                      <Label
                        htmlFor={field.name}
                        className="text-muted-foreground cursor-pointer text-[11px] leading-normal font-medium select-none"
                      >
                        I accept the{" "}
                        <a
                          href="/terms"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary font-semibold hover:underline"
                        >
                          Terms of Service
                        </a>{" "}
                        and{" "}
                        <a
                          href="/privacy"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary font-semibold hover:underline"
                        >
                          Privacy Policy
                        </a>
                        .
                      </Label>
                      {field.state.meta.errors.map((error, i) => (
                        <p
                          key={
                            typeof error === "string"
                              ? error
                              : (error as { message?: string })?.message || i
                          }
                          className="text-destructive text-[10px] font-medium"
                        >
                          {typeof error === "string"
                            ? error
                            : (error as { message?: string })?.message}
                        </p>
                      ))}
                    </div>
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
                  disabled={!canSubmit || isSubmitting || signUpEmail.isPending}
                >
                  {isSubmitting || signUpEmail.isPending
                    ? "Creating Account..."
                    : "Sign Up"}
                </Button>
              )}
            </form.Subscribe>
          </form>

          <div className="mt-6 text-center text-xs">
            <span className="text-muted-foreground">
              Already have an account?{" "}
            </span>
            <Button
              variant="link"
              onClick={onSwitchToSignIn}
              className="text-primary dark:text-brand-yellow h-auto cursor-pointer p-0 text-xs font-semibold hover:underline"
            >
              Sign In
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignUpForm;
