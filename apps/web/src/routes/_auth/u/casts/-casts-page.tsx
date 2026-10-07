import { Button } from "@rallycaststv/ui/components/button";
import { Input } from "@rallycaststv/ui/components/input";
import { cn } from "@rallycaststv/ui/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  CalendarClock,
  CreditCard,
  HeartHandshake,
  LoaderCircle,
  MapPin,
  PlusCircle,
  ShieldCheck,
  Users,
  UserX,
  Wallet,
  XCircle,
} from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState, RequestCard } from "@/components/rally/cards";
import { apiClient } from "@/lib/api-client";
import { castingJobsCollection, useLiveQuery } from "@/lib/collections";
import type { CastingJobRecord } from "@/lib/collections";
import { readApiJson } from "@/lib/hooks/api";

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

  const hours = Number(requestedHours || 1);
  const basePrice = hours * STANDARD_HOURLY_RATE;
  const activeTip = isCustomTip
    ? Math.max(0, Number(customTip || 0))
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

    // Pay up front, Uber style: the job is created, then the requester
    // pays immediately so the dispatch pool only ever sees paid work.
    void (async () => {
      try {
        await castingJobsCollection.insert(newJob);
        const response = await readApiJson(
          apiClient.api.v1.stripe["casting-jobs"][":jobId"].pay.$post({
            param: { jobId: newJob.id },
          })
        );
        const checkoutUrl = (response as { url?: string }).url;
        if (checkoutUrl) {
          toast.info("Request created. Complete payment to dispatch it.");
          window.location.href = checkoutUrl;
        } else {
          toast.error(
            "Could not start payment. Use Pay to dispatch on the job."
          );
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not dispatch casting request. Use Pay to dispatch on the job."
        );
      }
      onClose();
    })();
  };

  return (
    <section className="border-primary/30 bg-card rounded-2xl border p-5 shadow-xs sm:p-6">
      <div className="border-border/60 mb-5 flex items-start justify-between gap-3 border-b pb-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-500">
            <span>ON-DEMAND COURT CAMERA</span>
          </div>
          <h2 className="text-foreground text-xl font-bold">
            Order a Caster by the Hour
          </h2>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
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
          <XCircle className="text-muted-foreground hover:text-foreground size-5" />
        </Button>
      </div>

      <form className="grid gap-5 md:grid-cols-2" onSubmit={submitRequest}>
        <div className="border-primary/20 bg-primary/5 text-muted-foreground flex items-start gap-2.5 rounded-xl border p-3.5 text-xs md:col-span-2">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-500" />
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
          <span className="text-foreground flex items-center gap-2">
            <MapPin className="text-primary size-4" />
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
          <span className="text-foreground flex items-center gap-2">
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
          <span className="text-foreground flex items-center gap-2">
            <CalendarClock className="text-primary size-4" />
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
          <span className="text-foreground flex items-center gap-2">
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
              className="text-foreground text-sm font-semibold"
              htmlFor="casting-hours"
            >
              Recording Duration ($20/hr standard rate)
            </label>
            <span className="text-muted-foreground text-xs">
              {hours} hr{hours === 1 ? "" : "s"} = ${basePrice.toFixed(2)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[1, 1.5, 2, 3, 4].map((hrs) => (
              <button
                key={hrs}
                type="button"
                className={cn(
                  "cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all",
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
            <div className="ml-2 flex items-center gap-1.5">
              <span className="text-muted-foreground text-xs">Custom:</span>
              <Input
                id="casting-hours"
                min="0.5"
                step="0.5"
                type="number"
                value={requestedHours}
                onChange={(e) => setRequestedHours(e.target.value)}
                className="h-8 w-20 rounded-lg text-xs"
              />
            </div>
          </div>
        </div>

        {/* Tipping Section */}
        <div className="border-border/60 grid gap-2 border-t pt-4 md:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-foreground flex items-center gap-2 text-sm font-semibold">
              <HeartHandshake className="size-4 text-emerald-500" />
              Optional Caster Tip
            </span>
            <span className="text-muted-foreground text-xs">
              100% of tips go directly to your court caster
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[0, 5, 10, 15].map((tip) => (
              <button
                key={tip}
                type="button"
                className={cn(
                  "cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all",
                  !isCustomTip && tipAmount === tip
                    ? "border-emerald-500 bg-emerald-500/15 text-emerald-600 shadow-2xs dark:text-emerald-400"
                    : "border-border bg-muted/20 text-foreground hover:border-emerald-500/50"
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
                "cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all",
                isCustomTip
                  ? "border-emerald-500 bg-emerald-500/15 text-emerald-600 shadow-2xs dark:text-emerald-400"
                  : "border-border bg-muted/20 text-foreground hover:border-emerald-500/50"
              )}
              onClick={() => setIsCustomTip(true)}
            >
              Custom tip
            </button>
            {isCustomTip && (
              <div className="relative inline-flex items-center">
                <span className="text-muted-foreground absolute left-2.5 text-xs">
                  $
                </span>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={customTip}
                  onChange={(e) => setCustomTip(e.target.value)}
                  className="h-8 w-24 rounded-lg pl-6 text-xs"
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
          <span className="text-foreground flex items-center gap-2">
            <Users className="text-primary size-4" />
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
          <p className="text-foreground text-sm font-semibold">
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
                className={`cursor-pointer rounded-xl border p-3.5 text-left transition-colors ${
                  paymentSplit === value
                    ? "border-primary bg-primary/10"
                    : "border-border bg-muted/10 hover:border-primary/40"
                }`}
                key={value}
                onClick={() => setPaymentSplit(value as "host" | "split")}
                type="button"
              >
                <span className="text-foreground block text-sm font-bold">
                  {label}
                </span>
                <span className="text-muted-foreground mt-1 block text-xs">
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
            className="border-border bg-background focus:ring-primary min-h-20 rounded-xl border px-3 py-2 text-sm transition-shadow outline-none focus:ring-2"
            onChange={(event) => setNotes(event.target.value)}
            placeholder="E.g., high-angle baseline angle preferred, tournament bracket match, or coaching notes."
            value={notes}
          />
        </label>

        {/* Checkout Summary Box */}
        <div className="border-border/80 bg-muted/30 space-y-2 rounded-xl border p-4 md:col-span-2">
          <div className="text-muted-foreground flex items-center justify-between text-xs">
            <span>
              Casting Service ({hours} hr{hours === 1 ? "" : "s"} @ $
              {STANDARD_HOURLY_RATE}/hr)
            </span>
            <span>${basePrice.toFixed(2)}</span>
          </div>
          {activeTip > 0 && (
            <div className="flex items-center justify-between text-xs font-medium text-emerald-500">
              <span>Caster Tip</span>
              <span>+${activeTip.toFixed(2)}</span>
            </div>
          )}
          <div className="text-muted-foreground flex items-center justify-between text-xs">
            <span>Platform Processing & Delivery</span>
            <span className="font-semibold text-emerald-500">Included</span>
          </div>
          <div className="border-border/60 text-foreground flex items-center justify-between border-t pt-2 text-sm font-bold">
            <span>Total Due Now</span>
            <span className="text-lg font-extrabold text-emerald-500">
              ${totalPrice.toFixed(2)}
            </span>
          </div>
          <p className="text-muted-foreground text-[11px]">
            Paid up front and held until the job completes; the caster is paid
            out then. RallyCasts Pro members pay 5% less.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 md:col-span-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="rounded-xl text-xs"
          >
            Cancel
          </Button>
          <Button
            className="bg-primary text-primary-foreground flex cursor-pointer items-center gap-2 rounded-xl px-6 py-2.5 font-bold shadow-xs"
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

/**
 * The money action for a job card: pay up front to dispatch a fresh
 * request, or re-dispatch an accepted job when the caster did not show.
 */
const castingJobAction = (job: CastingJobRecord): ReactNode => {
  if ((job.priceCents ?? 0) <= 0) {
    return undefined;
  }
  if (job.status === "accepted") {
    return <RedispatchJobButton jobId={job.id} />;
  }
  const awaitingPayment =
    (job.status === "requested" || job.status === "offered") &&
    job.paymentStatus !== "paid" &&
    job.paymentStatus !== "refunded";
  return awaitingPayment ? <PayJobButton jobId={job.id} /> : undefined;
};

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
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
            Request a RallyCaster to record a match, tournament, clinic, or
            challenge at your court.
          </p>
          <nav className="bg-muted mt-6 flex rounded-md p-1">
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
        <div className="flex flex-wrap items-center gap-2">
          <CasterPayoutsButton />
          <Link to="/u/casts/new">
            <Button className="rounded-lg text-xs">
              <PlusCircle />
              New Request
            </Button>
          </Link>
        </div>
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
        <div className="bg-muted h-72 animate-pulse rounded-lg" />
      ) : null}
      <div className="border-border rounded-xl border p-6">
        <h2 className="mb-5 text-xl font-bold">{activeTab?.label}</h2>
        {jobs.length > 0 ? (
          <div className="grid gap-4">
            {jobs.map((job) => (
              <RequestCard
                action={castingJobAction(job)}
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

const useStripeRedirect = () =>
  useMutation({
    mutationFn: async (url: string | Promise<string | undefined>) => {
      const resolved = await url;
      if (!resolved) {
        throw new Error("Stripe did not return a redirect");
      }
      return resolved;
    },
    onError: (error) => {
      toast.error(
        error instanceof Error &&
          error.message !== "Stripe did not return a redirect"
          ? error.message
          : "Could not open Stripe. Please try again."
      );
    },
    onSuccess: (url) => {
      window.location.href = url;
    },
  });

function PayJobButton({ jobId }: { jobId: string }) {
  const pay = useStripeRedirect();
  const start = async () => {
    const response = await readApiJson(
      apiClient.api.v1.stripe["casting-jobs"][":jobId"].pay.$post({
        param: { jobId },
      })
    );
    return (response as { url?: string }).url;
  };
  return (
    <Button
      className="rounded-lg"
      disabled={pay.isPending}
      onClick={() => pay.mutate(start())}
      size="sm"
      type="button"
    >
      {pay.isPending ? (
        <LoaderCircle className="size-3.5 animate-spin" />
      ) : (
        <CreditCard className="size-3.5" />
      )}
      Pay to dispatch
    </Button>
  );
}

const startCasterPayoutsSetup = async () => {
  const response = await readApiJson(
    apiClient.api.v1.stripe.caster.payouts.setup.$post({})
  );
  return (response as { url?: string }).url;
};

const redispatchCastingJob = (jobId: string) =>
  readApiJson(
    apiClient.api.v1["casting-jobs"][":id"].redispatch.$post({
      param: { id: jobId },
    })
  );

function RedispatchJobButton({ jobId }: { jobId: string }) {
  const queryClient = useQueryClient();
  const redispatch = useMutation({
    mutationFn: () => redispatchCastingJob(jobId),
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not re-dispatch this job."
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["casting-jobs"] });
      toast.info("Caster removed. The job is back in the dispatch pool.");
    },
  });
  return (
    <Button
      className="rounded-lg"
      disabled={redispatch.isPending}
      onClick={() => redispatch.mutate()}
      size="sm"
      type="button"
      variant="outline"
    >
      <UserX className="size-3.5" />
      No-show? Re-dispatch
    </Button>
  );
}

function CasterPayoutsButton() {
  const setup = useStripeRedirect();
  return (
    <Button
      className="rounded-lg text-xs"
      disabled={setup.isPending}
      onClick={() => setup.mutate(startCasterPayoutsSetup())}
      type="button"
      variant="outline"
    >
      {setup.isPending ? (
        <LoaderCircle className="size-3.5 animate-spin" />
      ) : (
        <Wallet className="size-3.5" />
      )}
      Caster payouts
    </Button>
  );
}
