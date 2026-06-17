import { createFileRoute } from "@tanstack/react-router";
import z from "zod";

import ResetPasswordForm from "@/components/reset-password-form";

const RouteComponent = () => <ResetPasswordForm />;

const searchSchema = z.object({
  token: z.string().optional(),
});

export const Route = createFileRoute("/reset-password")({
  component: RouteComponent,
  validateSearch: searchSchema,
});
