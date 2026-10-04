import type { MuxPlayerRefAttributes } from "@mux/mux-player-react";
import MuxPlayer from "@mux/mux-player-react/lazy";
import { Button } from "@rallycaststv/ui/components/button";
import { Input } from "@rallycaststv/ui/components/input";
import { cn } from "@rallycaststv/ui/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, LoaderCircle, Play, Scissors } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, RefObject } from "react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
import { readApiJson } from "@/lib/hooks/api";

import {
  CLIP_MAX_SECONDS,
  ClipTrimTimeline,
  getEffectiveMinSeconds,
  initialClipSelection,
} from "./-clip-timeline";
import type { ClipSelection } from "./-clip-timeline";

export const Route = createFileRoute("/_auth/u/studio/videos/$id_/clips")({
  component: () => <VideoClipperPage />,
});

const FILMSTRIP_FRAMES = 12;

const VideoClipperPage = () => {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const playerRef = useRef<MuxPlayerRefAttributes | null>(null);
  const [selection, setSelection] = useState<ClipSelection>({
    end: 0,
    start: 0,
  });
  const selectionRef = useRef(selection);
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

  const duration = source?.durationSeconds ?? 0;

  useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);

  // When the duration arrives, start with the first 15 seconds (or the
  // whole video when it is shorter).
  useEffect(() => {
    if (
      duration > 0 &&
      selectionRef.current.start === 0 &&
      selectionRef.current.end === 0
    ) {
      setSelection(initialClipSelection(duration));
    }
  }, [duration]);

  const frameUrls = useMemo(() => {
    const playbackId = source?.muxPlaybackId;
    if (!playbackId || duration <= 0) {
      return [];
    }
    return Array.from({ length: FILMSTRIP_FRAMES }, (_, index) => {
      const time = ((index + 0.5) * duration) / FILMSTRIP_FRAMES;
      return `https://image.mux.com/${encodeURIComponent(
        playbackId
      )}/thumbnail.jpg?time=${time.toFixed(2)}&width=160`;
    });
  }, [duration, source?.muxPlaybackId]);

  const handleTimeUpdate = useCallback(() => {
    const player = playerRef.current;
    if (!player || player.paused) {
      return;
    }
    const { end, start } = selectionRef.current;
    if (player.currentTime > end - 0.05 || player.currentTime < start - 0.05) {
      // Playing outside the selection: loop back to its start.
      player.currentTime = start;
    }
  }, []);

  const handleScrub = useCallback((time: number) => {
    const player = playerRef.current;
    if (!player) {
      return;
    }
    player.currentTime = time;
  }, []);

  const handlePreview = () => {
    const player = playerRef.current;
    if (!player) {
      return;
    }
    player.currentTime = selection.start;
    void player.play();
  };

  const createClip = useMutation({
    mutationFn: () =>
      readApiJson(
        apiClient.api.v1.videos[":id"].clips.$post({
          json: {
            endTime: Math.round(selection.end),
            startTime: Math.round(selection.start),
            title: title.trim(),
          },
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
    return <div className="bg-muted h-96 animate-pulse rounded-2xl" />;
  }

  const effectiveMin = getEffectiveMinSeconds(duration);
  const clipSeconds = selection.end - selection.start;
  const lengthValid =
    duration > 0 &&
    clipSeconds >= effectiveMin - 0.01 &&
    clipSeconds <= CLIP_MAX_SECONDS + 0.01;
  const isValid = lengthValid && title.trim().length > 0;

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (!lengthValid) {
      toast.error(
        duration > effectiveMin
          ? `Select at least ${effectiveMin} seconds.`
          : "Select a range first."
      );
      return;
    }
    createClip.mutate();
  };

  return (
    <main className="mx-auto max-w-5xl space-y-5">
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
          <p className="text-primary text-xs font-semibold tracking-[0.22em] uppercase">
            RallyCasts Studio
          </p>
          <h1 className="text-3xl font-bold">Create a RallyClip</h1>
        </div>
      </header>

      <div className="overflow-hidden rounded-2xl border bg-black">
        <ClipperPreview
          id={id}
          isLoading={playbackQuery.isLoading}
          onTimeUpdate={handleTimeUpdate}
          playbackUrl={playbackQuery.data?.playbackUrl}
          playerRef={playerRef}
          status={source.status}
          title={source.title}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          className="rounded-lg"
          disabled={!playbackQuery.data?.playbackUrl}
          onClick={handlePreview}
          type="button"
        >
          <Play className="size-4" />
          Preview selection
        </Button>
        <p className="text-muted-foreground text-xs">
          The player loops your selection while you trim.
        </p>
      </div>

      <ClipTrimTimeline
        duration={duration}
        end={selection.end}
        frameUrls={frameUrls}
        onChange={setSelection}
        onScrub={handleScrub}
        start={selection.start}
      />

      <form
        className="bg-card rounded-2xl border p-5"
        onSubmit={(event) => submit(event)}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <label
            className="flex-1 text-sm font-semibold"
            htmlFor="clip-title-input"
          >
            Clip title
            <Input
              className="mt-2 h-11 w-full rounded-lg font-normal"
              id="clip-title-input"
              maxLength={160}
              onChange={(event) => setTitle(event.target.value)}
              value={title}
            />
          </label>
          <Button
            className={cn("gap-1.5 rounded-lg")}
            disabled={!isValid || createClip.isPending}
            onClick={submit}
            type="button"
          >
            {createClip.isPending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Scissors className="size-4" />
            )}
            {createClip.isPending ? "Creating clip…" : "Post clip"}
          </Button>
        </div>
        <p className="text-muted-foreground mt-3 text-xs">
          Clips run {effectiveMin} to {CLIP_MAX_SECONDS} seconds. Mux creates a
          standalone, shareable video asset.
          {duration > 0 && duration < effectiveMin
            ? " This video is shorter than the minimum, so the whole video is used."
            : ""}
        </p>
        {createClip.isError ? (
          <p className="text-destructive mt-2 text-xs">
            {createClip.error instanceof Error
              ? createClip.error.message
              : "Could not create the clip."}
          </p>
        ) : null}
      </form>
    </main>
  );
};

function ClipperPreview({
  id,
  isLoading,
  onTimeUpdate,
  playbackUrl,
  playerRef,
  status,
  title,
}: {
  id: string;
  isLoading: boolean;
  onTimeUpdate: () => void;
  playbackUrl?: string | null;
  playerRef: RefObject<MuxPlayerRefAttributes | null>;
  status: string;
  title: string;
}) {
  if (playbackUrl) {
    return (
      <MuxPlayer
        accentColor="hsl(var(--primary))"
        metadata={{ video_id: id, video_title: title }}
        onTimeUpdate={onTimeUpdate}
        ref={playerRef}
        src={playbackUrl}
        style={{ aspectRatio: "16 / 9", width: "100%" }}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="grid aspect-video place-items-center text-sm text-white/70">
        <span className="flex items-center gap-2">
          <LoaderCircle className="text-primary size-5 animate-spin" />
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
