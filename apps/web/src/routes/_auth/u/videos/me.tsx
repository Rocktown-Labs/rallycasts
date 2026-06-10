import { Button } from "@rallycaststv/ui/components/button";
import { createFileRoute } from "@tanstack/react-router";
import { PlusCircle } from "lucide-react";

import { EmptyState, VideoCard } from "@/components/rally/cards";
import { useMyVideos } from "@/lib/hooks";

export const Route = createFileRoute("/_auth/u/videos/me")({
  component: VideosPage,
});

function VideosPage() {
  const { data, isLoading } = useMyVideos();
  const videos = data?.videos ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Your Videos</h1>
          <div className="mt-6 flex rounded-md bg-muted p-1">
            <Button className="rounded-md" size="sm">
              All Videos
            </Button>
            <Button size="sm" variant="ghost">
              Public
            </Button>
            <Button size="sm" variant="ghost">
              Private
            </Button>
          </div>
        </div>
        <Button className="rounded-md text-xs">
          <PlusCircle className="size-4" />
          Upload New Video
        </Button>
      </div>
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-64 animate-pulse rounded-lg bg-muted"
            />
          ))}
        </div>
      ) : null}
      {videos.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      ) : (
        <EmptyState
          message="Upload or process a Mux video and it will appear in your studio library."
          title="No videos yet"
        />
      )}
    </div>
  );
}
