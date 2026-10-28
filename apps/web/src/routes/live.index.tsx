import { Link, createFileRoute } from "@tanstack/react-router";
import { Calendar, Radio, Video } from "lucide-react";

import { EmptyState } from "@/components/rally/cards";
import { useLiveStreams } from "@/lib/hooks/use-live-streams";
import type { LiveStreamRecord } from "@/lib/hooks/use-live-streams";

export const Route = createFileRoute("/live/")({
  component: LiveDirectoryPage,
});

const streamThumbnail = (stream: LiveStreamRecord) =>
  stream.muxPlaybackId
    ? `https://image.mux.com/${encodeURIComponent(stream.muxPlaybackId)}/thumbnail.webp?time=1`
    : null;

function LiveCard({ stream }: { stream: LiveStreamRecord }) {
  const thumbnail = stream.isLive ? streamThumbnail(stream) : null;
  return (
    <Link
      className="group border-border bg-card hover:border-primary/40 overflow-hidden rounded-xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
      params={{ id: stream.id }}
      to="/live/$id"
    >
      <div className="relative aspect-video bg-black">
        {thumbnail ? (
          <img
            alt=""
            className="size-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
            src={thumbnail}
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-[radial-gradient(circle_at_top,hsl(142_100%_18%/.5),transparent_70%)]">
            <Video className="size-10 text-[#bcdf21]" />
          </div>
        )}
        <span
          className={`absolute top-3 left-3 rounded-full px-2 py-0.5 text-[10px] font-black tracking-wider uppercase ${
            stream.isLive
              ? "bg-red-500 text-white"
              : "bg-black/70 text-white/80"
          }`}
        >
          {stream.isLive ? "Live" : "Replay"}
        </span>
      </div>
      <div className="space-y-2 p-4">
        <h2 className="line-clamp-2 font-bold">{stream.title}</h2>
        <p className="text-muted-foreground text-xs">
          {stream.owner?.name ?? "RallyCasts creator"}
        </p>
        {stream.event ? (
          <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <Calendar className="size-3.5" /> {stream.event.name}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

function LiveDirectoryPage() {
  const { data: streams = [], isLoading } = useLiveStreams();
  const liveNow = streams.filter((stream) => stream.isLive);
  const recent = streams.filter((stream) => !stream.isLive);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6">
      <header className="space-y-2">
        <p className="text-primary flex items-center gap-2 text-xs font-semibold tracking-[0.22em] uppercase">
          <Radio className="size-4" /> RallyCasts Live
        </p>
        <h1 className="text-3xl font-black tracking-tight">
          Courtside, right now
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm">
          Live pickleball from organizers and creators. Watch a match as it
          happens, then catch the replay.
        </p>
      </header>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading live streams…</p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-xl font-bold">Live now</h2>
        {liveNow.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {liveNow.map((stream) => (
              <LiveCard key={stream.id} stream={stream} />
            ))}
          </div>
        ) : (
          <EmptyState
            message="No one is broadcasting this minute. Recent replays are below, or open Studio to start a stream."
            title="The courts are quiet"
          />
        )}
      </section>

      {recent.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xl font-bold">Recently ended</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recent.map((stream) => (
              <LiveCard key={stream.id} stream={stream} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="border-border bg-card/40 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
        <div>
          <h2 className="font-bold">Have a court and an encoder?</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Create an RTMPS live stream in Studio and share the watch page.
          </p>
        </div>
        <Link
          className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold"
          to="/u/studio/live"
        >
          Go live
        </Link>
      </section>
    </div>
  );
}
