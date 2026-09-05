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
import z from "zod";

import { authClient } from "@/lib/auth-client";

import Loader from "./loader";

const ForgotPasswordForm = ({
  onSwitchToSignIn,
}: {
  onSwitchToSignIn: () => void;
}) => {
  const { isPending } = authClient.useSession();
  const [sent, setSent] = useState(false);

  const form = useForm({
    defaultValues: {
      email: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.requestPasswordReset(
        {
          email: value.email,
          redirectTo: new URL(
            "/reset-password",
            window.location.origin
          ).toString(),
        },
        {
          onError: (error: unknown) => {
            let message = "Failed to send reset link";
            if (error instanceof Error) {
              const { message: errorMessage } = error;
              message = errorMessage;
            } else if (
              typeof error === "object" &&
              error !== null &&
              "error" in error
            ) {
              const nestedError = error.error;
              if (
                typeof nestedError === "object" &&
                nestedError !== null &&
                "message" in nestedError
              ) {
                const { message: nestedMessage } = nestedError;
                if (typeof nestedMessage === "string") {
                  message = nestedMessage;
                }
              }
            }
            toast.error(message);
          },
          onSuccess: () => {
            setSent(true);
            toast.success("Check your email for a reset link");
          },
        }
      );
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
      <div className="mx-auto w-full mt-16 max-w-md p-4 flex flex-col justify-center min-h-[70vh]">
        <Card className="border border-border bg-card/60 backdrop-blur-md shadow-xl rounded-xl p-2">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground mt-2">
              Check Your Email
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              We have sent a password reset link to your email address
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              If you do not see it, check your spam folder. The link expires in
              1 hour.
            </p>
            <Button
              onClick={onSwitchToSignIn}
              variant="outline"
              className="w-full h-9 text-xs font-semibold rounded-md"
            >
              Back to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full mt-16 max-w-md p-4 flex flex-col justify-center min-h-[70vh]">
      <Card className="border border-border bg-card/60 backdrop-blur-md shadow-xl rounded-xl p-2">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-2 flex h-8 w-28 items-center justify-center rounded-full bg-primary text-brand-yellow font-logo text-sm lowercase">
            rallycasts
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground mt-2">
            Forgot Password?
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
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
                  {isSubmitting ? "Sending..." : "Send Reset Link"}
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

export default ForgotPasswordForm;
