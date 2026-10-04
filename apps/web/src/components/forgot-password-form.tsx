import { useRequestPasswordReset } from "@better-auth-ui/react";
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
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { authClient } from "@/lib/auth-client";
import { getAuthErrorMessage } from "@/lib/auth-errors";

import Loader from "./loader";

const ForgotPasswordForm = ({
  onSwitchToSignIn,
}: {
  onSwitchToSignIn: () => void;
}) => {
  const { isPending } = authClient.useSession();
  const [sent, setSent] = useState(false);
  const requestPasswordReset = useRequestPasswordReset(authClient, {
    onError: (error) => toast.error(getAuthErrorMessage(error)),
    onSuccess: () => {
      setSent(true);
      toast.success("Check your email for a reset link");
    },
  });

  const form = useForm({
    defaultValues: {
      email: "",
    },
    onSubmit: async ({ value }) => {
      try {
        await requestPasswordReset.mutateAsync({
          email: value.email,
          redirectTo: new URL(
            "/reset-password",
            window.location.origin
          ).toString(),
        });
      } catch {
        // The mutation handler presents the Better Auth error to the user.
      }
    },
    validators: {
      onSubmit: z.object({
        email: z.string().email("Invalid email address"),
      }),
    },
  });

  if (isPending) {
    return <Loader />;
  }

  if (sent) {
    return (
      <div className="mx-auto mt-16 flex min-h-[70vh] w-full max-w-md flex-col justify-center p-4">
        <Card className="border-border bg-card/60 rounded-xl border p-2 shadow-xl backdrop-blur-md">
          <CardHeader className="pb-4 text-center">
            <CardTitle className="text-foreground mt-2 text-2xl font-bold tracking-tight">
              Check Your Email
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs">
              We have sent a password reset link to your email address
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-center text-sm">
              If you do not see it, check your spam folder. The link expires in
              1 hour.
            </p>
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
    <div className="mx-auto mt-16 flex min-h-[70vh] w-full max-w-md flex-col justify-center p-4">
      <Card className="border-border bg-card/60 rounded-xl border p-2 shadow-xl backdrop-blur-md">
        <CardHeader className="pb-4 text-center">
          <div className="bg-primary text-brand-yellow font-logo mx-auto mb-2 flex h-8 w-28 items-center justify-center rounded-full text-sm lowercase">
            rallycasts
          </div>
          <CardTitle className="text-foreground mt-2 text-2xl font-bold tracking-tight">
            Forgot Password?
          </CardTitle>
          <CardDescription className="text-muted-foreground text-xs">
            Enter your email and we will send you a reset link
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                  disabled={
                    !canSubmit || isSubmitting || requestPasswordReset.isPending
                  }
                >
                  {isSubmitting || requestPasswordReset.isPending
                    ? "Sending..."
                    : "Send Reset Link"}
                </Button>
              )}
            </form.Subscribe>
          </form>

          <div className="mt-6 text-center text-xs">
            <span className="text-muted-foreground">
              Remember your password?{" "}
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

export default ForgotPasswordForm;
