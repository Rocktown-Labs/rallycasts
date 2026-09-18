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
import z from "zod";

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
        <Card className="rounded-xl border border-border bg-card/60 p-2 shadow-xl backdrop-blur-md">
          <CardHeader className="pb-4 text-center">
            <CardTitle className="mt-2 text-2xl font-bold tracking-tight text-foreground">
              Check Your Email
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              We sent a verification link to your email address. Verify your
              account before signing in.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              If you do not see it, check your spam folder. You can also send a
              fresh link.
            </p>
            <Button
              onClick={() => void resendVerification()}
              disabled={isResending}
              className="h-9 w-full rounded-md bg-primary text-xs font-semibold text-brand-yellow hover:bg-primary/95"
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
    <div className="mx-auto w-full mt-10 max-w-md p-4 flex flex-col justify-center min-h-[80vh]">
      <Card className="border border-border bg-card/60 backdrop-blur-md shadow-xl rounded-xl p-2">
        <CardHeader className="text-center pb-4">
          <img
            src="/logo.svg?v=3"
            alt="RallyCasts"
            className="mx-auto mb-4 h-12 w-auto"
          />
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground mt-2">
            Create Account
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
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
          <div className="my-4 flex items-center gap-3 text-[10px] text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span>OR SIGN UP WITH EMAIL</span>
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
                      className="h-9 text-xs rounded-md bg-background/50 border-muted focus-visible:ring-primary focus-visible:border-primary"
                    />
                    {field.state.meta.errors.map((error, i) => (
                      <p
                        key={
                          typeof error === "string"
                            ? error
                            : (error as { message?: string })?.message || i
                        }
                        className="text-[10px] text-destructive font-medium"
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
                      className="h-9 text-xs rounded-md bg-background/50 border-muted focus-visible:ring-primary focus-visible:border-primary"
                    />
                    {field.state.meta.errors.map((error, i) => (
                      <p
                        key={
                          typeof error === "string"
                            ? error
                            : (error as { message?: string })?.message || i
                        }
                        className="text-[10px] text-destructive font-medium"
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
                      className="h-9 text-xs rounded-md bg-background/50 border-muted focus-visible:ring-primary focus-visible:border-primary"
                    />
                    {field.state.meta.errors.map((error, i) => (
                      <p
                        key={
                          typeof error === "string"
                            ? error
                            : (error as { message?: string })?.message || i
                        }
                        className="text-[10px] text-destructive font-medium"
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
                      className="mt-0.5 animate-in fade-in zoom-in-50 duration-200"
                    />
                    <div className="space-y-1">
                      <Label
                        htmlFor={field.name}
                        className="text-[11px] font-medium text-muted-foreground leading-normal cursor-pointer select-none"
                      >
                        I accept the{" "}
                        <a
                          href="/terms"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline font-semibold"
                        >
                          Terms of Service
                        </a>{" "}
                        and{" "}
                        <a
                          href="/privacy"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline font-semibold"
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
                          className="text-[10px] text-destructive font-medium"
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
                  className="w-full h-9 mt-2 text-xs font-semibold rounded-md bg-primary text-brand-yellow hover:bg-primary/95 transition-all shadow-md"
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
              className="text-primary dark:text-brand-yellow font-semibold hover:underline p-0 h-auto text-xs cursor-pointer"
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
