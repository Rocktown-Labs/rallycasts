import { createFileRoute, useSearch } from "@tanstack/react-router";
import { z } from "zod";

import { CourtError } from "@/components/layout/court-error";

const errorSearchSchema = z.object({
  error: z.string().optional(),
  error_description: z.string().optional(),
});

function ErrorPage() {
  const { error, error_description: errorDescription } = useSearch({
    from: "/error",
  });

  return <CourtError errorCode={error} errorDescription={errorDescription} />;
}

export const Route = createFileRoute("/error")({
  component: ErrorPage,
  validateSearch: errorSearchSchema,
});
