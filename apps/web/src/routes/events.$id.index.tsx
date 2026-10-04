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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        <div className="p-5 border-b border-border flex justify-between items-center">
          <h2 className="text-base font-bold">Event Registration</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <XCircle className="size-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <span className="text-xs font-semibold text-muted-foreground block mb-2">
              Select Registration Mode
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setRegMode("singles");
                  setSelectedPartner(null);
                }}
                className={`p-3 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
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
                className={`p-3 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
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
              <span className="text-xs font-semibold text-muted-foreground block">
                Find and Invite a Partner
              </span>
              {selectedPartner ? (
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="size-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                      {selectedPartner.name[0]}
                    </div>
                    <div>
                      <p className="font-semibold">{selectedPartner.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        @{selectedPartner.username}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPartner(null)}
                    className="text-red-400 hover:text-red-500 font-semibold cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      placeholder="Search players by name/username..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 text-xs"
                    />
                  </div>

                  {searchQuery && searchResults.length > 0 && (
                    <div className="border border-border rounded-lg bg-card max-h-40 overflow-y-auto divide-y divide-border/50">
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
                          className="w-full text-left p-2.5 hover:bg-muted/40 flex items-center justify-between text-xs cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <div className="size-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                              {player.name[0]}
                            </div>
                            <div>
                              <p className="font-semibold">{player.name}</p>
                              <p className="text-[10px] text-muted-foreground">
                                @{player.username || player.displayUsername}
                              </p>
                            </div>
                          </div>
                          <PlusCircle className="size-4 text-primary" />
                        </button>
                      ))}
                    </div>
                  )}
                  {searchQuery && searchResults.length === 0 && (
                    <p className="text-[11px] text-muted-foreground text-center py-2">
                      No players found matching "{searchQuery}"
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="border-t border-border/50 pt-4 space-y-3">
            <span className="text-xs font-semibold text-muted-foreground block">
              Payment Details
            </span>
            <div className="text-xs bg-muted/20 p-3 rounded-lg border border-border/30 space-y-1.5">
              <div className="flex justify-between">
                <span>Registration Cost:</span>
                <span>
                  {entryFeeCents > 0
                    ? `$${(entryFeeCents / 100).toFixed(2)}`
                    : "Free"}
                </span>
              </div>
              <div className="flex justify-between font-bold text-foreground">
                <span>Total Charged:</span>
                <span>
                  {entryFeeCents > 0
                    ? `$${(entryFeeCents / 100).toFixed(2)}`
                    : "$0.00"}
                </span>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground leading-normal">
              Paid entry opens Stripe-hosted Checkout. Your spot is confirmed
              only after RallyCasts receives the signed payment webhook.
            </p>
          </div>
        </div>

        <div className="p-5 border-t border-border flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 rounded-lg text-xs"
          >
            Cancel
          </Button>
          <Button
            onClick={handlePayAndRegister}
            className="flex-1 rounded-lg text-xs font-semibold cursor-pointer"
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
    <div className="grid gap-6 md:grid-cols-[2fr_1fr] animate-in fade-in duration-300">
      <div className="space-y-6">
        <Card className="border border-border/50 bg-card rounded-xl shadow-sm">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-start gap-3.5">
              <Calendar className="size-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm">Date</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formattedDate}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <Clock className="size-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm">Time</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formattedTime}
                </p>
              </div>
            </div>

            {event.venueId && (
              <div className="flex items-start gap-3.5">
                <MapPin className="size-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-semibold text-sm">Venue</h3>
                  <Link
                    to="/venues/$id"
                    params={{ id: event.venueId }}
                    className="text-xs text-primary hover:underline font-medium mt-0.5 block"
                  >
                    View Venue Details
                  </Link>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3.5">
              <Users className="size-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm">Player Capacity</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {event.capacity
                    ? `${registrationCount}/${event.capacity}`
                    : "Open entry"}
                </p>
                <div className="mt-2 h-2 w-44 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/50 bg-card rounded-xl shadow-sm">
          <CardContent className="p-6 space-y-3">
            <h3 className="font-bold text-base flex items-center gap-1.5">
              <Info className="size-4 text-primary" /> Description
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {event.description ||
                "No description provided for this pickleball event."}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {canManageEvent ? (
          <Card className="rounded-xl border border-primary/30 bg-primary/5 p-5 shadow-sm">
            <div className="space-y-4">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold text-primary">
                  <Settings className="size-4" /> Organizer Tools
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
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
          <Card className="border border-green-500/30 bg-green-500/5 rounded-xl shadow-sm p-5 space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="size-5 text-green-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-sm text-green-400">
                  You're Registered!
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  You have reserved a spot. We've notified your partner if you
                  added one.
                </p>
              </div>
            </div>

            <div className="text-xs bg-muted/30 p-3 rounded-lg border border-border/30 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mode:</span>
                <span className="font-semibold capitalize text-foreground">
                  {registeredTeam?.mode ?? "singles"}
                </span>
              </div>
              {registeredTeam?.partner && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Partner:</span>
                  <span className="font-semibold text-foreground">
                    {registeredTeam.partner}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t border-border/20 pt-1.5 mt-1.5 font-bold">
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
              className="w-full rounded-lg text-xs font-semibold py-4 border-red-500/20 text-red-400 hover:bg-red-500/10"
            >
              Cancel Registration
            </Button>
          </Card>
        ) : (
          <Card className="border border-border/50 bg-card rounded-xl shadow-sm p-5 text-center space-y-4">
            <h3 className="font-bold text-sm">Are you playing?</h3>
            <p className="text-xs text-muted-foreground">
              Sign up to reserve your spot on the courts and get notifications
              about bracket updates.
            </p>
            <div className="text-xs bg-muted/40 p-3 rounded-lg text-left border border-border/30 space-y-1">
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
              className="w-full rounded-lg text-xs font-semibold py-5 cursor-pointer"
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
