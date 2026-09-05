import { Button } from "@rallycaststv/ui/components/button";
import { Input } from "@rallycaststv/ui/components/input";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  CalendarClock,
  MapPin,
  PlusCircle,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState, RequestCard } from "@/components/rally/cards";
import { castingJobsCollection, useLiveQuery } from "@/lib/collections";
import type { CastingJobRecord } from "@/lib/collections";

type RequestRouteStatus = "all" | "approved" | "completed" | "new" | "pending";

const requestTabs = [
  { label: "All Requests", status: "all", to: "/u/casts/all" },
  { label: "Pending", status: "pending", to: "/u/casts/pending" },
  {
    label: "Approved",
    status: "approved",
    to: "/u/casts/approved",
  },
  {
    label: "Completed",
    status: "completed",
    to: "/u/casts/completed",
  },
] as const;

const statusMatchesRoute = (
  jobStatus: string,
  routeStatus: RequestRouteStatus
) => {
  if (routeStatus === "all") {
    return true;
  }
  if (routeStatus === "new") {
    return false;
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

function NewCastingRequestForm({ onClose }: { onClose: () => void }) {
  const [place, setPlace] = useState("");
  const [court, setCourt] = useState("");
  const [participants, setParticipants] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [requestedHours, setRequestedHours] = useState("1");
  const [budget, setBudget] = useState("0");
  const [paymentSplit, setPaymentSplit] = useState<"host" | "split">("host");
  const [notes, setNotes] = useState("");

  const submitRequest = (event: FormEvent) => {
    event.preventDefault();
    if (!startsAt) {
      toast.error("Start time is required.");
      return;
    }
    if (!place.trim()) {
      toast.error("Tell us where the match is happening.");
      return;
    }

    const requestDetails = [
      `Place: ${place.trim()}`,
      court.trim() ? `Court: ${court.trim()}` : null,
      participants.trim() ? `Players: ${participants.trim()}` : null,
      `Payment: ${
        paymentSplit === "host"
          ? "Requester pays the full casting cost"
          : "Split casting cost with the challenger"
      }`,
      notes.trim() ? `Notes: ${notes.trim()}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const newJob: CastingJobRecord = {
      endsAt: endsAt ? new Date(endsAt).toISOString() : null,
      id: crypto.randomUUID(),
      notes: requestDetails,
      priceCents: Math.round(Number(budget || "0") * 100),
      requestedHours: Number.parseFloat(requestedHours) || 1,
      startsAt: new Date(startsAt).toISOString(),
      status: "requested",
    };

    try {
      castingJobsCollection.insert(newJob);
      toast.success("Casting request created.");
      onClose();
    } catch {
      toast.error("Could not create casting request.");
    }
  };

  return (
    <section className="rounded-xl border border-primary/30 bg-card p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Request a RallyCaster</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Tell us where, when, and who is playing so a caster knows exactly
            what they are covering.
          </p>
        </div>
        <Button
          aria-label="Close new casting request form"
          onClick={onClose}
          size="icon"
          variant="ghost"
        >
          <XCircle />
        </Button>
      </div>
      <form className="grid gap-4 md:grid-cols-2" onSubmit={submitRequest}>
        <label
          className="grid gap-2 text-sm font-semibold"
          htmlFor="casting-place"
        >
          <span className="flex items-center gap-2">
            <MapPin className="size-4 text-primary" />
            Place or park
          </span>
          <Input
            id="casting-place"
            onChange={(event) => setPlace(event.target.value)}
            placeholder="Berryhill Park, Searcy AR"
            value={place}
          />
        </label>
        <label
          className="grid gap-2 text-sm font-semibold"
          htmlFor="casting-court"
        >
          Court
          <Input
            id="casting-court"
            onChange={(event) => setCourt(event.target.value)}
            placeholder="Court 3, championship court, or TBD"
            value={court}
          />
        </label>
        <label
          className="grid gap-2 text-sm font-semibold"
          htmlFor="casting-start"
        >
          <span className="flex items-center gap-2">
            <CalendarClock className="size-4 text-primary" />
            Start
          </span>
          <Input
            id="casting-start"
            onChange={(event) => setStartsAt(event.target.value)}
            type="datetime-local"
            value={startsAt}
          />
        </label>
        <label
          className="grid gap-2 text-sm font-semibold"
          htmlFor="casting-end"
        >
          End
          <Input
            id="casting-end"
            onChange={(event) => setEndsAt(event.target.value)}
            type="datetime-local"
            value={endsAt}
          />
        </label>
        <label
          className="grid gap-2 text-sm font-semibold"
          htmlFor="casting-hours"
        >
          Requested hours
          <Input
            id="casting-hours"
            min="0.5"
            onChange={(event) => setRequestedHours(event.target.value)}
            step="0.5"
            type="number"
            value={requestedHours}
          />
        </label>
        <label
          className="grid gap-2 text-sm font-semibold"
          htmlFor="casting-budget"
        >
          <span className="flex items-center gap-2">
            <Wallet className="size-4 text-primary" />
            Budget
          </span>
          <Input
            id="casting-budget"
            min="0"
            onChange={(event) => setBudget(event.target.value)}
            step="0.01"
            type="number"
            value={budget}
          />
        </label>
        <label
          className="grid gap-2 text-sm font-semibold md:col-span-2"
          htmlFor="casting-participants"
        >
          <span className="flex items-center gap-2">
            <Users className="size-4 text-primary" />
            Who is playing?
          </span>
          <Input
            id="casting-participants"
            onChange={(event) => setParticipants(event.target.value)}
            placeholder="You vs. @opponent, doubles teams, or event/player pool"
            value={participants}
          />
        </label>
        <div className="grid gap-2 md:col-span-2">
          <p className="text-sm font-semibold">Payment</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              [
                "host",
                "I'll cover it",
                "Pay the full casting request yourself.",
              ],
              [
                "split",
                "Split with challenger",
                "Ask the opposing player or team to share the cost.",
              ],
            ].map(([value, label, description]) => (
              <button
                className={`rounded-lg border p-4 text-left transition-colors ${
                  paymentSplit === value
                    ? "border-primary bg-primary/10"
                    : "border-border bg-muted/5 hover:border-primary/40"
                }`}
                key={value}
                onClick={() => setPaymentSplit(value as "host" | "split")}
                type="button"
              >
                <span className="block text-sm font-bold">{label}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {description}
                </span>
              </button>
            ))}
          </div>
        </div>
        <textarea
          aria-label="Request notes"
          className="min-h-28 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-shadow focus:ring-2 focus:ring-primary md:col-span-2"
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Coverage goals, special instructions, tournament bracket info, or anything the caster should know."
          value={notes}
        />
        <Button className="w-fit rounded-lg" type="submit">
          Create Request
        </Button>
      </form>
    </section>
  );
}

export function CastingRequestsPage({
  status,
}: {
  status: RequestRouteStatus;
}) {
  const { data: allJobs = [], isLoading } = useLiveQuery(castingJobsCollection);
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(status === "new");
  const jobs = allJobs.filter((job) =>
    statusMatchesRoute(job.status ?? "requested", status)
  );
  const activeTab = requestTabs.find((tab) => tab.status === status);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Casting Requests</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Request a RallyCaster to record a match, tournament, clinic, or
            challenge at your court.
          </p>
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
        <Link to="/u/casts/new">
          <Button className="rounded-lg text-xs">
            <PlusCircle />
            New Request
          </Button>
        </Link>
      </div>
      {isCreating ? (
        <NewCastingRequestForm
          onClose={() => {
            setIsCreating(false);
            if (status === "new") {
              navigate({ to: "/u/casts/all" });
            }
          }}
        />
      ) : null}
      {isLoading ? (
        <div className="h-72 animate-pulse rounded-lg bg-muted" />
      ) : null}
      <div className="rounded-xl border border-border p-6">
        <h2 className="mb-5 text-xl font-bold">{activeTab?.label}</h2>
        {jobs.length > 0 ? (
          <div className="grid gap-4">
            {jobs.map((job) => (
              <RequestCard
                key={job.id}
                job={{ ...job, priceCents: job.priceCents ?? undefined }}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            message="Create a request when you want a RallyCaster to record a match, challenge, tournament, or clinic."
            title="No casting requests yet"
          />
        )}
      </div>
    </div>
  );
}
