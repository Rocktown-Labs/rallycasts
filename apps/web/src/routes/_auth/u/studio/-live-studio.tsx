import MuxPlayer from "@mux/mux-player-react/lazy";
import { Button } from "@rallycaststv/ui/components/button";
import { Input } from "@rallycaststv/ui/components/input";
import { Link } from "@tanstack/react-router";
import {
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Radio,
  RefreshCw,
  RotateCcw,
  Square,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/rally/cards";
import {
  useCompleteLiveStream,
  useCreateLiveStream,
  useDeleteLiveStream,
  useMyLiveStreams,
  useResetLiveStreamKey,
  useSyncLiveStream,
} from "@/lib/hooks/use-live-streams";
import type { LiveStreamRecord } from "@/lib/hooks/use-live-streams";

const statusStyles: Record<LiveStreamRecord["status"], string> = {
  active: "bg-red-500/15 text-red-500 border-red-500/30",
  completed: "bg-muted text-muted-foreground border-border",
  connected: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  disconnected: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
  idle: "bg-muted text-muted-foreground border-border",
  recording: "bg-red-500/15 text-red-500 border-red-500/30",
};

const statusLabel: Record<LiveStreamRecord["status"], string> = {
  active: "Live",
  completed: "Ended",
  connected: "Encoder connected",
  disconnected: "Reconnecting",
  failed: "Failed",
  idle: "Ready for encoder",
  recording: "Recording",
};

const copyText = async (label: string, value: string) => {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  } catch {
    toast.error(`Could not copy ${label.toLowerCase()}`);
  }
};

function StreamCard({ stream }: { stream: LiveStreamRecord }) {
  const resetKey = useResetLiveStreamKey(stream.id);
  const completeStream = useCompleteLiveStream(stream.id);
  const syncStream = useSyncLiveStream(stream.id);
  const deleteStream = useDeleteLiveStream();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const { isLive } = stream;

  return (
    <article className="border-border bg-card/50 space-y-4 rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-bold">{stream.title}</h3>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${statusStyles[stream.status]}`}
            >
              {statusLabel[stream.status]}
            </span>
            <span className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
              {stream.visibility}
            </span>
          </div>
          {stream.description ? (
            <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
              {stream.description}
            </p>
          ) : null}
          {stream.event ? (
            <p className="text-muted-foreground mt-1 text-xs">
              Attached to {stream.event.name}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {isLive ? (
            <Link params={{ id: stream.id }} to="/live/$id">
              <Button size="sm" variant="outline">
                <ExternalLink className="size-3.5" /> Watch page
              </Button>
            </Link>
          ) : null}
          <Button
            disabled={syncStream.isPending}
            onClick={() => syncStream.mutate()}
            size="sm"
            variant="outline"
          >
            <RefreshCw className="size-3.5" /> Sync
          </Button>
          {isLive ? (
            <Button
              disabled={completeStream.isPending}
              onClick={() =>
                completeStream.mutate(undefined, {
                  onError: () => toast.error("Could not end the live stream."),
                  onSuccess: () => toast.success("Live stream ended."),
                })
              }
              size="sm"
              variant="outline"
            >
              <Square className="size-3.5" /> End
            </Button>
          ) : null}
          {confirmingDelete ? (
            <>
              <Button
                disabled={deleteStream.isPending}
                onClick={() =>
                  deleteStream.mutate(stream.id, {
                    onError: () =>
                      toast.error("Could not delete the live stream."),
                    onSuccess: () => toast.success("Live stream deleted."),
                  })
                }
                size="sm"
                variant="destructive"
              >
                <Trash2 className="size-3.5" /> Confirm delete
              </Button>
              <Button
                onClick={() => setConfirmingDelete(false)}
                size="sm"
                variant="ghost"
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setConfirmingDelete(true)}
              size="sm"
              variant="ghost"
            >
              <Trash2 className="size-3.5" /> Delete
            </Button>
          )}
        </div>
      </div>

      {isLive && stream.visibility === "public" && stream.muxPlaybackId ? (
        <div className="border-border overflow-hidden rounded-lg border bg-black">
          <MuxPlayer
            accentColor="hsl(var(--primary))"
            metadata={{
              player_name: "rallycasts-live-preview",
              video_title: stream.title,
            }}
            muted
            playbackId={stream.muxPlaybackId}
            streamType="live"
            style={{ aspectRatio: "16 / 9", width: "100%" }}
          />
        </div>
      ) : null}
      {isLive && stream.visibility === "private" ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-xs">
          Private stream: playback is signed, so the public watch page stays
          hidden. Your encoder still receives the stream normally.
        </p>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="space-y-1.5">
          <span className="text-muted-foreground text-xs font-semibold">
            RTMP server URL
          </span>
          <div className="flex gap-2">
            <Input
              className="font-mono text-xs"
              readOnly
              value={stream.ingestUrl ?? ""}
            />
            <Button
              aria-label="Copy RTMP server URL"
              onClick={() =>
                copyText("RTMP server URL", stream.ingestUrl ?? "")
              }
              size="icon"
              type="button"
              variant="outline"
            >
              <Copy className="size-4" />
            </Button>
          </div>
        </div>
        <div className="space-y-1.5">
          <span className="text-muted-foreground text-xs font-semibold">
            Stream key
          </span>
          <div className="flex gap-2">
            <Input
              className="font-mono text-xs"
              readOnly
              type={showKey ? "text" : "password"}
              value={stream.streamKey ?? ""}
            />
            <Button
              aria-label={showKey ? "Hide stream key" : "Show stream key"}
              onClick={() => setShowKey((visible) => !visible)}
              size="icon"
              type="button"
              variant="outline"
            >
              {showKey ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </Button>
            <Button
              aria-label="Copy stream key"
              onClick={() => copyText("Stream key", stream.streamKey ?? "")}
              size="icon"
              type="button"
              variant="outline"
            >
              <Copy className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          disabled={resetKey.isPending}
          onClick={() =>
            resetKey.mutate(undefined, {
              onError: () => toast.error("Could not reset the stream key."),
              onSuccess: () => toast.success("Stream key reset."),
            })
          }
          size="sm"
          variant="outline"
        >
          <RotateCcw className="size-3.5" /> Reset stream key
        </Button>
        <p className="text-muted-foreground text-xs">
          Use OBS, Streamlabs, or any RTMPS encoder. The key is private.
        </p>
      </div>
    </article>
  );
}

export function LiveStudio() {
  const { data: streams = [], isLoading } = useMyLiveStreams();
  const createStream = useCreateLiveStream();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");

  return (
    <section className="space-y-5">
      <div className="border-border bg-card/40 rounded-xl border p-4">
        <div className="flex items-center gap-2">
          <Radio className="text-primary size-4" />
          <h2 className="font-bold">Go live from courtside</h2>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          Create a Mux live stream, copy the RTMPS ingest details into your
          encoder, and your public watch page is ready before you go on air.
        </p>
        <form
          className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_auto_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            if (!title.trim()) {
              toast.error("Add a title for your live stream.");
              return;
            }
            createStream.mutate(
              {
                description: description.trim() || undefined,
                title: title.trim(),
                visibility,
              },
              {
                onError: (error) =>
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : "Could not create the live stream."
                  ),
                onSuccess: () => {
                  setTitle("");
                  setDescription("");
                  toast.success("Live stream created.");
                },
              }
            );
          }}
        >
          <label className="space-y-1.5" htmlFor="live-title">
            <span className="text-muted-foreground text-xs font-semibold">
              Title
            </span>
            <Input
              id="live-title"
              maxLength={160}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Championship court 1"
              value={title}
            />
          </label>
          <label className="space-y-1.5" htmlFor="live-description">
            <span className="text-muted-foreground text-xs font-semibold">
              Description (optional)
            </span>
            <Input
              id="live-description"
              maxLength={2000}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Semifinal coverage"
              value={description}
            />
          </label>
          <label className="space-y-1.5" htmlFor="live-visibility">
            <span className="text-muted-foreground text-xs font-semibold">
              Visibility
            </span>
            <select
              className="border-input bg-background focus-visible:border-ring h-9 rounded-lg border px-2 text-sm outline-none"
              id="live-visibility"
              onChange={(event) =>
                setVisibility(event.target.value as "public" | "private")
              }
              value={visibility}
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </label>
          <div className="flex items-end">
            <Button
              className="w-full rounded-lg"
              disabled={createStream.isPending}
              type="submit"
            >
              <Radio className="size-4" />
              {createStream.isPending ? "Creating…" : "Create stream"}
            </Button>
          </div>
        </form>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading live streams…</p>
      ) : null}

      {!isLoading && streams.length === 0 ? (
        <EmptyState
          message="Create a stream above, then paste the RTMPS details into OBS or your courtside encoder."
          title="No live streams yet"
        />
      ) : null}

      <div className="space-y-4">
        {streams.map((stream) => (
          <StreamCard key={stream.id} stream={stream} />
        ))}
      </div>
    </section>
  );
}
