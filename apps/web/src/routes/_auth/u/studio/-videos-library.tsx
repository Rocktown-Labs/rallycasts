import { Button, buttonVariants } from "@rallycaststv/ui/components/button";
import { cn } from "@rallycaststv/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { Clock3, Layers, Radio, Scissors, Video } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/rally/cards";
import { myVideosCollection, useLiveQuery } from "@/lib/collections";
import type { VideoRecord } from "@/lib/collections";
import { getVideoSlug } from "@/lib/hooks";

type VideosSection = "all" | "clips" | "live" | "videos";

const videoTabs = [
  { icon: Layers, label: "All", section: "all", to: "/u/studio/all" },
  { icon: Video, label: "Videos", section: "videos", to: "/u/studio" },
  { icon: Scissors, label: "Clips", section: "clips", to: "/u/studio/clips" },
  { icon: Radio, label: "Live", section: "live", to: "/u/studio/live" },
] as const;

type VideoSort = "newest" | "oldest";

const sortVideos = (videos: VideoRecord[], sort: VideoSort): VideoRecord[] =>
  [...videos].toSorted((a, b) => {
    const left = new Date(a.createdAt).getTime();
    const right = new Date(b.createdAt).getTime();
    return sort === "oldest" ? left - right : right - left;
  });

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

/**
 * The video library that lives inside Studio: section tabs plus the list of
 * the signed-in user's videos and clips. Studio owns the page header and the
 * quick actions; this component only renders the library.
 */
export function VideosLibrary({
  section = "videos",
}: {
  section?: VideosSection;
}) {
  const { data: videos = [], isLoading } = useLiveQuery(myVideosCollection);
  const [sort, setSort] = useState<VideoSort>("newest");
  // Videos = long-form only. Clips live in their own tab; All shows both.
  const longForm = videos.filter((video) => video.mediaType !== "short");
  const clips = videos.filter((video) => video.mediaType === "short");
  let sectionItems: VideoRecord[] = videos;
  if (section === "clips") {
    sectionItems = clips;
  } else if (section === "videos") {
    sectionItems = longForm;
  }
  const activeItems = sortVideos(sectionItems, sort);
  const activeTab = videoTabs.find((tab) => tab.section === section);

  return (
    <section className="space-y-5">
      <nav aria-label="Video library sections" className="flex gap-2 border-b">
        {videoTabs.map(({ icon: Icon, label, section: tabSection, to }) => (
          <Link key={tabSection} to={to}>
            <Button
              className={cn(
                "rounded-b-none border-b-2",
                tabSection === section
                  ? "border-primary text-primary"
                  : "text-muted-foreground border-transparent"
              )}
              variant="ghost"
            >
              <Icon /> {label}
            </Button>
          </Link>
        ))}
      </nav>

      {!isLoading && section !== "live" ? (
        <div className="flex items-center justify-end gap-2">
          <label
            className="text-muted-foreground text-xs font-semibold"
            htmlFor="library-sort"
          >
            Sort
          </label>
          <select
            className="border-input bg-background focus-visible:border-ring h-8 rounded-lg border px-2 text-xs outline-none"
            id="library-sort"
            onChange={(event) => setSort(event.target.value as VideoSort)}
            value={sort}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              className="bg-muted h-24 rounded-xl"
              key={`video-loading-${index + 1}`}
            />
          ))}
        </div>
      ) : null}

      {!isLoading && section === "live" ? (
        <div className="bg-card rounded-2xl border p-8">
          <EmptyState
            message="Live tools will start from Studio. Scheduled streams and replays will appear here."
            title="No live sessions yet"
          />
        </div>
      ) : null}

      {!isLoading && section !== "live" && activeItems.length > 0 ? (
        <div className="bg-card overflow-hidden rounded-2xl border">
          <div className="bg-muted/40 text-muted-foreground hidden grid-cols-[minmax(0,1fr)_8rem_8rem_7rem_8rem] gap-4 border-b px-5 py-3 text-xs font-semibold md:grid">
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
                className="hover:text-primary flex min-w-0 items-center gap-4"
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
                      <Video className="text-primary/70 size-7" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-bold">{video.title}</p>
                  <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                    {video.description || "Add a description in Studio"}
                  </p>
                </div>
              </Link>
              <span className="text-sm capitalize">{video.visibility}</span>
              <span className="bg-muted inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold">
                <Clock3 className="size-3" /> {statusLabel[video.status]}
              </span>
              <span className="text-muted-foreground text-sm">
                {formatDuration(video.durationSeconds)}
              </span>
              <div className="flex gap-2">
                <Link params={{ id: video.id }} to="/u/studio/videos/$id">
                  <Button className="rounded-lg" size="sm" variant="outline">
                    Edit
                  </Button>
                </Link>
                {video.status === "ready" && video.visibility === "public" ? (
                  <Link params={{ id: getVideoSlug(video) }} to="/videos/$id">
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
        <div className="bg-card rounded-2xl border p-8">
          <EmptyState
            message={
              section === "clips"
                ? "Open a video workspace and use the clipper to cut short highlights."
                : "Upload your first video and we’ll take you straight into the editor while Mux processes it."
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
            {section === "clips" ? (
              <Link
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "rounded-lg"
                )}
                to="/u/studio"
              >
                Back to videos
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
