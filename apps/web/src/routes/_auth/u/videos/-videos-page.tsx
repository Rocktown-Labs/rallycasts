import { Button, buttonVariants } from "@rallycaststv/ui/components/button";
import { cn } from "@rallycaststv/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import {
  BarChart3,
  Clock3,
  PlusCircle,
  Radio,
  Scissors,
  Video,
} from "lucide-react";

import { EmptyState } from "@/components/rally/cards";
import { myVideosCollection, useLiveQuery } from "@/lib/collections";

type VideosSection = "clips" | "live" | "videos";

const videoTabs = [
  { icon: Video, label: "Videos", section: "videos", to: "/u/videos" },
  { icon: Scissors, label: "Clips", section: "clips", to: "/u/videos/clips" },
  { icon: Radio, label: "Live", section: "live", to: "/u/videos/live" },
] as const;

const statusLabel = {
  deleted: "Deleted",
  draft: "Draft",
  failed: "Failed",
  processing: "Processing",
  ready: "Ready",
  uploading: "Uploading",
} as const;

const formatDuration = (seconds?: number | null) => {
  if (!seconds) {
    return "-";
  }
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
};

export function VideosPage({
  section = "videos",
}: {
  section?: VideosSection;
}) {
  const { data: videos = [], isLoading } = useLiveQuery(myVideosCollection);
  const clips = videos.filter((video) => video.mediaType === "short");
  const activeItems = section === "clips" ? clips : videos;
  const activeTab = videoTabs.find((tab) => tab.section === section);

  return (
    <main className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            Your Library
          </p>
          <h1 className="mt-1 text-3xl font-bold">Your videos</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Review uploads, clips, and live sessions. Create and publish from
            Studio.
          </p>
        </div>
        <Link
          className={cn(buttonVariants(), "rounded-lg")}
          to={section === "live" ? "/u/studio" : "/u/studio/upload"}
        >
          <PlusCircle /> {section === "live" ? "Start in Studio" : "Upload"}
        </Link>
      </header>

      <nav aria-label="Video library sections" className="flex gap-2 border-b">
        {videoTabs.map(({ icon: Icon, label, section: tabSection, to }) => (
          <Link key={tabSection} to={to}>
            <Button
              className={cn(
                "rounded-b-none border-b-2",
                tabSection === section
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground"
              )}
              variant={tabSection === section ? "ghost" : "ghost"}
            >
              <Icon /> {label}
            </Button>
          </Link>
        ))}
      </nav>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              className="h-24 rounded-xl bg-muted"
              key={`video-loading-${index + 1}`}
            />
          ))}
        </div>
      ) : null}

      {!isLoading && section === "live" ? (
        <div className="rounded-2xl border bg-card p-8">
          <EmptyState
            message="Live tools will start from Studio. Scheduled streams and replays will appear here."
            title="No live sessions yet"
          />
          <div className="mt-5 flex justify-center">
            <Link className={cn(buttonVariants(), "rounded-lg")} to="/u/studio">
              Open Studio
            </Link>
          </div>
        </div>
      ) : null}

      {!isLoading && section !== "live" && activeItems.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border bg-card">
          <div className="hidden grid-cols-[minmax(0,1fr)_8rem_8rem_7rem_8rem] gap-4 border-b bg-muted/40 px-5 py-3 text-xs font-semibold text-muted-foreground md:grid">
            <span>{activeTab?.label}</span>
            <span>Visibility</span>
            <span>Status</span>
            <span>Duration</span>
            <span>Actions</span>
          </div>
          {activeItems.map((video) => (
            <div
              className="grid gap-4 border-b p-4 last:border-0 md:grid-cols-[minmax(0,1fr)_8rem_8rem_7rem_8rem] md:items-center md:px-5"
              key={video.id}
            >
              <Link
                className="flex min-w-0 items-center gap-4 hover:text-primary"
                params={{ id: video.id }}
                to="/u/studio/videos/$id"
              >
                <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-lg bg-black">
                  {video.thumbnailUrl ? (
                    <img
                      alt=""
                      className="size-full object-cover"
                      src={video.thumbnailUrl}
                    />
                  ) : (
                    <div className="grid size-full place-items-center">
                      <Video className="size-7 text-primary/70" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-bold">{video.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {video.description || "Add a description in Studio"}
                  </p>
                </div>
              </Link>
              <span className="text-sm capitalize">{video.visibility}</span>
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">
                <Clock3 className="size-3" /> {statusLabel[video.status]}
              </span>
              <span className="text-sm text-muted-foreground">
                {formatDuration(video.durationSeconds)}
              </span>
              <div className="flex gap-2">
                <Link params={{ id: video.id }} to="/u/studio/videos/$id">
                  <Button className="rounded-lg" size="sm" variant="outline">
                    Edit
                  </Button>
                </Link>
                {video.status === "ready" && video.visibility === "public" ? (
                  <Link params={{ id: video.id }} to="/videos/$id">
                    <Button className="rounded-lg" size="sm" variant="ghost">
                      View
                    </Button>
                  </Link>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {!isLoading && section !== "live" && activeItems.length === 0 ? (
        <div className="rounded-2xl border bg-card p-8">
          <EmptyState
            message={
              section === "clips"
                ? "Create clips from a Studio video workspace."
                : "Upload your first video and we’ll take you straight into Studio while Mux processes it."
            }
            title={
              section === "clips"
                ? "No clips yet"
                : "Your channel is ready for its first RallyCast"
            }
          />
          <div className="mt-5 flex justify-center gap-2">
            <Link
              className={cn(buttonVariants(), "rounded-lg")}
              to="/u/studio/upload"
            >
              Upload a video
            </Link>
            <Link
              className={cn(
                buttonVariants({ variant: "outline" }),
                "rounded-lg"
              )}
              to="/u/studio"
            >
              <BarChart3 />
              Open Studio
            </Link>
          </div>
        </div>
      ) : null}
    </main>
  );
}
