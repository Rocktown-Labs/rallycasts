import { Button, buttonVariants } from "@rallycaststv/ui/components/button";
import { cn } from "@rallycaststv/ui/lib/utils";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock3, PlusCircle, Radio, Scissors, Video } from "lucide-react";

import { EmptyState } from "@/components/rally/cards";
import { useMyVideos } from "@/lib/hooks";

export const Route = createFileRoute("/_auth/u/videos/me")({
  component: VideosPage,
});

const statusLabel = {
  deleted: "Deleted",
  draft: "Draft",
  failed: "Failed",
  processing: "Processing",
  ready: "Ready",
  uploading: "Uploading",
} as const;

const formatDuration = (seconds: number | null) => {
  if (!seconds) {
    return "—";
  }
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
};

function VideosPage() {
  const { data, isLoading } = useMyVideos();
  const videos = data?.videos ?? [];

  return (
    <main className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            RallyCasts Studio
          </p>
          <h1 className="mt-1 text-3xl font-bold">Channel content</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Upload, finish, clip, and publish every RallyCast from one place.
          </p>
        </div>
        <Link
          className={cn(buttonVariants(), "rounded-lg")}
          to="/u/studio/upload"
        >
          <PlusCircle className="size-4" /> Upload video
        </Link>
      </header>

      <nav aria-label="Studio content types" className="flex gap-2 border-b">
        <Button className="rounded-b-none border-b-2" variant="ghost">
          <Video className="size-4" /> Videos
        </Button>
        <Button className="rounded-b-none" disabled variant="ghost">
          <Scissors className="size-4" /> Clips
        </Button>
        <Button className="rounded-b-none" disabled variant="ghost">
          <Radio className="size-4" /> Live
        </Button>
      </nav>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              className="h-24 animate-pulse rounded-xl bg-muted"
              key={`video-loading-${index + 1}`}
            />
          ))}
        </div>
      ) : null}

      {!isLoading && videos.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border bg-card">
          <div className="hidden grid-cols-[minmax(0,1fr)_8rem_8rem_7rem] gap-4 border-b bg-muted/40 px-5 py-3 text-xs font-semibold text-muted-foreground md:grid">
            <span>Video</span>
            <span>Visibility</span>
            <span>Status</span>
            <span>Duration</span>
          </div>
          {videos.map((video) => (
            <Link
              className="grid gap-4 border-b p-4 transition-colors last:border-0 hover:bg-muted/40 md:grid-cols-[minmax(0,1fr)_8rem_8rem_7rem] md:items-center md:px-5"
              key={video.id}
              params={{ id: video.id }}
              to="/u/studio/videos/$id"
            >
              <div className="flex min-w-0 items-center gap-4">
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
              </div>
              <span className="text-sm capitalize">{video.visibility}</span>
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">
                <Clock3 className="size-3" /> {statusLabel[video.status]}
              </span>
              <span className="text-sm text-muted-foreground">
                {formatDuration(video.durationSeconds)}
              </span>
            </Link>
          ))}
        </div>
      ) : null}

      {!isLoading && videos.length === 0 ? (
        <div className="rounded-2xl border bg-card p-8">
          <EmptyState
            message="Upload your first video and we’ll take you straight into Studio while Mux processes it."
            title="Your channel is ready for its first RallyCast"
          />
          <div className="mt-5 flex justify-center">
            <Link className={buttonVariants()} to="/u/studio/upload">
              Upload a video
            </Link>
          </div>
        </div>
      ) : null}
    </main>
  );
}
