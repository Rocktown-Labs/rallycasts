import { Button } from "@rallycaststv/ui/components/button";
import { Input } from "@rallycaststv/ui/components/input";
import { Link } from "@tanstack/react-router";
import { PlusCircle, XCircle } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState, RequestCard } from "@/components/rally/cards";
import { useCastingJobs, useCreateCastingJob } from "@/lib/hooks";

type RequestRouteStatus = "all" | "approved" | "completed" | "pending";

const requestTabs = [
  { label: "All Requests", status: "all", to: "/u/recording-requests/all" },
  { label: "Pending", status: "pending", to: "/u/recording-requests/pending" },
  {
    label: "Approved",
    status: "approved",
    to: "/u/recording-requests/approved",
  },
  {
    label: "Completed",
    status: "completed",
    to: "/u/recording-requests/completed",
  },
] as const;

const statusMatchesRoute = (
  jobStatus: string,
  routeStatus: RequestRouteStatus
) => {
  if (routeStatus === "all") {
    return true;
  }
  if (routeStatus === "pending") {
    return ["draft", "offered", "requested"].includes(jobStatus);
  }
  if (routeStatus === "approved") {
    return ["accepted", "arrived", "recording", "uploading"].includes(
      jobStatus
    );
  }
  return jobStatus === "completed";
};

function NewRecordingRequestForm({ onClose }: { onClose: () => void }) {
  const createJob = useCreateCastingJob();
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [requestedHours, setRequestedHours] = useState("1");
  const [budget, setBudget] = useState("0");
  const [notes, setNotes] = useState("");

  const submitRequest = (event: FormEvent) => {
    event.preventDefault();
    if (!startsAt) {
      toast.error("Start time is required.");
      return;
    }

    createJob.mutate(
      {
        endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
        notes: notes.trim() || undefined,
        priceCents: Math.round(Number(budget || "0") * 100),
        requestedHours: Number.parseFloat(requestedHours) || 1,
        startsAt: new Date(startsAt).toISOString(),
      },
      {
        onError: () => toast.error("Could not create recording request."),
        onSuccess: () => {
          toast.success("Recording request created.");
          onClose();
        },
      }
    );
  };

  return (
    <section className="rounded-lg border border-primary/30 bg-card p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">New recording request</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Tell casters when you need coverage and what kind of match or event
            they are recording.
          </p>
        </div>
        <Button
          aria-label="Close new recording request form"
          onClick={onClose}
          size="icon"
          variant="ghost"
        >
          <XCircle className="size-4" />
        </Button>
      </div>
      <form className="grid gap-3 md:grid-cols-2" onSubmit={submitRequest}>
        <Input
          aria-label="Recording start time"
          onChange={(event) => setStartsAt(event.target.value)}
          type="datetime-local"
          value={startsAt}
        />
        <Input
          aria-label="Recording end time"
          onChange={(event) => setEndsAt(event.target.value)}
          type="datetime-local"
          value={endsAt}
        />
        <Input
          aria-label="Requested hours"
          min="0.5"
          onChange={(event) => setRequestedHours(event.target.value)}
          step="0.5"
          type="number"
          value={requestedHours}
        />
        <Input
          aria-label="Budget in dollars"
          min="0"
          onChange={(event) => setBudget(event.target.value)}
          step="0.01"
          type="number"
          value={budget}
        />
        <textarea
          aria-label="Request notes"
          className="min-h-24 rounded-md border border-border bg-background px-3 py-2 text-sm md:col-span-2"
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Match, tournament, court, coverage goals, and anything the caster should know."
          value={notes}
        />
        <Button
          className="w-fit rounded-md"
          disabled={createJob.isPending}
          type="submit"
        >
          Create Request
        </Button>
      </form>
    </section>
  );
}

export function RecordingRequestsPage({
  status,
}: {
  status: RequestRouteStatus;
}) {
  const { data, isLoading } = useCastingJobs();
  const [isCreating, setIsCreating] = useState(false);
  const jobs = (data?.jobs ?? []).filter((job) =>
    statusMatchesRoute(job.status ?? "requested", status)
  );
  const activeTab = requestTabs.find((tab) => tab.status === status);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Recording Requests</h1>
          <nav className="mt-6 flex rounded-md bg-muted p-1">
            {requestTabs.map((tab) => (
              <Link key={tab.status} to={tab.to}>
                <Button
                  className="rounded-md"
                  size="sm"
                  variant={tab.status === status ? "default" : "ghost"}
                >
                  {tab.label}
                </Button>
              </Link>
            ))}
          </nav>
        </div>
        <Button
          className="rounded-md text-xs"
          onClick={() => setIsCreating(true)}
        >
          <PlusCircle className="size-4" />
          New Request
        </Button>
      </div>
      {isCreating ? (
        <NewRecordingRequestForm onClose={() => setIsCreating(false)} />
      ) : null}
      {isLoading ? (
        <div className="h-72 animate-pulse rounded-lg bg-muted" />
      ) : null}
      <div className="rounded-lg border border-border p-6">
        <h2 className="mb-5 text-xl font-bold">{activeTab?.label}</h2>
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
