import { Button } from "@rallycaststv/ui/components/button";
import { createFileRoute } from "@tanstack/react-router";
import { PlusCircle } from "lucide-react";

import { EmptyState, RequestCard } from "@/components/rally/cards";
import { useCastingJobs } from "@/lib/hooks";

export const Route = createFileRoute("/_auth/u/recording-requests/me")({
  component: RequestsPage,
});

function RequestsPage() {
  const { data, isLoading } = useCastingJobs();
  const jobs = data?.jobs ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Recording Requests</h1>
          <div className="mt-6 flex rounded-md bg-muted p-1">
            {["All Requests", "Pending", "Approved", "Completed"].map(
              (label, index) => (
                <Button
                  key={label}
                  className={index === 0 ? "rounded-md" : undefined}
                  size="sm"
                  variant={index === 0 ? "default" : "ghost"}
                >
                  {label}
                </Button>
              )
            )}
          </div>
        </div>
        <Button className="rounded-md text-xs">
          <PlusCircle className="size-4" />
          New Request
        </Button>
      </div>
      {isLoading ? (
        <div className="h-72 animate-pulse rounded-lg bg-muted" />
      ) : null}
      <div className="rounded-lg border border-border p-6">
        <h2 className="mb-5 text-xl font-bold">All Requests</h2>
        {jobs.length > 0 ? (
          <div className="grid gap-4">
            {jobs.map((job) => (
              <RequestCard key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <EmptyState
            message="Create a request when you want a caster to record a match or tournament."
            title="No recording requests yet"
          />
        )}
      </div>
    </div>
  );
}
