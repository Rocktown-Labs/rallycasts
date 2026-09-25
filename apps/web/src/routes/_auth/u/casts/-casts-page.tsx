import { Button } from "@rallycaststv/ui/components/button";
import { Input } from "@rallycaststv/ui/components/input";
import { cn } from "@rallycaststv/ui/lib/utils";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  CalendarClock,
  CreditCard,
  HeartHandshake,
  MapPin,
  PlusCircle,
  ShieldCheck,
  Users,
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

const STANDARD_HOURLY_RATE = 20;

function NewCastingRequestForm({ onClose }: { onClose: () => void }) {
  const [place, setPlace] = useState("");
  const [court, setCourt] = useState("");
  const [participants, setParticipants] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [requestedHours, setRequestedHours] = useState("1");
  const [tipAmount, setTipAmount] = useState<number>(5);
  const [customTip, setCustomTip] = useState<string>("");
  const [isCustomTip, setIsCustomTip] = useState(false);
  const [paymentSplit, setPaymentSplit] = useState<"host" | "split">("host");
  const [notes, setNotes] = useState("");

  const hours = Number.parseFloat(requestedHours) || 1;
  const basePrice = hours * STANDARD_HOURLY_RATE;
  const activeTip = isCustomTip
    ? Math.max(0, Number.parseFloat(customTip) || 0)
    : tipAmount;
  const totalPrice = basePrice + activeTip;

  const submitRequest = (event: FormEvent) => {
    event.preventDefault();
    if (!startsAt) {
      toast.error("Start time is required.");
      return;
    }
    if (!place.trim()) {
      toast.error("Tell us which park or court facility.");
      return;
    }

    const requestDetails = [
      `Place: ${place.trim()}`,
      court.trim() ? `Court: ${court.trim()}` : null,
      participants.trim() ? `Players: ${participants.trim()}` : null,
      `Duration: ${hours} hour${hours === 1 ? "" : "s"} ($${basePrice.toFixed(2)} @ $${STANDARD_HOURLY_RATE}/hr)`,
      activeTip > 0 ? `Caster Tip: $${activeTip.toFixed(2)}` : null,
      `Total Paid at Checkout: $${totalPrice.toFixed(2)}`,
      `Payment: ${
        paymentSplit === "host"
          ? "Requester covers full casting fee"
          : "Split casting fee with the challenger"
      }`,
      notes.trim() ? `Notes: ${notes.trim()}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const newJob: CastingJobRecord = {
      endsAt: endsAt ? new Date(endsAt).toISOString() : null,
      id: crypto.randomUUID(),
      notes: requestDetails,
      priceCents: Math.round(totalPrice * 100),
      requestedHours: hours,
      startsAt: new Date(startsAt).toISOString(),
      status: "requested",
    };

    try {
      castingJobsCollection.insert(newJob);
      toast.success(
        `Payment confirmed ($${totalPrice.toFixed(2)}). Your caster request for ${hours} hr${hours === 1 ? "" : "s"} has been dispatched!`
      );
      onClose();
    } catch {
      toast.error("Could not dispatch casting request.");
    }
  };

  return (
    <section className="rounded-2xl border border-primary/30 bg-card p-5 sm:p-6 shadow-xs">
      <div className="mb-5 flex items-start justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-500 mb-2">
            <span>ON-DEMAND COURT CAMERA</span>
          </div>
          <h2 className="text-xl font-bold text-foreground">
            Order a Caster by the Hour
          </h2>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            Order on-court recording hours like an Uber. A verified caster shows
            up to your park with a 4K camera rig, records your match, and
            delivers footage for your private review & approval.
          </p>
        </div>
        <Button
          aria-label="Close new casting request form"
          onClick={onClose}
          size="icon"
          variant="ghost"
        >
          <XCircle className="size-5 text-muted-foreground hover:text-foreground" />
        </Button>
      </div>

      <form className="grid gap-5 md:grid-cols-2" onSubmit={submitRequest}>
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs text-muted-foreground md:col-span-2 flex items-start gap-2.5">
          <ShieldCheck className="size-4 text-emerald-500 shrink-0 mt-0.5" />
          <p>
            <strong className="text-foreground">
              Private Review & Approval Guarantee:
            </strong>{" "}
            The recorded footage goes straight to your account first. You review
            and approve the clips before anything is published or shared.
          </p>
        </div>

        {/* Location & Court Number */}
        <label
          className="grid gap-1.5 text-sm font-semibold"
          htmlFor="casting-place"
        >
          <span className="flex items-center gap-2 text-foreground">
            <MapPin className="size-4 text-primary" />
            Park or Facility
          </span>
          <Input
            id="casting-place"
            onChange={(event) => setPlace(event.target.value)}
            placeholder="Berryhill Park, Searcy AR"
            value={place}
            required
          />
        </label>

        <label
          className="grid gap-1.5 text-sm font-semibold"
          htmlFor="casting-court"
        >
          <span className="flex items-center gap-2 text-foreground">
            Court Number
          </span>
          <Input
            id="casting-court"
            onChange={(event) => setCourt(event.target.value)}
            placeholder="Court 3, Championship Court, or TBD"
            value={court}
          />
        </label>

        {/* Start & End Times */}
        <label
          className="grid gap-1.5 text-sm font-semibold"
          htmlFor="casting-start"
        >
          <span className="flex items-center gap-2 text-foreground">
            <CalendarClock className="size-4 text-primary" />
            Match Date & Start Time
          </span>
          <Input
            id="casting-start"
            onChange={(event) => setStartsAt(event.target.value)}
            type="datetime-local"
            value={startsAt}
            required
          />
        </label>

        <label
          className="grid gap-1.5 text-sm font-semibold"
          htmlFor="casting-end"
        >
          <span className="flex items-center gap-2 text-foreground">
            Estimated End Time (Optional)
          </span>
          <Input
            id="casting-end"
            onChange={(event) => setEndsAt(event.target.value)}
            type="datetime-local"
            value={endsAt}
          />
        </label>

        {/* Duration & Hours Selection */}
        <div className="grid gap-2 md:col-span-2">
          <div className="flex items-center justify-between">
            <label
              className="text-sm font-semibold text-foreground"
              htmlFor="casting-hours"
            >
              Recording Duration ($20/hr standard rate)
            </label>
            <span className="text-xs text-muted-foreground">
              {hours} hr{hours === 1 ? "" : "s"} = ${basePrice.toFixed(2)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[1, 1.5, 2, 3, 4].map((hrs) => (
              <button
                key={hrs}
                type="button"
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                  hours === hrs
                    ? "border-primary bg-primary text-primary-foreground shadow-2xs"
                    : "border-border bg-muted/20 hover:border-primary/50 text-foreground"
                )}
                onClick={() => setRequestedHours(String(hrs))}
              >
                {hrs} {hrs === 1 ? "hour" : "hours"} ($
                {hrs * STANDARD_HOURLY_RATE})
              </button>
            ))}
            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-xs text-muted-foreground">Custom:</span>
              <Input
                id="casting-hours"
                min="0.5"
                step="0.5"
                type="number"
                value={requestedHours}
                onChange={(e) => setRequestedHours(e.target.value)}
                className="h-8 w-20 text-xs rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Tipping Section */}
        <div className="grid gap-2 md:col-span-2 border-t border-border/60 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <HeartHandshake className="size-4 text-emerald-500" />
              Optional Caster Tip
            </span>
            <span className="text-xs text-muted-foreground">
              100% of tips go directly to your court caster
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[0, 5, 10, 15].map((tip) => (
              <button
                key={tip}
                type="button"
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                  !isCustomTip && tipAmount === tip
                    ? "border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-2xs"
                    : "border-border bg-muted/20 hover:border-emerald-500/50 text-foreground"
                )}
                onClick={() => {
                  setIsCustomTip(false);
                  setTipAmount(tip);
                }}
              >
                {tip === 0 ? "No tip ($0)" : `$${tip}`}
              </button>
            ))}
            <button
              type="button"
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                isCustomTip
                  ? "border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-2xs"
                  : "border-border bg-muted/20 hover:border-emerald-500/50 text-foreground"
              )}
              onClick={() => setIsCustomTip(true)}
            >
              Custom tip
            </button>
            {isCustomTip && (
              <div className="relative inline-flex items-center">
                <span className="absolute left-2.5 text-xs text-muted-foreground">
                  $
                </span>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={customTip}
                  onChange={(e) => setCustomTip(e.target.value)}
                  className="h-8 w-24 pl-6 text-xs rounded-lg"
                  autoFocus
                />
              </div>
            )}
          </div>
        </div>

        {/* Players */}
        <label
          className="grid gap-1.5 text-sm font-semibold md:col-span-2"
          htmlFor="casting-participants"
        >
          <span className="flex items-center gap-2 text-foreground">
            <Users className="size-4 text-primary" />
            Who is playing?
          </span>
          <Input
            id="casting-participants"
            onChange={(event) => setParticipants(event.target.value)}
            placeholder="You vs. @opponent, doubles pairs, or open pool"
            value={participants}
          />
        </label>

        {/* Payment Split */}
        <div className="grid gap-2 md:col-span-2">
          <p className="text-sm font-semibold text-foreground">
            Payment Coverage
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              [
                "host",
                "I'll cover the full cost",
                "Pay the entire session total now at checkout.",
              ],
              [
                "split",
                "Split with opponent",
                "You pay 50% now; opponent pays remaining half on court.",
              ],
            ].map(([value, label, description]) => (
              <button
                className={`rounded-xl border p-3.5 text-left transition-colors cursor-pointer ${
                  paymentSplit === value
                    ? "border-primary bg-primary/10"
                    : "border-border bg-muted/10 hover:border-primary/40"
                }`}
                key={value}
                onClick={() => setPaymentSplit(value as "host" | "split")}
                type="button"
              >
                <span className="block text-sm font-bold text-foreground">
                  {label}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {description}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Special Instructions */}
        <label
          className="grid gap-1.5 text-sm font-semibold md:col-span-2"
          htmlFor="casting-notes"
        >
          <span>Special Instructions (Optional)</span>
          <textarea
            id="casting-notes"
            aria-label="Request notes"
            className="min-h-20 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition-shadow focus:ring-2 focus:ring-primary"
            onChange={(event) => setNotes(event.target.value)}
            placeholder="E.g., high-angle baseline angle preferred, tournament bracket match, or coaching notes."
            value={notes}
          />
        </label>

        {/* Checkout Summary Box */}
        <div className="rounded-xl border border-border/80 bg-muted/30 p-4 md:col-span-2 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Casting Service ({hours} hr{hours === 1 ? "" : "s"} @ $
              {STANDARD_HOURLY_RATE}/hr)
            </span>
            <span>${basePrice.toFixed(2)}</span>
          </div>
          {activeTip > 0 && (
            <div className="flex items-center justify-between text-xs text-emerald-500 font-medium">
              <span>Caster Tip</span>
              <span>+${activeTip.toFixed(2)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Platform Processing & Delivery</span>
            <span className="text-emerald-500 font-semibold">Included</span>
          </div>
          <div className="border-t border-border/60 pt-2 flex items-center justify-between text-sm font-bold text-foreground">
            <span>Total Due Now</span>
            <span className="text-lg text-emerald-500 font-extrabold">
              ${totalPrice.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="md:col-span-2 flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="rounded-xl text-xs"
          >
            Cancel
          </Button>
          <Button
            className="rounded-xl bg-primary text-primary-foreground font-bold px-6 py-2.5 shadow-xs cursor-pointer flex items-center gap-2"
            type="submit"
          >
            <CreditCard className="size-4" />
            Pay ${totalPrice.toFixed(2)} & Dispatch Caster
          </Button>
        </div>
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
