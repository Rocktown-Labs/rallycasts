import { Button } from "@rallycaststv/ui/components/button";
import { Card, CardContent } from "@rallycaststv/ui/components/card";
import { Input } from "@rallycaststv/ui/components/input";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Info,
  CheckCircle2,
  ListChecks,
  Search,
  Settings,
  Trophy,
  User,
  PlusCircle,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import {
  useEventLive,
  useEventPlayers,
  useJoinEvent,
  useLeaveEvent,
  usePlayers,
} from "@/lib/hooks";
import { readApiJson } from "@/lib/hooks/api";

import { useEventContext } from "./events.$id";

export const Route = createFileRoute("/events/$id/")({
  component: EventOverviewTab,
});

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: (
    mode: "singles" | "doubles",
    partner: { id: string; name: string; username: string } | null
  ) => void;
  currentUser: {
    id: string;
    name: string;
    username?: string;
    displayUsername?: string;
  } | null;
  entryFeeCents: number;
}

function RegistrationModal({
  isOpen,
  onClose,
  onRegister,
  currentUser,
  entryFeeCents,
}: RegistrationModalProps) {
  const [regMode, setRegMode] = useState<"singles" | "doubles">("singles");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPartner, setSelectedPartner] = useState<{
    id: string;
    name: string;
    username: string;
  } | null>(null);

  const { data: playersData } = usePlayers(searchQuery);
  const playersList = playersData?.players ?? [];
  const searchResults = searchQuery
    ? playersList.filter((p) => p.id !== currentUser?.id)
    : [];

  const handlePayAndRegister = () => {
    if (regMode === "doubles" && !selectedPartner) {
      toast.error("Please select a partner for Doubles registration.");
      return;
    }
    onRegister(regMode, selectedPartner);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200">
      <div className="bg-card border-border animate-in slide-in-from-bottom-4 w-full max-w-md overflow-hidden rounded-xl border shadow-xl duration-300">
        <div className="border-border flex items-center justify-between border-b p-5">
          <h2 className="text-base font-bold">Event Registration</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          >
            <XCircle className="size-5" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5">
          <div>
            <span className="text-muted-foreground mb-2 block text-xs font-semibold">
              Select Registration Mode
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setRegMode("singles");
                  setSelectedPartner(null);
                }}
                className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-semibold transition-all ${
                  regMode === "singles"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-muted/30 text-muted-foreground"
                }`}
              >
                <User className="size-4" />
                Singles
              </button>
              <button
                type="button"
                onClick={() => setRegMode("doubles")}
                className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-semibold transition-all ${
                  regMode === "doubles"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-muted/30 text-muted-foreground"
                }`}
              >
                <Users className="size-4" />
                Doubles
              </button>
            </div>
          </div>

          {regMode === "doubles" && (
            <div className="space-y-2">
              <span className="text-muted-foreground block text-xs font-semibold">
                Find and Invite a Partner
              </span>
              {selectedPartner ? (
                <div className="bg-primary/5 border-primary/20 flex items-center justify-between rounded-lg border p-3 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/20 text-primary flex size-7 items-center justify-center rounded-full font-bold">
                      {selectedPartner.name[0]}
                    </div>
                    <div>
                      <p className="font-semibold">{selectedPartner.name}</p>
                      <p className="text-muted-foreground text-[10px]">
                        @{selectedPartner.username}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPartner(null)}
                    className="cursor-pointer font-semibold text-red-400 hover:text-red-500"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
                    <Input
                      placeholder="Search players by name/username..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 text-xs"
                    />
                  </div>

                  {searchQuery && searchResults.length > 0 && (
                    <div className="border-border bg-card divide-border/50 max-h-40 divide-y overflow-y-auto rounded-lg border">
                      {searchResults.map((player) => (
                        <button
                          key={player.id}
                          type="button"
                          onClick={() => {
                            setSelectedPartner({
                              id: player.id,
                              name: player.name,
                              username:
                                player.username || player.displayUsername || "",
                            });
                            setSearchQuery("");
                          }}
                          className="hover:bg-muted/40 flex w-full cursor-pointer items-center justify-between p-2.5 text-left text-xs transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <div className="bg-muted flex size-6 items-center justify-center rounded-full text-[10px] font-bold">
                              {player.name[0]}
                            </div>
                            <div>
                              <p className="font-semibold">{player.name}</p>
                              <p className="text-muted-foreground text-[10px]">
                                @{player.username || player.displayUsername}
                              </p>
                            </div>
                          </div>
                          <PlusCircle className="text-primary size-4" />
                        </button>
                      ))}
                    </div>
                  )}
                  {searchQuery && searchResults.length === 0 && (
                    <p className="text-muted-foreground py-2 text-center text-[11px]">
                      No players found matching &quot;{searchQuery}&quot;
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="border-border/50 space-y-3 border-t pt-4">
            <span className="text-muted-foreground block text-xs font-semibold">
              Payment Details
            </span>
            <div className="bg-muted/20 border-border/30 space-y-1.5 rounded-lg border p-3 text-xs">
              <div className="flex justify-between">
                <span>Registration Cost:</span>
                <span>
                  {entryFeeCents > 0
                    ? `$${(entryFeeCents / 100).toFixed(2)}`
                    : "Free"}
                </span>
              </div>
              <div className="text-foreground flex justify-between font-bold">
                <span>Total Charged:</span>
                <span>
                  {entryFeeCents > 0
                    ? `$${(entryFeeCents / 100).toFixed(2)}`
                    : "$0.00"}
                </span>
              </div>
            </div>
            <p className="text-muted-foreground text-[10px] leading-normal">
              Paid entry opens Stripe-hosted Checkout. Your spot is confirmed
              only after RallyCasts receives the signed payment webhook.
            </p>
          </div>
        </div>

        <div className="border-border flex gap-2 border-t p-5">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 rounded-lg text-xs"
          >
            Cancel
          </Button>
          <Button
            onClick={handlePayAndRegister}
            className="flex-1 cursor-pointer rounded-lg text-xs font-semibold"
          >
            {entryFeeCents > 0 ? "Continue to Checkout" : "Register"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// oxlint-disable-next-line complexity
function EventOverviewTab() {
  const { canManageEvent, event } = useEventContext();
  const { data: sessionData } = authClient.useSession();
  const currentUser = sessionData?.user;
  const { data: playersData } = useEventPlayers(event.id);
  const { data: liveData } = useEventLive(event.id);
  const joinEvent = useJoinEvent(event.id);
  const leaveEvent = useLeaveEvent(event.id);

  // Registration states
  const [registeredTeam, setRegisteredTeam] = useState<{
    mode: string;
    partner?: string;
  } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const players = playersData?.players ?? [];
  const myRegistration = players.find(
    ({ player }) => player.id === currentUser?.id
  )?.registration;
  const isRegistered = Boolean(myRegistration);
  const liveSnapshot = liveData?.snapshot;
  const registrationCount =
    typeof liveSnapshot === "object" &&
    liveSnapshot !== null &&
    "registrationCount" in liveSnapshot &&
    typeof liveSnapshot.registrationCount === "number"
      ? liveSnapshot.registrationCount
      : players.length;
  const capacity = event.capacity ?? Math.max(registrationCount, 1);
  const progressPercent = Math.min(100, (registrationCount / capacity) * 100);

  const startsAtDate = new Date(event.startsAt);
  const formattedDate = startsAtDate.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    weekday: "long",
    year: "numeric",
  });
  const formattedTime = startsAtDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleRegister = async (
    mode: "singles" | "doubles",
    partner: { id: string; name: string; username: string } | null
  ) => {
    if (event.entryFeeCents > 0) {
      try {
        const result = await readApiJson(
          apiClient.api.v1.stripe.events[":eventId"].checkout.$post({
            param: { eventId: event.id },
          })
        );
        window.location.assign(result.checkoutUrl);
      } catch {
        toast.error("Could not start secure checkout.");
      }
      return;
    }
    joinEvent.mutate(undefined, {
      onError: () => {
        toast.error("Could not register for this event. Please try again.");
      },
      onSuccess: (result) => {
        setRegisteredTeam({
          mode,
          partner: mode === "doubles" && partner ? partner.name : undefined,
        });
        setShowModal(false);
        toast.success(
          result.registration?.status === "waitlisted"
            ? `You're on the waitlist for ${event.name}.`
            : `Successfully registered for ${event.name}!`
        );
      },
    });
  };

  const handleCancelRegistration = async () => {
    const isPaidRegistration =
      typeof myRegistration === "object" &&
      myRegistration !== null &&
      "paymentStatus" in myRegistration &&
      myRegistration.paymentStatus === "paid";
    if (isPaidRegistration) {
      try {
        await readApiJson(
          apiClient.api.v1.stripe.events[":eventId"].refund.$post({
            param: { eventId: event.id },
          })
        );
        toast.success("Your full refund was submitted.");
      } catch {
        toast.error(
          "That registration is no longer eligible for self-service refund."
        );
      }
      return;
    }
    leaveEvent.mutate(undefined, {
      onError: () => {
        toast.error("Could not cancel registration.");
      },
      onSuccess: () => {
        setRegisteredTeam(null);
        toast.info("Registration cancelled.");
      },
    });
  };

  return (
    <div className="animate-in fade-in grid gap-6 duration-300 md:grid-cols-[2fr_1fr]">
      <div className="space-y-6">
        <Card className="border-border/50 bg-card rounded-xl border shadow-sm">
          <CardContent className="space-y-6 p-6">
            <div className="flex items-start gap-3.5">
              <Calendar className="text-primary mt-0.5 size-5" />
              <div>
                <h3 className="text-sm font-semibold">Date</h3>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {formattedDate}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <Clock className="text-primary mt-0.5 size-5" />
              <div>
                <h3 className="text-sm font-semibold">Time</h3>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {formattedTime}
                </p>
              </div>
            </div>

            {event.venueId && (
              <div className="flex items-start gap-3.5">
                <MapPin className="text-primary mt-0.5 size-5" />
                <div>
                  <h3 className="text-sm font-semibold">Venue</h3>
                  <Link
                    to="/venues/$id"
                    params={{ id: event.venueId }}
                    className="text-primary mt-0.5 block text-xs font-medium hover:underline"
                  >
                    View Venue Details
                  </Link>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3.5">
              <Users className="text-primary mt-0.5 size-5" />
              <div>
                <h3 className="text-sm font-semibold">Player Capacity</h3>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {event.capacity
                    ? `${registrationCount}/${event.capacity}`
                    : "Open entry"}
                </p>
                <div className="bg-muted mt-2 h-2 w-44 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card rounded-xl border shadow-sm">
          <CardContent className="space-y-3 p-6">
            <h3 className="flex items-center gap-1.5 text-base font-bold">
              <Info className="text-primary size-4" /> Description
            </h3>
            <p className="text-muted-foreground text-xs leading-relaxed whitespace-pre-wrap">
              {event.description ||
                "No description provided for this pickleball event."}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {canManageEvent ? (
          <Card className="border-primary/30 bg-primary/5 rounded-xl border p-5 shadow-sm">
            <div className="space-y-4">
              <div>
                <h3 className="text-primary flex items-center gap-2 text-sm font-bold">
                  <Settings className="size-4" /> Organizer Tools
                </h3>
                <p className="text-muted-foreground mt-1 text-xs">
                  Manage registrations, generate brackets, update match flow,
                  and change event status from the organizer console.
                </p>
              </div>
              <div className="grid gap-2">
                <Link params={{ id: event.id }} to="/events/$id/players">
                  <Button
                    className="w-full justify-start rounded-lg"
                    variant="outline"
                  >
                    <Users className="size-4" /> Player pool
                  </Button>
                </Link>
                <Link params={{ id: event.id }} to="/events/$id/bracket">
                  <Button
                    className="w-full justify-start rounded-lg"
                    variant="outline"
                  >
                    <Trophy className="size-4" /> Bracket desk
                  </Button>
                </Link>
                <Link params={{ id: event.id }} to="/events/$id/matches">
                  <Button
                    className="w-full justify-start rounded-lg"
                    variant="outline"
                  >
                    <ListChecks className="size-4" /> Match flow
                  </Button>
                </Link>
                <Link to="/u/organizer/organizations">
                  <Button className="w-full justify-start rounded-lg">
                    <Calendar className="size-4" /> Manage all events
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        ) : null}

        {isRegistered ? (
          <Card className="space-y-4 rounded-xl border border-green-500/30 bg-green-500/5 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green-500" />
              <div>
                <h3 className="text-sm font-bold text-green-400">
                  You&apos;re Registered!
                </h3>
                <p className="text-muted-foreground mt-1 text-xs">
                  You have reserved a spot. We&apos;ve notified your partner if
                  you added one.
                </p>
              </div>
            </div>

            <div className="bg-muted/30 border-border/30 space-y-1.5 rounded-lg border p-3 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mode:</span>
                <span className="text-foreground font-semibold capitalize">
                  {registeredTeam?.mode ?? "singles"}
                </span>
              </div>
              {registeredTeam?.partner && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Partner:</span>
                  <span className="text-foreground font-semibold">
                    {registeredTeam.partner}
                  </span>
                </div>
              )}
              <div className="border-border/20 mt-1.5 flex justify-between border-t pt-1.5 font-bold">
                <span className="text-muted-foreground font-normal">
                  Status:
                </span>
                <span
                  className={
                    myRegistration?.status === "waitlisted"
                      ? "text-brand-yellow"
                      : "text-green-500"
                  }
                >
                  {myRegistration?.status === "waitlisted"
                    ? "Waitlisted"
                    : "Confirmed"}
                </span>
              </div>
            </div>

            <Button
              onClick={handleCancelRegistration}
              disabled={leaveEvent.isPending}
              variant="outline"
              className="w-full rounded-lg border-red-500/20 py-4 text-xs font-semibold text-red-400 hover:bg-red-500/10"
            >
              Cancel Registration
            </Button>
          </Card>
        ) : (
          <Card className="border-border/50 bg-card space-y-4 rounded-xl border p-5 text-center shadow-sm">
            <h3 className="text-sm font-bold">Are you playing?</h3>
            <p className="text-muted-foreground text-xs">
              Sign up to reserve your spot on the courts and get notifications
              about bracket updates.
            </p>
            <div className="bg-muted/40 border-border/30 space-y-1 rounded-lg border p-3 text-left text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Entry fee:</span>
                <span className="font-bold">
                  {event.entryFeeCents > 0
                    ? `$${(event.entryFeeCents / 100).toFixed(2)}`
                    : "Free"}
                </span>
              </div>
            </div>
            <Button
              onClick={() => {
                if (!currentUser) {
                  toast.error("Please log in to register for this event.");
                  return;
                }
                setShowModal(true);
              }}
              disabled={joinEvent.isPending}
              className="w-full cursor-pointer rounded-lg py-5 text-xs font-semibold"
            >
              Register for Event
            </Button>
          </Card>
        )}
      </div>

      <RegistrationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onRegister={handleRegister}
        currentUser={
          currentUser
            ? {
                displayUsername: currentUser.displayUsername ?? undefined,
                id: currentUser.id,
                name: currentUser.name,
                username: currentUser.username ?? undefined,
              }
            : null
        }
        entryFeeCents={event.entryFeeCents}
      />
    </div>
  );
}
