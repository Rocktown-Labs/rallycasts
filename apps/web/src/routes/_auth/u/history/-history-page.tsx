import { Button } from "@rallycaststv/ui/components/button";
import { Skeleton } from "@rallycaststv/ui/components/skeleton";
import { Link } from "@tanstack/react-router";
import { Calendar, Eye, User, Video } from "lucide-react";

import { EmptyState } from "@/components/rally/cards";
import { useEvents, useFriends, useMyVideos } from "@/lib/hooks";

type HistorySection = "events" | "profiles" | "videos";

const historyTabs = [
  { icon: Video, label: "Videos", section: "videos", to: "/u/history/videos" },
  {
    icon: User,
    label: "Profiles",
    section: "profiles",
    to: "/u/history/profiles",
  },
  {
    icon: Calendar,
    label: "Events",
    section: "events",
    to: "/u/history/events",
  },
] as const;

function HistoryRowsSkeleton() {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          className="grid gap-4 py-5 md:grid-cols-[9rem_1fr_auto] md:items-center"
          key={`history-skeleton-${index.toString()}`}
        >
          <Skeleton className="aspect-video rounded-md" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-48 rounded-md" />
            <Skeleton className="h-3 w-32 rounded-md" />
          </div>
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      ))}
    </div>
  );
}

function VideosHistory() {
  const { data, isError, isLoading } = useMyVideos();
  const videos = data?.videos ?? [];

  if (isLoading) {
    return <HistoryRowsSkeleton />;
  }

  if (isError) {
    return (
      <EmptyState
        message="We could not load your video history. Refresh the page or try again in a moment."
        title="Video history unavailable"
      />
    );
  }

  if (videos.length === 0) {
    return (
      <EmptyState
        message="Your uploaded and watched video activity will appear here as it is recorded."
        title="No video history yet"
      />
    );
  }

  return (
    <div className="divide-y divide-border">
      {videos.map((video) => (
        <div
          className="grid gap-4 py-5 md:grid-cols-[9rem_1fr_auto] md:items-center"
          key={video.id}
        >
          <div className="relative aspect-video overflow-hidden rounded-md bg-muted">
            {video.thumbnailUrl ? (
              <img
                alt={video.title}
                className="size-full object-cover"
                src={video.thumbnailUrl}
              />
            ) : null}
          </div>
          <div>
            <h3 className="font-medium text-sm">{video.title}</h3>
            <p className="text-muted-foreground text-xs">
              {video.publishedAt
                ? `Published ${new Date(video.publishedAt).toLocaleDateString()}`
                : `Created ${new Date(video.createdAt).toLocaleDateString()}`}
            </p>
          </div>
          <Link params={{ id: video.id }} to="/videos/$id">
            <Button className="rounded-md text-xs" variant="outline">
              <Eye className="size-4" />
              Watch
            </Button>
          </Link>
        </div>
      ))}
    </div>
  );
}

function ProfilesHistory() {
  const { data, isError, isLoading } = useFriends();
  const friends = data?.friends ?? [];

  if (isLoading) {
    return <HistoryRowsSkeleton />;
  }

  if (isError) {
    return (
      <EmptyState
        message="We could not load your profile history. Refresh the page or try again in a moment."
        title="Profile history unavailable"
      />
    );
  }

  if (friends.length === 0) {
    return (
      <EmptyState
        message="Profiles you connect with will appear here."
        title="No profile history yet"
      />
    );
  }

  return (
    <div className="divide-y divide-border">
      {friends.map((friend) => (
        <div
          className="flex flex-wrap items-center justify-between gap-3 py-4"
          key={friend.id}
        >
          <div>
            <h3 className="font-medium text-sm">{friend.name}</h3>
            <p className="text-muted-foreground text-xs">
              @{friend.username ?? friend.displayUsername ?? "player"}
            </p>
          </div>
          <Link
            params={{
              username: friend.username ?? friend.displayUsername ?? friend.id,
            }}
            to="/players/$username"
          >
            <Button className="rounded-md text-xs" variant="outline">
              View Profile
            </Button>
          </Link>
        </div>
      ))}
    </div>
  );
}

function EventsHistory() {
  const { data, isError, isLoading } = useEvents();
  const events = data?.events ?? [];

  if (isLoading) {
    return <HistoryRowsSkeleton />;
  }

  if (isError) {
    return (
      <EmptyState
        message="We could not load your event history. Refresh the page or try again in a moment."
        title="Event history unavailable"
      />
    );
  }

  if (events.length === 0) {
    return (
      <EmptyState
        message="Events you join, host, or revisit will appear here."
        title="No event history yet"
      />
    );
  }

  return (
    <div className="divide-y divide-border">
      {events.map((event) => (
        <div
          className="flex flex-wrap items-center justify-between gap-3 py-4"
          key={event.id}
        >
          <div>
            <h3 className="font-medium text-sm">{event.name}</h3>
            <p className="text-muted-foreground text-xs">
              {new Date(event.startsAt).toLocaleDateString()} ·{" "}
              {event.eventType.replaceAll("_", " ")}
            </p>
          </div>
          <Link params={{ id: event.id }} to="/events/$id">
            <Button className="rounded-md text-xs" variant="outline">
              View Event
            </Button>
          </Link>
        </div>
      ))}
    </div>
  );
}

export function HistoryPage({ section }: { section: HistorySection }) {
  const activeTab = historyTabs.find((tab) => tab.section === section);
  const ActiveIcon = activeTab?.icon ?? Video;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <h1 className="text-3xl font-bold">Your History</h1>
      <nav className="flex w-fit rounded-md bg-muted p-1">
        {historyTabs.map(({ icon: Icon, label, section: tabSection, to }) => (
          <Link key={tabSection} to={to}>
            <Button
              className="rounded-md"
              size="sm"
              variant={tabSection === section ? "default" : "ghost"}
            >
              <Icon className="size-4" /> {label}
            </Button>
          </Link>
        ))}
      </nav>
      <div className="rounded-lg border border-border p-6">
        <h2 className="mb-5 flex items-center gap-2 text-xl font-bold">
          <ActiveIcon className="size-5 text-primary" />
          {activeTab?.label}
        </h2>
        {section === "videos" ? <VideosHistory /> : null}
        {section === "profiles" ? <ProfilesHistory /> : null}
        {section === "events" ? <EventsHistory /> : null}
      </div>
    </div>
  );
}
