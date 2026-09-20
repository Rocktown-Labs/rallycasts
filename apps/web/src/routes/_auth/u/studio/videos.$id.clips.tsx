import MuxPlayer from "@mux/mux-player-react/lazy";
import { Button } from "@rallycaststv/ui/components/button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, LoaderCircle, Scissors } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
import { readApiJson } from "@/lib/hooks/api";

export const Route = createFileRoute("/_auth/u/studio/videos/$id/clips")({
  component: () => <VideoClipperPage />,
});

const VideoClipperPage = () => {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(60);
  const [title, setTitle] = useState("Highlight clip");
  const videoQuery = useQuery({
    queryFn: () =>
      readApiJson(
        apiClient.api.v1.videos[":id"].studio.$get({ param: { id } })
      ),
    queryKey: ["video-studio", id],
  });
  const source = videoQuery.data?.video;
  const playbackQuery = useQuery({
    enabled: Boolean(
      source && source.status === "ready" && source.muxPlaybackId
    ),
    queryFn: () =>
      readApiJson(
        apiClient.api.v1.videos[":id"].playback.$get({ param: { id } })
      ),
    queryKey: ["video-playback", id],
  });

  useEffect(() => {
    if (source?.durationSeconds && source.durationSeconds > 0) {
      setEndTime(Math.min(60, Math.floor(source.durationSeconds)));
    }
  }, [source?.durationSeconds]);

  const createClip = useMutation({
    mutationFn: () =>
      readApiJson(
        apiClient.api.v1.videos[":id"].clips.$post({
          json: { endTime, startTime, title: title.trim() },
          param: { id },
        })
      ),
    onSuccess: async (result) => {
      toast.success("Clip created. Mux is processing it now.");
      await navigate({
        params: { id: result.video.id },
        to: "/u/studio/videos/$id",
      });
    },
  });

  if (!source) {
    return <div className="h-96 animate-pulse rounded-2xl bg-muted" />;
  }

  const duration = source.durationSeconds ?? 0;
  const clipLength = Math.max(0, endTime - startTime);
  const isValid =
    title.trim().length > 0 &&
    endTime > startTime &&
    clipLength <= 120 &&
    (duration === 0 || endTime <= duration);

  return (
    <main className="mx-auto max-w-6xl space-y-6">
      <header className="flex items-center gap-4">
        <Button
          aria-label="Back to video details"
          onClick={() => window.history.back()}
          size="icon"
          type="button"
          variant="outline"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            RallyCasts Studio
          </p>
          <h1 className="text-3xl font-bold">Create a RallyClip</h1>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="overflow-hidden rounded-2xl border bg-black">
          <ClipperPreview
            id={id}
            isLoading={playbackQuery.isLoading}
            playbackUrl={playbackQuery.data?.playbackUrl}
            status={source.status}
            title={source.title}
          />
        </div>

        <aside className="rounded-2xl border bg-card p-5">
          <div className="flex items-center gap-2">
            <Scissors className="size-5 text-primary" />
            <h2 className="font-bold">Clip range</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose a moment up to two minutes. Mux creates a standalone,
            shareable video asset.
          </p>

          <div className="mt-6 space-y-4">
            <label className="block text-sm font-semibold">
              Clip title
              <input
                aria-label="Clip title"
                className="mt-2 h-11 w-full rounded-lg border bg-background px-3 font-normal"
                maxLength={160}
                onChange={(event) => setTitle(event.target.value)}
                value={title}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-semibold">
                Start (seconds)
                <input
                  aria-label="Clip start time in seconds"
                  className="mt-2 h-11 w-full rounded-lg border bg-background px-3 font-normal"
                  max={Math.max(0, duration - 1)}
                  min={0}
                  onChange={(event) => setStartTime(event.target.valueAsNumber)}
                  type="number"
                  value={startTime}
                />
              </label>
              <label className="text-sm font-semibold">
                End (seconds)
                <input
                  aria-label="Clip end time in seconds"
                  className="mt-2 h-11 w-full rounded-lg border bg-background px-3 font-normal"
                  max={duration > 0 ? duration : undefined}
                  min={1}
                  onChange={(event) => setEndTime(event.target.valueAsNumber)}
                  type="number"
                  value={endTime}
                />
              </label>
            </div>
            <div className="rounded-lg bg-muted p-3 text-sm">
              <span className="font-bold">{clipLength} seconds</span>
              <span className="text-muted-foreground"> selected</span>
            </div>
            <Button
              className="w-full rounded-lg"
              disabled={!isValid || createClip.isPending}
              onClick={() => createClip.mutate()}
              type="button"
            >
              <Scissors className="size-4" />
              {createClip.isPending ? "Creating clip…" : "Create clip"}
            </Button>
            {createClip.isError ? (
              <p className="text-xs text-destructive">
                {createClip.error instanceof Error
                  ? createClip.error.message
                  : "Could not create the clip."}
              </p>
            ) : null}
          </div>
        </aside>
      </div>
    </main>
  );
};

function ClipperPreview({
  id,
  isLoading,
  playbackUrl,
  status,
  title,
}: {
  id: string;
  isLoading: boolean;
  playbackUrl?: string | null;
  status: string;
  title: string;
}) {
  if (playbackUrl) {
    return (
      <MuxPlayer
        metadata={{ video_id: id, video_title: title }}
        src={playbackUrl}
        style={{ aspectRatio: "16 / 9", width: "100%" }}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="grid aspect-video place-items-center text-sm text-white/70">
        <span className="flex items-center gap-2">
          <LoaderCircle className="size-5 animate-spin text-primary" />
          Preparing secure playback…
        </span>
      </div>
    );
  }

  const message =
    status === "ready"
      ? "Playback is unavailable. Please check back shortly."
      : "Video is still processing on Mux. Clipping will be available once ready.";

  return (
    <div className="grid aspect-video place-items-center p-6 text-center text-sm text-white/70">
      {message}
    </div>
  );
}
