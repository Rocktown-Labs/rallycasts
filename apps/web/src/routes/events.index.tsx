import { Button } from "@rallycaststv/ui/components/button";
import { Input } from "@rallycaststv/ui/components/input";
import { createFileRoute } from "@tanstack/react-router";
import { Trophy, ArrowRight, Plus, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState, EventCard } from "@/components/rally/cards";
import type { EventCardData } from "@/components/rally/cards";
import { useEvents, useProfile, useUpdateProfile } from "@/lib/hooks";

export const Route = createFileRoute("/events/")({
  component: EventsPage,
});

function EventsPage() {
  const { data: eventsData, isLoading: eventsLoading } = useEvents();
  const { data: profileData } = useProfile();
  const updateProfileMutation = useUpdateProfile();

  const profile = profileData?.profile;
  const isOrganizer = profile?.isOrganizer ?? false;

  const [events, setEvents] = useState<EventCardData[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form states for creating an event
  const [eventName, setEventName] = useState("");
  const [eventType, setEventType] = useState("tournament");
  const [startsAt, setStartsAt] = useState("2026-06-20T15:00");
  const [capacity, setCapacity] = useState("96");
  const [venueId, setVenueId] = useState("demo-venue-1");
  const [description, setDescription] = useState("");

  const allEvents = [...(eventsData?.events ?? []), ...events];

  const handleUpgrade = async () => {
    try {
      await updateProfileMutation.mutateAsync({
        isOrganizer: true,
      });
      toast.success("Congratulations! You are now an Organizer.");
    } catch {
      toast.error("Failed to upgrade account. Please try again.");
    }
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim()) {
      toast.error("Event name is required.");
      return;
    }

    const newEvent: EventCardData = {
      capacity: Number.parseInt(capacity, 10) || 64,
      eventType,
      id: `custom-event-${Date.now()}`,
      name: eventName,
      startsAt: new Date(startsAt).toISOString(),
      status: "published",
      venueId,
    };

    setEvents((prev) => [newEvent, ...prev]);
    setShowCreateModal(false);

    // Clear form
    setEventName("");
    setEventType("tournament");
    setCapacity("96");
    setDescription("");

    toast.success(`Successfully published event: ${eventName}!`);
  };

  // Render events grid or empty state to avoid nested ternaries
  const renderEventsSection = () => {
    if (eventsLoading) {
      return <div className="h-72 animate-pulse rounded-lg bg-muted" />;
    }

    if (allEvents.length > 0) {
      return (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {allEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      );
    }

    return (
      <EmptyState
        message="Published tournaments, clinics, and open play events will appear here."
        title="No events yet"
      />
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Consolidated Organizer Banner */}
      <section className="rounded-2xl border border-border/50 bg-gradient-to-r from-emerald-950/40 via-muted/5 to-yellow-950/20 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-3xl">
          <div className="flex items-center gap-2">
            <Trophy className="size-5 text-primary" />
            <span className="text-[10px] bg-primary/15 text-primary font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              {isOrganizer ? "Organizer Account Active" : "Organizer Hub"}
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">
            {isOrganizer
              ? "Manage Your Club & Tournaments"
              : "Upgrade to an Organizer Account"}
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {isOrganizer
              ? "Publish new events, manage registration lists, view seeds, configure brackets, and request premium caster coverage."
              : "Organizer premium is for leagues, clinics, and tournaments that want discoverable events, recording packages, and better player turnout."}
          </p>
        </div>

        <div className="shrink-0 w-full md:w-auto">
          {isOrganizer ? (
            <Button
              onClick={() => setShowCreateModal(true)}
              className="w-full md:w-auto rounded-lg text-xs font-semibold py-5 px-5 flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="size-4" /> Create New Event
            </Button>
          ) : (
            <Button
              onClick={handleUpgrade}
              disabled={updateProfileMutation.isPending}
              className="w-full md:w-auto rounded-lg text-xs font-semibold py-5 px-5 flex items-center gap-1.5 cursor-pointer"
            >
              {updateProfileMutation.isPending
                ? "Upgrading..."
                : "Start Organizer Upgrade"}
              <ArrowRight className="size-4" />
            </Button>
          )}
        </div>
      </section>

      {/* Events list Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border/30">
        <h1 className="text-2xl font-bold">Upcoming Pickleball Events</h1>
        <div className="flex rounded-md bg-muted p-1 text-xs font-semibold">
          <Button className="rounded-md" size="sm">
            Upcoming Events
          </Button>
          <Button size="sm" variant="ghost">
            Past Events
          </Button>
        </div>
      </div>

      {renderEventsSection()}

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-5 border-b border-border flex justify-between items-center">
              <h2 className="text-base font-bold">Create New Event</h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <XCircle className="size-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent}>
              <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
                <div className="space-y-1">
                  <label
                    htmlFor="eventNameInput"
                    className="text-xs font-semibold text-muted-foreground"
                  >
                    Event Name
                  </label>
                  <Input
                    id="eventNameInput"
                    placeholder="e.g. Winter Pickleball Extravaganza"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    required
                    className="text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label
                      htmlFor="eventTypeSelect"
                      className="text-xs font-semibold text-muted-foreground block"
                    >
                      Event Type
                    </label>
                    <select
                      id="eventTypeSelect"
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                      className="w-full p-2.5 bg-card border border-border rounded-md text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                    >
                      <option value="tournament">Tournament</option>
                      <option value="open_play">Open Play</option>
                      <option value="clinic">Clinic</option>
                      <option value="league">League</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="venueIdSelect"
                      className="text-xs font-semibold text-muted-foreground block"
                    >
                      Venue
                    </label>
                    <select
                      id="venueIdSelect"
                      value={venueId}
                      onChange={(e) => setVenueId(e.target.value)}
                      className="w-full p-2.5 bg-card border border-border rounded-md text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                    >
                      <option value="demo-venue-1">
                        Crestwood Pickleball Park
                      </option>
                      <option value="demo-venue-2">
                        Mueller Sports Courts
                      </option>
                      <option value="demo-venue-3">
                        South Lamar Rec Center
                      </option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label
                      htmlFor="startsAtInput"
                      className="text-xs font-semibold text-muted-foreground"
                    >
                      Starts At
                    </label>
                    <Input
                      id="startsAtInput"
                      type="datetime-local"
                      value={startsAt}
                      onChange={(e) => setStartsAt(e.target.value)}
                      required
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="capacityInput"
                      className="text-xs font-semibold text-muted-foreground"
                    >
                      Capacity (Players)
                    </label>
                    <Input
                      id="capacityInput"
                      type="number"
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      required
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="descriptionInput"
                    className="text-xs font-semibold text-muted-foreground"
                  >
                    Event Description
                  </label>
                  <textarea
                    id="descriptionInput"
                    rows={3}
                    aria-label="Event Description"
                    placeholder="Provide details about registration costs, schedules, scoring formats, and rules..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-2.5 bg-card border border-border rounded-md text-xs focus:ring-1 focus:ring-primary focus:outline-none resize-none leading-normal text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <div className="p-5 border-t border-border flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 rounded-lg text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Publish Event
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
