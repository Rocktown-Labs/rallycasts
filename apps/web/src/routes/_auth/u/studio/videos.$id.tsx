import MuxPlayer from "@mux/mux-player-react/lazy";
import { Button, buttonVariants } from "@rallycaststv/ui/components/button";
import { cn } from "@rallycaststv/ui/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Check,
  CircleAlert,
  Clock3,
  Film,
  LoaderCircle,
  Lock,
  MapPin,
  Save,
  Scissors,
  Search,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
import { readApiJson } from "@/lib/hooks/api";
import { useVideoUploadState } from "@/lib/video-upload-manager";

export const Route = createFileRoute("/_auth/u/studio/videos/$id")({
  component: VideoStudioPage,
});

type Visibility = "friends" | "private" | "public";

interface StudioPlayer {
  id: string;
  image?: string | null;
  name: string;
  username?: string | null;
}

interface StudioVenue {
  id?: string;
  name: string;
  placeId?: string;
}

const statusCopy = {
  deleted: "Deleted",
  draft: "Draft",
  failed: "Needs attention",
  processing: "Mux is processing",
  ready: "Ready to publish",
  uploading: "Uploading original",
} as const;

const getEffectiveStatus = (
  uploadPhase: string,
  videoStatus: keyof typeof statusCopy
) => {
  if (uploadPhase === "uploading") {
    return "uploading" as const;
  }
  if (uploadPhase === "failed") {
    return "failed" as const;
  }
  return videoStatus;
};

const isPublishableVideo = (video: {
  muxPlaybackId?: string | null;
  status: string;
}): boolean => video.status === "ready" && Boolean(video.muxPlaybackId);

function StatusIcon({ status }: { status: keyof typeof statusCopy }) {
  if (status === "failed") {
    return <CircleAlert className="size-5 text-destructive" />;
  }
  if (status === "ready") {
    return <Check className="size-5 text-primary" />;
  }
  return <Clock3 className="size-5 text-primary" />;
}

function VideoStudioPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const upload = useVideoUploadState(id);
  const videoQuery = useQuery({
    queryFn: () =>
      readApiJson(
        apiClient.api.v1.videos[":id"].studio.$get({ param: { id } })
      ),
    queryKey: ["video-studio", id],
    refetchInterval: 2500,
  });
  const video = videoQuery.data?.video;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("private");
  const [initializedVideoId, setInitializedVideoId] = useState<string | null>(
    null
  );
  const [playerQuery, setPlayerQuery] = useState("");
  const [taggedPlayers, setTaggedPlayers] = useState<StudioPlayer[]>([]);
  const [placeQuery, setPlaceQuery] = useState("");
  const [selectedVenue, setSelectedVenue] = useState<StudioVenue | null>(null);
  const playersQuery = useQuery({
    enabled: playerQuery.trim().length > 1,
    queryFn: () =>
      readApiJson(
        apiClient.api.v1.players.$get({ query: { q: playerQuery.trim() } })
      ),
    queryKey: ["studio-player-search", playerQuery],
  });
  const placesQuery = useQuery({
    enabled: placeQuery.trim().length > 1,
    queryFn: () =>
      readApiJson(
        apiClient.api.v1.places.search.$get({
          query: { q: placeQuery.trim() },
        })
      ),
    queryKey: ["studio-place-search", placeQuery],
  });

  useEffect(() => {
    if (!video || initializedVideoId === video.id) {
      return;
    }
    setTitle(video.title);
    setDescription(video.description ?? "");
    setVisibility(video.visibility);
    setTaggedPlayers(video.taggedUsers ?? []);
    setSelectedVenue(video.venue ?? null);
    setInitializedVideoId(video.id);
  }, [initializedVideoId, video]);

  const saveVideo = useMutation({
    mutationFn: (nextVisibility: Visibility) =>
      readApiJson(
        apiClient.api.v1.videos[":id"].$patch({
          json: {
            description: description.trim() || undefined,
            taggedUserIds: taggedPlayers.map((player) => player.id),
            title: title.trim(),
            venueId: selectedVenue?.id ?? null,
            visibility: nextVisibility,
          },
          param: { id },
        })
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["video-studio", id] });
      toast.success("Video details saved");
    },
  });

  if (videoQuery.isLoading || !video) {
    return (
      <div className="grid min-h-96 place-items-center">
        <LoaderCircle className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  const effectiveStatus = getEffectiveStatus(upload.phase, video.status);
  const isReady = isPublishableVideo(video);
  const playerResults = (playersQuery.data?.players ?? []).filter(
    (player) => !taggedPlayers.some((tagged) => tagged.id === player.id)
  );
  const placeResults = placesQuery.data?.places ?? [];

  const selectGoogleVenue = async (place: {
    name: string;
    placeId: string;
  }) => {
    const response = await apiClient.api.v1.places.venues.$post({
      json: { placeId: place.placeId },
    });
    const result = (await response.json()) as {
      venue?: { id: string; name: string };
    };
    if (!response.ok && response.status !== 409) {
      toast.error("Could not attach that park.");
      return;
    }
    if (result.venue) {
      setSelectedVenue(result.venue);
      setPlaceQuery("");
    }
  };

  const save = async () => {
    if (!title.trim()) {
      toast.error("A title is required.");
      return;
    }
    await saveVideo.mutateAsync(visibility);
  };

  const publish = async () => {
    if (!isReady) {
      toast.info("Publishing unlocks as soon as Mux finishes processing.");
      return;
    }
    setVisibility("public");
    await saveVideo.mutateAsync("public");
  };

  return (
    <main className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            RallyCasts Studio
          </p>
          <h1 className="mt-1 text-3xl font-bold">Video details</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="rounded-lg"
            disabled={saveVideo.isPending}
            onClick={save}
            variant="outline"
          >
            <Save className="size-4" /> Save
          </Button>
          <Button
            className="rounded-lg"
            disabled={!isReady || saveVideo.isPending}
            onClick={publish}
          >
            {visibility === "public" ? (
              <Check className="size-4" />
            ) : (
              <Lock className="size-4" />
            )}
            {visibility === "public" ? "Published" : "Publish"}
          </Button>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="space-y-6">
          <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold" htmlFor="video-title">
                Title
              </label>
              <input
                aria-label="Video title"
                className="h-12 w-full rounded-lg border bg-background px-3 text-base outline-none focus:ring-2 focus:ring-primary"
                id="video-title"
                maxLength={160}
                onChange={(event) => setTitle(event.target.value)}
                value={title}
              />
              <p className="text-right text-xs text-muted-foreground">
                {title.length}/160
              </p>
            </div>

            <div className="mt-5 space-y-2">
              <label
                className="text-sm font-semibold"
                htmlFor="video-description"
              >
                Description
              </label>
              <textarea
                aria-label="Video description"
                className="min-h-56 w-full resize-y rounded-lg border bg-background p-3 outline-none focus:ring-2 focus:ring-primary"
                id="video-description"
                maxLength={2000}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Tell viewers what this RallyCast is about…"
                value={description}
              />
              <p className="text-right text-xs text-muted-foreground">
                {description.length}/2000
              </p>
            </div>

            <div className="mt-6 grid gap-5 border-t pt-6 md:grid-cols-2">
              <div className="space-y-3">
                <label className="text-sm font-semibold" htmlFor="player-tags">
                  Players in this video
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <input
                    aria-label="Search players to tag"
                    className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm"
                    id="player-tags"
                    onChange={(event) => setPlayerQuery(event.target.value)}
                    placeholder="Search players"
                    value={playerQuery}
                  />
                </div>
                {playerResults.length > 0 ? (
                  <div className="max-h-40 overflow-y-auto rounded-lg border bg-background p-1">
                    {playerResults.slice(0, 6).map((player) => (
                      <button
                        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                        key={player.id}
                        onClick={() => {
                          setTaggedPlayers((current) => [...current, player]);
                          setPlayerQuery("");
                        }}
                        type="button"
                      >
                        <Users className="size-4 text-primary" />
                        <span>{player.name}</span>
                        <span className="text-xs text-muted-foreground">
                          @{player.username}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {taggedPlayers.map((player) => (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs"
                      key={player.id}
                    >
                      {player.name}
                      <button
                        aria-label={`Remove ${player.name}`}
                        onClick={() =>
                          setTaggedPlayers((current) =>
                            current.filter((item) => item.id !== player.id)
                          )
                        }
                        type="button"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold" htmlFor="video-park">
                  Park or venue
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <input
                    aria-label="Search parks and venues"
                    className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm"
                    id="video-park"
                    onChange={(event) => setPlaceQuery(event.target.value)}
                    placeholder="Search Google Places"
                    value={placeQuery}
                  />
                </div>
                {placeResults.length > 0 ? (
                  <div className="max-h-40 overflow-y-auto rounded-lg border bg-background p-1">
                    {placeResults.slice(0, 6).map((place) => (
                      <button
                        className="block w-full rounded-md px-2 py-2 text-left hover:bg-muted"
                        key={place.placeId}
                        onClick={() => void selectGoogleVenue(place)}
                        type="button"
                      >
                        <span className="block text-sm font-semibold">
                          {place.name}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {place.address}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
                {selectedVenue ? (
                  <div className="flex items-center justify-between rounded-lg bg-muted p-3 text-sm">
                    <span className="flex items-center gap-2 font-semibold">
                      <MapPin className="size-4 text-primary" />
                      {selectedVenue.name}
                    </span>
                    <button
                      aria-label="Remove venue"
                      onClick={() => setSelectedVenue(null)}
                      type="button"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-bold">Create clips</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Turn the full video into focused 1–2 minute RallyClips.
                </p>
              </div>
              {isReady ? (
                <Link
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "rounded-lg"
                  )}
                  params={{ id }}
                  to="/u/studio/videos/$id/clips"
                >
                  <Scissors className="size-4" /> Open clipper
                </Link>
              ) : (
                <Button disabled variant="outline">
                  <Scissors className="size-4" /> Processing
                </Button>
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="overflow-hidden rounded-2xl border bg-card">
            <div className="aspect-video bg-black">
              {isReady ? (
                <MuxPlayer
                  accentColor="hsl(var(--primary))"
                  metadata={{ video_id: id, video_title: video.title }}
                  playbackId={video.muxPlaybackId ?? undefined}
                  style={{ aspectRatio: "16 / 9", width: "100%" }}
                />
              ) : (
                <div className="grid size-full place-items-center bg-[radial-gradient(circle_at_center,hsl(var(--primary)/.14),transparent_65%)]">
                  <Film className="size-12 text-primary/70" />
                </div>
              )}
            </div>
            <div className="space-y-4 p-4">
              <div className="flex items-center gap-3">
                <StatusIcon status={effectiveStatus} />
                <div>
                  <p className="text-sm font-bold">
                    {statusCopy[effectiveStatus]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {effectiveStatus === "uploading"
                      ? `${upload.progress}% uploaded`
                      : "This page updates automatically."}
                  </p>
                </div>
              </div>
              {effectiveStatus === "uploading" ? (
                <progress
                  aria-label={`${upload.progress}% uploaded`}
                  className="h-2 w-full overflow-hidden rounded-full accent-primary"
                  max={100}
                  value={upload.progress}
                />
              ) : null}
              {upload.error ? (
                <p className="text-xs text-destructive">{upload.error}</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-4">
            <label className="text-sm font-bold" htmlFor="video-visibility">
              Visibility
            </label>
            <select
              className="mt-3 h-11 w-full rounded-lg border bg-background px-3"
              id="video-visibility"
              onChange={(event) =>
                setVisibility(event.target.value as Visibility)
              }
              value={visibility}
            >
              <option value="private">Private</option>
              <option value="friends">Friends</option>
              <option value="public">Public</option>
            </select>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              New uploads start private so processing never publishes an
              unfinished video.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
