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
import { z } from "zod";

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
      <div className="mx-auto mt-16 flex min-h-[70vh] w-full max-w-md flex-col justify-center p-4">
        <Card className="border-border bg-card/60 rounded-xl border p-2 shadow-xl backdrop-blur-md">
          <CardHeader className="pb-4 text-center">
            <CardTitle className="text-foreground mt-2 text-2xl font-bold tracking-tight">
              Password Updated
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs">
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
              className="bg-primary text-brand-yellow hover:bg-primary/95 h-9 w-full rounded-md text-xs font-semibold shadow-md transition-all"
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
      <div className="mx-auto mt-16 flex min-h-[70vh] w-full max-w-md flex-col justify-center p-4">
        <Card className="border-border bg-card/60 rounded-xl border p-2 shadow-xl backdrop-blur-md">
          <CardHeader className="pb-4 text-center">
            <CardTitle className="text-foreground mt-2 text-2xl font-bold tracking-tight">
              Invalid Link
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs">
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
              className="h-9 w-full rounded-md text-xs font-semibold"
            >
              Request New Link
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
            Reset Password
          </CardTitle>
          <CardDescription className="text-muted-foreground text-xs">
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
