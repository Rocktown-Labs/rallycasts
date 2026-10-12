import { Button } from "@rallycaststv/ui/components/button";
import { Card, CardContent } from "@rallycaststv/ui/components/card";
import { Input } from "@rallycaststv/ui/components/input";
import { Label } from "@rallycaststv/ui/components/label";
import { cn } from "@rallycaststv/ui/lib/utils";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarClock,
  Check,
  Copy,
  ListChecks,
  Lock,
  Pencil,
  RefreshCw,
  Sparkles,
  Trophy,
  Undo2,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";

import {
  useEventBracket,
  useEventPlayers,
  useGenerateEventBracket,
  useProfile,
  useSeedDemoEvent,
  useUpdateEvent,
  useUpdateRegistration,
} from "@/lib/hooks";
import { formatDollars } from "@/lib/hooks/use-organizer-analytics";

import { useEventContext } from "./events.$id";
import type { EventData } from "./events.$id";

export const Route = createFileRoute("/events/$id/manage")({
  component: EventManageTab,
});

type RegistrationStatus =
  | "cancelled"
  | "checked_in"
  | "pending_payment"
  | "registered"
  | "waitlisted";

interface Registration {
  player: {
    displayUsername: string | null;
    id: string;
    image: string | null;
    name: string;
    username: string | null;
  };
  registration: {
    createdAt: string;
    id: string;
    seed: number | null;
    status: RegistrationStatus;
  };
}

const statusOrder: Record<RegistrationStatus, number> = {
  cancelled: 4,
  checked_in: 0,
  pending_payment: 2,
  registered: 1,
  waitlisted: 3,
};

const pad2 = (value: number) => String(value).padStart(2, "0");

const sortForCheckIn = (players: Registration[]) =>
  players.toSorted((left, right) => {
    const statusDiff =
      statusOrder[left.registration.status] -
      statusOrder[right.registration.status];
    if (statusDiff !== 0) {
      return statusDiff;
    }
    const seedLeft = left.registration.seed ?? Number.MAX_SAFE_INTEGER;
    const seedRight = right.registration.seed ?? Number.MAX_SAFE_INTEGER;
    if (seedLeft !== seedRight) {
      return seedLeft - seedRight;
    }
    return (
      new Date(left.registration.createdAt).getTime() -
      new Date(right.registration.createdAt).getTime()
    );
  });

const registrationStatusStyles: Record<RegistrationStatus, string> = {
  cancelled: "bg-muted text-muted-foreground",
  checked_in: "bg-primary text-primary-foreground",
  pending_payment: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  registered: "bg-primary/10 text-primary",
  waitlisted: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
};

const registrationStatusLabels: Record<RegistrationStatus, string> = {
  cancelled: "Cancelled",
  checked_in: "Checked in",
  pending_payment: "Payment pending",
  registered: "Registered",
  waitlisted: "Waitlisted",
};

const eventStatusStyles: Record<string, string> = {
  cancelled: "bg-destructive/10 text-destructive",
  completed: "bg-muted text-muted-foreground",
  draft: "bg-muted text-muted-foreground",
  published: "bg-primary/10 text-primary",
};

/** ISO string → value for `<input type="datetime-local">` in local time. */
const toLocalInputValue = (iso?: string | null) => {
  if (!iso) {
    return "";
  }
  const date = new Date(iso);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
};

/** datetime-local value → ISO string (or null when cleared). */
const fromLocalInputValue = (value: string) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

function EventManageTab() {
  const { canManageEvent, event } = useEventContext();

  if (!canManageEvent) {
    return (
      <Card className="rounded-lg">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <Lock className="text-muted-foreground size-8" />
          <div>
            <p className="font-bold">Organizer access only</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Event management tools are available to the event organizer and
              their organization managers.
            </p>
          </div>
          <Link params={{ id: event.id }} to="/events/$id">
            <Button className="rounded-lg" size="sm" variant="outline">
              Back to event
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return <ManageConsole event={event} />;
}

// oxlint-disable-next-line complexity -- One console, four panels; the branches map to the event lifecycle rather than nested logic.
function ManageConsole({ event }: { event: EventData }) {
  const { id: eventId } = event;
  const { data: playersData, isLoading: playersLoading } =
    useEventPlayers(eventId);
  const { data: bracketData } = useEventBracket(eventId);
  const { data: profileData } = useProfile();

  const updateEvent = useUpdateEvent(eventId);
  const generateBracket = useGenerateEventBracket(eventId);
  const seedDemo = useSeedDemoEvent(eventId);
  const registrationUpdate = useUpdateRegistration(eventId);

  const players = useMemo(() => playersData?.players ?? [], [playersData]);
  const matches = bracketData?.matches ?? [];

  const [confirm, setConfirm] = useState<
    | { kind: "cancel-event" }
    | { kind: "cancel-registration"; id: string }
    | { kind: "regenerate-bracket" }
    | null
  >(null);
  const [editOpen, setEditOpen] = useState(false);

  const isPlatformAdmin = Boolean(profileData?.isPlatformAdmin);
  const canPublish = Boolean(event.venueId);

  const counts = useMemo(() => {
    const checkedIn = players.filter(
      ({ registration }) => registration.status === "checked_in"
    ).length;
    const pendingPayment = players.filter(
      ({ registration }) => registration.status === "pending_payment"
    ).length;
    const registered = players.filter(
      ({ registration }) => registration.status === "registered"
    ).length;
    const waitlisted = players.filter(
      ({ registration }) => registration.status === "waitlisted"
    ).length;
    const filled = checkedIn + pendingPayment + registered;
    const fillPercent = event.capacity
      ? Math.min(100, Math.round((filled / event.capacity) * 100))
      : null;
    return {
      checkedIn,
      fillPercent,
      filled,
      revenueCents: (checkedIn + registered) * event.entryFeeCents,
      total: players.length,
      waitlisted,
    };
  }, [event.capacity, event.entryFeeCents, players]);

  const setEventStatus = (
    status: "cancelled" | "completed" | "published",
    successMessage: string
  ) => {
    updateEvent.mutate(
      { status },
      {
        onError: (error) => toast.error(error.message),
        onSuccess: () => {
          toast.success(successMessage);
          setConfirm(null);
        },
      }
    );
  };

  const handleGenerate = (force: boolean) => {
    generateBracket.mutate(
      { force },
      {
        onError: (error) => toast.error(error.message),
        onSuccess: () => toast.success("Bracket generated"),
      }
    );
  };

  const handleSeedDemo = () => {
    seedDemo.mutate(undefined, {
      onError: (error) => toast.error(error.message),
      onSuccess: (result) => toast.success(result.message),
    });
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/events/${eventId}`
      );
      toast.success("Event link copied");
    } catch {
      toast.error("Could not copy the link");
    }
  };

  let bracketHint: string;
  if (matches.length > 0) {
    bracketHint = `${matches.length} matches generated. Regenerating replaces all existing matches.`;
  } else if (players.length >= 2) {
    bracketHint = "Generate the bracket from the current player list.";
  } else {
    bracketHint = "Add at least 2 players to generate a bracket.";
  }

  return (
    <div className="animate-in fade-in space-y-6 duration-300">
      {/* Status + quick actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4">
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider uppercase",
                eventStatusStyles[event.status] ?? "bg-muted"
              )}
            >
              {event.status}
            </span>
            <span className="text-muted-foreground truncate text-xs">
              {event.eventType.replace("_", " ")} ·{" "}
              {event.entryFeeCents > 0
                ? `${formatDollars(event.entryFeeCents)} entry`
                : "Free entry"}
            </span>
          </div>
          {event.status === "draft" && !canPublish ? (
            <p className="text-muted-foreground text-xs">
              Publishing needs a validated location — add one in the Locations
              tab first.
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {event.status === "draft" ? (
            <Button
              disabled={!canPublish || updateEvent.isPending}
              onClick={() =>
                setEventStatus("published", "Event is live — players can join")
              }
              size="sm"
            >
              Publish event
            </Button>
          ) : null}
          {event.status === "published" ? (
            <Button
              disabled={updateEvent.isPending}
              onClick={() =>
                setEventStatus("completed", "Event marked as completed")
              }
              size="sm"
              variant="outline"
            >
              Mark completed
            </Button>
          ) : null}
          {event.status === "published" ? (
            <Button
              disabled={updateEvent.isPending}
              onClick={() => setConfirm({ kind: "cancel-event" })}
              size="sm"
              variant="destructive"
            >
              Cancel event
            </Button>
          ) : null}
          <Button
            disabled={updateEvent.isPending}
            onClick={() => setEditOpen(true)}
            size="sm"
            variant="outline"
          >
            <Pencil data-icon="inline-start" /> Edit details
          </Button>
          <Button onClick={copyShareLink} size="sm" variant="ghost">
            <Copy data-icon="inline-start" /> Copy link
          </Button>
        </div>
      </div>

      {/* At-a-glance stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          hint={
            event.capacity
              ? `${counts.fillPercent ?? 0}% of ${event.capacity} spots`
              : "Open entry — no capacity set"
          }
          label="Filled"
          value={
            event.capacity
              ? `${counts.filled}/${event.capacity}`
              : String(counts.filled)
          }
        />
        <StatTile
          hint="Ready to play"
          label="Checked in"
          value={String(counts.checkedIn)}
        />
        <StatTile
          hint="Waiting for a spot"
          label="Waitlisted"
          value={String(counts.waitlisted)}
        />
        <StatTile
          hint={
            event.entryFeeCents > 0
              ? "Confirmed spots × entry fee"
              : "No entry fee"
          }
          label="Entry revenue"
          value={formatDollars(counts.revenueCents)}
        />
      </div>

      {/* Registrations */}
      <Card className="rounded-lg">
        <CardContent>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-bold">
                <Users className="text-primary size-4" /> Registrations (
                {counts.total})
              </h2>
              <p className="text-muted-foreground mt-1 text-xs">
                Check players in at the door, manage seeds, and curate the
                waitlist.
              </p>
            </div>
            <Link
              className="text-primary inline-flex items-center gap-1 text-xs font-semibold hover:underline"
              params={{ id: eventId }}
              to="/events/$id/players"
            >
              Public player view
            </Link>
          </div>

          {playersLoading ? (
            <div className="bg-muted h-40 animate-pulse rounded-lg" />
          ) : null}

          {!playersLoading && players.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-sm">
              No registrations yet. Share the event link to start filling the
              field.
            </p>
          ) : null}

          {!playersLoading && players.length > 0 ? (
            <div className="-mx-2 overflow-x-auto px-2">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="text-muted-foreground text-xs">
                  <tr>
                    <th className="pb-2">Player</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Seed</th>
                    <th className="pb-2">Registered</th>
                    <th className="pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {sortForCheckIn(players).map(({ player, registration }) => (
                    <tr key={registration.id}>
                      <td className="py-2.5">
                        <Link
                          aria-label={`View ${player.name}'s profile`}
                          className="flex items-center gap-2 font-medium hover:underline"
                          params={{
                            username: player.username ?? player.id,
                          }}
                          to="/players/$username"
                        >
                          <span className="bg-muted text-foreground flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold">
                            {player.image ? (
                              <img
                                alt={player.name}
                                className="size-full object-cover"
                                src={player.image}
                              />
                            ) : (
                              player.name.charAt(0)
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate">
                              {player.name}
                            </span>
                            <span className="text-muted-foreground block truncate text-[10px] font-normal">
                              @
                              {player.username ??
                                player.displayUsername ??
                                "player"}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="py-2.5">
                        <span
                          className={cn(
                            "rounded px-2 py-0.5 text-[10px] font-semibold",
                            registrationStatusStyles[registration.status]
                          )}
                        >
                          {registrationStatusLabels[registration.status]}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <SeedCell
                          eventId={eventId}
                          registration={registration}
                        />
                      </td>
                      <td className="text-muted-foreground py-2.5 text-xs">
                        {new Date(registration.createdAt).toLocaleDateString(
                          undefined,
                          { day: "numeric", month: "short" }
                        )}
                      </td>
                      <td className="py-2.5">
                        <div className="flex justify-end gap-1.5">
                          <RegistrationActions
                            eventId={eventId}
                            registration={registration}
                            onCancel={() =>
                              setConfirm({
                                id: registration.id,
                                kind: "cancel-registration",
                              })
                            }
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Bracket + demo tools */}
      <Card className="rounded-lg">
        <CardContent>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 font-bold">
                <Trophy className="text-primary size-4" /> Bracket
              </h2>
              <p className="text-muted-foreground mt-1 text-xs">
                {bracketHint}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {matches.length === 0 ? (
                <Button
                  className="rounded-lg"
                  disabled={players.length < 2 || generateBracket.isPending}
                  onClick={() => handleGenerate(false)}
                  size="sm"
                >
                  <ListChecks data-icon="inline-start" /> Generate bracket
                </Button>
              ) : (
                <Button
                  className="rounded-lg"
                  disabled={generateBracket.isPending}
                  onClick={() => setConfirm({ kind: "regenerate-bracket" })}
                  size="sm"
                  variant="outline"
                >
                  <RefreshCw data-icon="inline-start" /> Regenerate
                </Button>
              )}
              {isPlatformAdmin ? (
                <Button
                  className="rounded-lg"
                  disabled={seedDemo.isPending}
                  onClick={handleSeedDemo}
                  size="sm"
                  variant="outline"
                >
                  <Sparkles data-icon="inline-start" /> Seed demo players
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {editOpen ? (
        <EditEventDialog event={event} onClose={() => setEditOpen(false)} />
      ) : null}

      {confirm?.kind === "cancel-event" ? (
        <ConfirmDialog
          busy={updateEvent.isPending}
          confirmLabel="Cancel event"
          description="All succeeded entry payments are refunded through Stripe and the event is taken down. This cannot be undone."
          onClose={() => setConfirm(null)}
          onConfirm={() =>
            setEventStatus("cancelled", "Event cancelled and refunds issued")
          }
          title="Cancel this event?"
        />
      ) : null}

      {confirm?.kind === "cancel-registration" ? (
        <ConfirmDialog
          busy={registrationUpdate.isPending}
          confirmLabel="Remove player"
          description="The player is removed from the event. If they paid, handle the refund with them directly — removing them here does not trigger a refund."
          onClose={() => setConfirm(null)}
          onConfirm={() => {
            registrationUpdate.mutate(
              {
                json: { status: "cancelled" },
                registrationId: confirm.id,
              },
              {
                onError: (error) => toast.error(error.message),
                onSuccess: () => {
                  toast.success("Player removed from the event");
                  setConfirm(null);
                },
              }
            );
          }}
          title="Remove this player?"
        />
      ) : null}

      {confirm?.kind === "regenerate-bracket" ? (
        <ConfirmDialog
          busy={generateBracket.isPending}
          confirmLabel="Regenerate bracket"
          description="All existing matches, scores, and standings for this event are deleted and a fresh bracket is built from the current player list."
          onClose={() => setConfirm(null)}
          onConfirm={() => {
            handleGenerate(true);
            setConfirm(null);
          }}
          title="Regenerate the bracket?"
        />
      ) : null}
    </div>
  );
}

function StatTile({
  hint,
  label,
  value,
}: {
  hint: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border p-4">
      <p className="text-muted-foreground text-xs font-semibold">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tracking-tight">{value}</p>
      <p className="text-muted-foreground mt-0.5 text-xs">{hint}</p>
    </div>
  );
}

function SeedCell({
  eventId,
  registration,
}: {
  eventId: string;
  registration: Registration["registration"];
}) {
  const update = useUpdateRegistration(eventId);
  const [value, setValue] = useState(() =>
    registration.seed === null ? "" : String(registration.seed)
  );

  useEffect(() => {
    setValue(registration.seed === null ? "" : String(registration.seed));
  }, [registration.seed]);

  const commit = () => {
    const next = value.trim() === "" ? null : Number(value);
    if (next === registration.seed) {
      return;
    }
    if (next !== null && (!Number.isInteger(next) || next < 1)) {
      toast.error("Seed must be a positive whole number");
      setValue(registration.seed === null ? "" : String(registration.seed));
      return;
    }
    update.mutate(
      { json: { seed: next }, registrationId: registration.id },
      { onError: (error) => toast.error(error.message) }
    );
  };

  return (
    <Input
      aria-label="Seed for this player"
      className="w-14 text-center text-base sm:text-xs"
      disabled={update.isPending}
      inputMode="numeric"
      onBlur={commit}
      onChange={(changeEvent) =>
        setValue(changeEvent.target.value.replaceAll(/[^0-9]/gu, ""))
      }
      onKeyDown={(keyEvent) => {
        if (keyEvent.key === "Enter") {
          keyEvent.currentTarget.blur();
        }
      }}
      placeholder="—"
      value={value}
    />
  );
}

function RegistrationActions({
  eventId,
  onCancel,
  registration,
}: {
  eventId: string;
  onCancel: () => void;
  registration: Registration["registration"];
}) {
  const update = useUpdateRegistration(eventId);
  const { status } = registration;
  const pending = update.isPending;

  const move = (
    next: Exclude<RegistrationStatus, "pending_payment">,
    message: string
  ) => {
    update.mutate(
      { json: { status: next }, registrationId: registration.id },
      {
        onError: (error) => toast.error(error.message),
        onSuccess: () => toast.success(message),
      }
    );
  };

  if (status === "checked_in") {
    return (
      <>
        <Button
          disabled={pending}
          onClick={() => move("registered", "Check-in undone")}
          size="xs"
          variant="ghost"
        >
          <Undo2 data-icon="inline-start" /> Undo
        </Button>
        <Button disabled={pending} onClick={onCancel} size="xs" variant="ghost">
          <X data-icon="inline-start" /> Remove
        </Button>
      </>
    );
  }

  if (status === "waitlisted") {
    return (
      <>
        <Button
          disabled={pending}
          onClick={() => move("registered", "Player admitted from waitlist")}
          size="xs"
          variant="outline"
        >
          <Check data-icon="inline-start" /> Admit
        </Button>
        <Button disabled={pending} onClick={onCancel} size="xs" variant="ghost">
          <X data-icon="inline-start" /> Remove
        </Button>
      </>
    );
  }

  if (status === "pending_payment") {
    // Unpaid registrations can only be dropped; they never checked in.
    return (
      <Button disabled={pending} onClick={onCancel} size="xs" variant="ghost">
        <X data-icon="inline-start" /> Remove
      </Button>
    );
  }

  // registered
  return (
    <>
      <Button
        disabled={pending}
        onClick={() => move("checked_in", "Player checked in")}
        size="xs"
        variant="outline"
      >
        <Check data-icon="inline-start" /> Check in
      </Button>
      <Button
        disabled={pending}
        onClick={() => move("waitlisted", "Player moved to waitlist")}
        size="xs"
        variant="ghost"
      >
        <CalendarClock data-icon="inline-start" /> Waitlist
      </Button>
      <Button disabled={pending} onClick={onCancel} size="xs" variant="ghost">
        <X data-icon="inline-start" /> Remove
      </Button>
    </>
  );
}

const dateTimeFieldClasses = "text-base sm:text-sm";

function EditEventDialog({
  event,
  onClose,
}: {
  event: EventData;
  onClose: () => void;
}) {
  const updateEvent = useUpdateEvent(event.id);

  const [name, setName] = useState(event.name);
  const [description, setDescription] = useState(event.description ?? "");
  const [capacity, setCapacity] = useState(
    event.capacity === null || event.capacity === undefined
      ? ""
      : String(event.capacity)
  );
  const [feeDollars, setFeeDollars] = useState(
    (event.entryFeeCents / 100).toFixed(2)
  );
  const [startsAt, setStartsAt] = useState(toLocalInputValue(event.startsAt));
  const [endsAt, setEndsAt] = useState(toLocalInputValue(event.endsAt));
  const [deadline, setDeadline] = useState(
    toLocalInputValue(event.registrationDeadline)
  );
  const [refundPolicy, setRefundPolicy] = useState(event.refundPolicy ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleSubmit = (submitEvent: FormEvent) => {
    submitEvent.preventDefault();
    if (!name.trim()) {
      setError("Event name is required");
      return;
    }
    const startsAtIso = fromLocalInputValue(startsAt);
    if (!startsAtIso) {
      setError("Start time is required");
      return;
    }
    const endsAtIso = fromLocalInputValue(endsAt);
    if (endsAtIso && new Date(endsAtIso) <= new Date(startsAtIso)) {
      setError("End time must be after the start time");
      return;
    }
    const deadlineIso = fromLocalInputValue(deadline);
    const feeCents = Math.round(Number(feeDollars) * 100);
    if (!Number.isFinite(feeCents) || feeCents < 0) {
      setError("Entry fee must be zero or more");
      return;
    }
    const capacityNumber =
      capacity.trim() === "" ? undefined : Number(capacity);
    if (
      capacityNumber !== undefined &&
      (!Number.isInteger(capacityNumber) || capacityNumber < 1)
    ) {
      setError("Capacity must be a positive whole number");
      return;
    }
    setError(null);
    updateEvent.mutate(
      {
        ...(capacityNumber === undefined ? {} : { capacity: capacityNumber }),
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(endsAtIso ? { endsAt: endsAtIso } : {}),
        entryFeeCents: feeCents,
        name: name.trim(),
        ...(refundPolicy.trim() ? { refundPolicy: refundPolicy.trim() } : {}),
        ...(deadlineIso ? { registrationDeadline: deadlineIso } : {}),
        startsAt: startsAtIso,
      },
      {
        onError: (mutationError) => setError(mutationError.message),
        onSuccess: () => {
          toast.success("Event details updated");
          onClose();
        },
      }
    );
  };

  return (
    <dialog
      aria-label="Edit event details"
      className="fixed inset-0 z-[60] m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-transparent p-4"
      open
    >
      <button
        aria-label="Close"
        className="absolute inset-0 bg-black/65"
        onClick={onClose}
        type="button"
      />
      <div className="border-border bg-card relative flex max-h-[85vh] w-full max-w-[480px] flex-col overflow-hidden rounded-2xl border shadow-xl">
        <div className="border-border flex h-11 shrink-0 items-center justify-between border-b px-4">
          <span className="text-base font-semibold">Edit event details</span>
          <button
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>
        <form
          className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4"
          onSubmit={handleSubmit}
        >
          <div className="space-y-1.5">
            <Label htmlFor="edit-event-name">Name</Label>
            <Input
              className={dateTimeFieldClasses}
              id="edit-event-name"
              onChange={(changeEvent) => setName(changeEvent.target.value)}
              value={name}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-event-description">Description</Label>
            <textarea
              className={cn(
                dateTimeFieldClasses,
                "border-input focus-visible:border-ring focus-visible:ring-ring/50 h-20 w-full resize-none rounded-lg border bg-transparent px-2.5 py-2 outline-none focus-visible:ring-1"
              )}
              id="edit-event-description"
              maxLength={2000}
              onChange={(changeEvent) =>
                setDescription(changeEvent.target.value)
              }
              value={description}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-event-capacity">Capacity</Label>
              <Input
                className={dateTimeFieldClasses}
                id="edit-event-capacity"
                inputMode="numeric"
                min={1}
                onChange={(changeEvent) =>
                  setCapacity(
                    changeEvent.target.value.replaceAll(/[^0-9]/gu, "")
                  )
                }
                placeholder="Unlimited"
                value={capacity}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-event-fee">Entry fee ($)</Label>
              <Input
                className={dateTimeFieldClasses}
                id="edit-event-fee"
                inputMode="decimal"
                onChange={(changeEvent) =>
                  setFeeDollars(changeEvent.target.value)
                }
                value={feeDollars}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-event-starts">Starts</Label>
            <Input
              className={dateTimeFieldClasses}
              id="edit-event-starts"
              onChange={(changeEvent) => setStartsAt(changeEvent.target.value)}
              type="datetime-local"
              value={startsAt}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-event-ends">Ends</Label>
              <Input
                className={dateTimeFieldClasses}
                id="edit-event-ends"
                onChange={(changeEvent) => setEndsAt(changeEvent.target.value)}
                type="datetime-local"
                value={endsAt}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-event-deadline">Reg. deadline</Label>
              <Input
                className={dateTimeFieldClasses}
                id="edit-event-deadline"
                onChange={(changeEvent) =>
                  setDeadline(changeEvent.target.value)
                }
                type="datetime-local"
                value={deadline}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-event-refund">Refund policy</Label>
            <Input
              className={dateTimeFieldClasses}
              id="edit-event-refund"
              maxLength={1000}
              onChange={(changeEvent) =>
                setRefundPolicy(changeEvent.target.value)
              }
              placeholder="Full refund until 7 days before"
              value={refundPolicy}
            />
          </div>
          {error ? (
            <p className="text-destructive text-xs font-medium">{error}</p>
          ) : null}
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button
              disabled={updateEvent.isPending}
              onClick={onClose}
              size="sm"
              variant="outline"
              type="button"
            >
              Discard
            </Button>
            <Button disabled={updateEvent.isPending} size="sm" type="submit">
              Save changes
            </Button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

function ConfirmDialog({
  busy,
  confirmLabel,
  description,
  onClose,
  onConfirm,
  title,
}: {
  busy: boolean;
  confirmLabel: string;
  description: string;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
}) {
  useEffect(() => {
    const onKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <dialog
      aria-label={title}
      className="fixed inset-0 z-[60] m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-transparent p-4"
      open
    >
      <button
        aria-label="Close"
        className="absolute inset-0 bg-black/65"
        onClick={onClose}
        type="button"
      />
      <div className="border-border bg-card relative w-full max-w-[400px] rounded-2xl border p-5 shadow-xl">
        <h3 className="font-bold">{title}</h3>
        <p className="text-muted-foreground mt-2 text-sm">{description}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button disabled={busy} onClick={onClose} size="sm" variant="outline">
            Go back
          </Button>
          <Button
            disabled={busy}
            onClick={onConfirm}
            size="sm"
            variant="destructive"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
