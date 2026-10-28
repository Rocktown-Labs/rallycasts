import MuxPlayer from "@mux/mux-player-react/lazy";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Calendar, ChevronLeft, Radio, Video } from "lucide-react";

import { EmptyState } from "@/components/rally/cards";
import { useLiveStream } from "@/lib/hooks/use-live-streams";

export const Route = createFileRoute("/live/$id")({
  component: LiveStreamPage,
});

function LivePlayerArea({
  stream,
}: {
  stream: NonNullable<ReturnType<typeof useLiveStream>["data"]>;
}) {
  if (stream.visibility === "private" && stream.isLive) {
    return (
      <div className="border-border bg-card/50 flex aspect-video flex-col items-center justify-center gap-3 rounded-xl border p-8 text-center">
        <Radio className="text-muted-foreground size-8" />
        <p className="text-foreground text-sm font-semibold">
          This live stream is private
        </p>
        <p className="text-muted-foreground max-w-md text-sm">
          Playback is signed and the public watch page is hidden. Switch the
          stream to public in Studio when you are ready for an audience.
        </p>
      </div>
    );
  }

  if (stream.isLive && stream.muxPlaybackId) {
    return (
      <div className="border-border overflow-hidden rounded-xl border bg-black">
        <MuxPlayer
          accentColor="hsl(var(--primary))"
          metadata={{
            player_name: "rallycasts-live",
            video_title: stream.title,
          }}
          playbackId={stream.muxPlaybackId}
          streamType="live"
          style={{ aspectRatio: "16 / 9", width: "100%" }}
        />
      </div>
    );
  }

  if (stream.recordingVideoId) {
    return (
      <div className="border-border bg-card/50 flex flex-col items-center gap-3 rounded-xl border p-10 text-center">
        <Video className="text-primary size-10" />
        <h2 className="text-xl font-bold">This stream has ended</h2>
        <p className="text-muted-foreground max-w-md text-sm">
          The replay is published as a regular video, so it keeps its own view
          count and analytics.
        </p>
        <Link
          className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold"
          params={{ id: stream.recordingVideoId }}
          to="/videos/$id"
        >
          Watch the replay
        </Link>
      </div>
    );
  }

  return (
    <div className="border-border bg-card/50 flex aspect-video flex-col items-center justify-center gap-3 rounded-xl border p-8 text-center">
      <Radio className="text-muted-foreground size-8" />
      <p className="text-muted-foreground text-sm">
        {stream.status === "idle"
          ? "The encoder has not connected yet."
          : "Playback is not available for this stream."}
      </p>
    </div>
  );
}

function LiveStreamPage() {
  const { id } = Route.useParams();
  const { data: stream, error, isLoading } = useLiveStream(id);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-muted-foreground text-sm">Loading live stream…</p>
      </div>
    );
  }

  if (error || !stream) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <EmptyState
          message="This stream is private, deleted, or no longer available."
          title="Live stream not found"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-6">
      <Link
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs"
        to="/live"
      >
        <ChevronLeft className="size-3.5" /> All live streams
      </Link>

      <LivePlayerArea stream={stream} />

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-black tracking-wider uppercase ${
              stream.isLive
                ? "bg-red-500 text-white"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {stream.isLive ? "Live" : "Ended"}
          </span>
          {stream.visibility === "private" ? (
            <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase">
              Private
            </span>
          ) : null}
        </div>
        <h1 className="text-3xl font-black tracking-tight">{stream.title}</h1>
        <p className="text-muted-foreground text-sm">
          {stream.owner?.name ?? "RallyCasts creator"}
        </p>
        {stream.description ? (
          <p className="text-foreground/90 max-w-3xl text-sm leading-relaxed">
            {stream.description}
          </p>
        ) : null}
        {stream.event ? (
          <Link
            className="text-primary inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
            params={{ id: stream.event.id }}
            to="/events/$id"
          >
            <Calendar className="size-4" /> {stream.event.name}
          </Link>
        ) : null}
      </header>
    </div>
  );
}
