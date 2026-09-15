import { useResetPassword } from "@better-auth-ui/react";
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
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";
import { getAuthErrorMessage } from "@/lib/auth-errors";

import Loader from "./loader";

const ResetPasswordForm = () => {
  const navigate = useNavigate({ from: "/" });
  const { token } = useSearch({ from: "/reset-password" });
  const { isPending } = authClient.useSession();
  const [done, setDone] = useState(false);
  const resetPassword = useResetPassword(authClient, {
    onError: (error) => toast.error(getAuthErrorMessage(error)),
    onSuccess: () => {
      setDone(true);
      toast.success("Password reset successfully");
    },
  });

  const form = useForm({
    defaultValues: {
      confirmPassword: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      if (!token) {
        toast.error("Invalid or expired reset token");
        return;
      }

      try {
        await resetPassword.mutateAsync({
          newPassword: value.password,
          token,
        });
      } catch {
        // The mutation handler presents the Better Auth error to the user.
      }
    },
    validators: {
      onSubmit: z
        .object({
          confirmPassword: z.string(),
          password: z.string().min(8, "Password must be at least 8 characters"),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: "Passwords do not match",
          path: ["confirmPassword"],
        }),
    },
  });

  if (isPending) {
    return <Loader />;
  }

  if (done) {
    return (
      <div className="mx-auto w-full mt-16 max-w-md p-4 flex flex-col justify-center min-h-[70vh]">
        <Card className="border border-border bg-card/60 backdrop-blur-md shadow-xl rounded-xl p-2">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground mt-2">
              Password Updated
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Your password has been reset successfully
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() =>
                navigate({
                  search: { mode: "signin" },
                  to: "/login",
                })
              }
              className="w-full h-9 text-xs font-semibold rounded-md bg-primary text-brand-yellow hover:bg-primary/95 transition-all shadow-md"
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="mx-auto w-full mt-16 max-w-md p-4 flex flex-col justify-center min-h-[70vh]">
        <Card className="border border-border bg-card/60 backdrop-blur-md shadow-xl rounded-xl p-2">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground mt-2">
              Invalid Link
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              This password reset link is invalid or has expired
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() =>
                navigate({
                  search: { mode: "forgot" },
                  to: "/login",
                })
              }
              variant="outline"
              className="w-full h-9 text-xs font-semibold rounded-md"
            >
              Request New Link
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
            Reset Password
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Enter your new password below
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
              <form.Field name="password">
                {(field) => (
                  <div className="space-y-1.5">
                    <Label
                      htmlFor={field.name}
                      className="text-xs font-semibold"
                    >
                      New Password
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

            <div>
              <form.Field name="confirmPassword">
                {(field) => (
                  <div className="space-y-1.5">
                    <Label
                      htmlFor={field.name}
                      className="text-xs font-semibold"
                    >
                      Confirm Password
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
                  disabled={
                    !canSubmit || isSubmitting || resetPassword.isPending
                  }
                >
                  {isSubmitting || resetPassword.isPending
                    ? "Resetting..."
                    : "Reset Password"}
                </Button>
              )}
            </form.Subscribe>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPasswordForm;
