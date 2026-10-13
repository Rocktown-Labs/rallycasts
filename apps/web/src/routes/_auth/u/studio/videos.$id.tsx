import MuxPlayer from "@mux/mux-player-react/lazy";
import { Button, buttonVariants } from "@rallycaststv/ui/components/button";
import { cn } from "@rallycaststv/ui/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Check,
  CircleAlert,
  Clock3,
  Copy,
  ExternalLink,
  Film,
  ImageUp,
  LoaderCircle,
  Lock,
  MapPin,
  Save,
  Scissors,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import { getVideoSlug, useImageUpload } from "@/lib/hooks";
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
    return <CircleAlert className="text-destructive size-5" />;
  }
  if (status === "ready") {
    return <Check className="text-primary size-5" />;
  }
  return <Clock3 className="text-primary size-5" />;
}

// oxlint-disable-next-line complexity -- Studio combines upload, metadata, and playback states.
function VideoStudioPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
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
  const videoSlug = getVideoSlug({ id, title: video?.title });
  const playbackQuery = useQuery({
    enabled: Boolean(video && isPublishableVideo(video)),
    queryFn: () =>
      readApiJson(
        apiClient.api.v1.videos[":id"].playback.$get({ param: { id } })
      ),
    queryKey: ["video-playback", id],
  });
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [initializedVideoId, setInitializedVideoId] = useState<string | null>(
    null
  );
  const [playerQuery, setPlayerQuery] = useState("");
  const [taggedPlayers, setTaggedPlayers] = useState<StudioPlayer[]>([]);
  const [placeQuery, setPlaceQuery] = useState("");
  const [selectedVenue, setSelectedVenue] = useState<StudioVenue | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [publishedVideoUrl, setPublishedVideoUrl] = useState("");

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
    const existingTagged = (video.taggedUsers ?? []).filter(
      (player): player is NonNullable<typeof player> => player !== null
    );
    if (existingTagged.length > 0) {
      setTaggedPlayers(existingTagged);
    } else if (session?.user) {
      setTaggedPlayers([
        {
          id: session.user.id,
          image: session.user.image,
          name: session.user.name || "Me",
          username:
            (session.user as { username?: string | null }).username ?? null,
        },
      ]);
    }
    setSelectedVenue(video.venue ?? null);
    setInitializedVideoId(video.id);
  }, [initializedVideoId, session?.user, video]);

  const saveVideo = useMutation({
    mutationFn: (options?: { publish?: boolean; visibility?: Visibility }) =>
      readApiJson(
        apiClient.api.v1.videos[":id"].$patch({
          json: {
            description: description.trim() || undefined,
            publish: options?.publish,
            taggedUserIds: taggedPlayers.map((player) => player.id),
            title: title.trim(),
            venueId: selectedVenue?.id ?? null,
            visibility: options?.visibility ?? visibility,
          },
          param: { id },
        })
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["video-studio", id] });
    },
  });

  const saveThumbnailTime = useMutation({
    mutationFn: (timeSeconds: number) =>
      readApiJson(
        apiClient.api.v1.videos[":id"].$patch({
          json: { thumbnailTimeSeconds: timeSeconds },
          param: { id },
        })
      ),
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update the thumbnail."
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["video-studio", id] });
      toast.success("Thumbnail updated");
    },
  });

  const uploadImage = useImageUpload();
  const saveCustomThumbnail = useMutation({
    mutationFn: (thumbnailUrl: string) =>
      readApiJson(
        apiClient.api.v1.videos[":id"].$patch({
          json: { thumbnailUrl },
          param: { id },
        })
      ),
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not set the custom thumbnail."
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["video-studio", id] });
      toast.success("Custom thumbnail updated");
    },
  });
  const thumbnailUploadPending =
    uploadImage.isPending || saveCustomThumbnail.isPending;

  const handleThumbnailUpload = (file: File | undefined) => {
    if (!file) {
      return;
    }
    if (!ALLOWED_THUMBNAIL_TYPES.has(file.type)) {
      toast.error("Only AVIF, JPEG, PNG, and WebP images are supported");
      return;
    }
    if (file.size > MAX_THUMBNAIL_BYTES) {
      toast.error("Image must be 5MB or smaller");
      return;
    }
    uploadImage.mutate(file, {
      onError: (error) =>
        toast.error(
          error instanceof Error ? error.message : "Could not upload the image"
        ),
      onSuccess: (result) => {
        if (result.url) {
          saveCustomThumbnail.mutate(result.url);
        }
      },
    });
  };

  const deleteVideo = useMutation({
    mutationFn: () =>
      readApiJson(
        apiClient.api.v1.videos[":id"].$delete({
          param: { id },
        })
      ),
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete video"
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["video-studio"] });
      toast.success("Video deleted");
      await navigate({ to: "/u/studio" });
    },
  });

  if (videoQuery.isLoading || !video) {
    return (
      <div className="grid min-h-96 place-items-center">
        <LoaderCircle className="text-primary size-8 animate-spin" />
      </div>
    );
  }

  const effectiveStatus = getEffectiveStatus(upload.phase, video.status);
  const isReady = isPublishableVideo(video);
  const isPublished = Boolean(video.publishedAt);
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
    if (!response.ok && (response.status as number) !== 409) {
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
    await saveVideo.mutateAsync({ visibility });
    toast.success("Video details saved");
    await navigate({ to: "/u/studio" });
  };

  const publish = async () => {
    if (!title.trim()) {
      toast.error("A title is required.");
      return;
    }
    if (!isReady) {
      toast.info("Publishing unlocks as soon as Mux finishes processing.");
      return;
    }
    const targetVisibility = visibility === "private" ? "public" : visibility;
    setVisibility(targetVisibility);
    await saveVideo.mutateAsync({
      publish: true,
      visibility: targetVisibility,
    });
    setPublishedVideoUrl(`${window.location.origin}/videos/${videoSlug}`);
    setShowSuccessModal(true);
    toast.success("Video published!");
  };

  return (
    <main className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-primary text-xs font-semibold tracking-[0.22em] uppercase">
            RallyCasts Studio
          </p>
          <h1 className="mt-1 text-3xl font-bold">Video details</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            className="text-destructive hover:bg-destructive/10 hover:text-destructive rounded-lg"
            disabled={deleteVideo.isPending}
            onClick={() => setShowDeleteModal(true)}
            type="button"
            variant="ghost"
          >
            <Trash2 className="size-4" /> Delete video
          </Button>
          <Button
            className="rounded-lg"
            disabled={saveVideo.isPending}
            onClick={save}
            type="button"
            variant="outline"
          >
            {saveVideo.isPending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Save
          </Button>
          {isPublished ? (
            <div className="flex items-center gap-2">
              <Button
                className="rounded-lg"
                onClick={() => {
                  setPublishedVideoUrl(
                    `${window.location.origin}/videos/${videoSlug}`
                  );
                  setShowSuccessModal(true);
                }}
                type="button"
                variant="secondary"
              >
                <Check className="text-primary size-4" /> Published
              </Button>
              <Link
                className={cn(
                  buttonVariants({ variant: "default" }),
                  "rounded-lg"
                )}
                params={{ id: videoSlug }}
                to="/videos/$id"
              >
                <ExternalLink className="size-4" /> View video
              </Link>
            </div>
          ) : (
            <Button
              className="rounded-lg"
              disabled={!isReady || saveVideo.isPending}
              onClick={publish}
              type="button"
            >
              {saveVideo.isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Lock className="size-4" />
              )}
              Publish
            </Button>
          )}
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="space-y-6">
          <div className="bg-card rounded-2xl border p-5 shadow-sm sm:p-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold" htmlFor="video-title">
                Title
              </label>
              <input
                aria-label="Video title"
                className="bg-background focus:ring-primary h-12 w-full rounded-lg border px-3 text-base outline-none focus:ring-2"
                id="video-title"
                maxLength={160}
                onChange={(event) => setTitle(event.target.value)}
                value={title}
              />
              <p className="text-muted-foreground text-right text-xs">
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
                className="bg-background focus:ring-primary min-h-56 w-full resize-y rounded-lg border p-3 outline-none focus:ring-2"
                id="video-description"
                maxLength={2000}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Tell viewers what this RallyCast is about…"
                value={description}
              />
              <p className="text-muted-foreground text-right text-xs">
                {description.length}/2000
              </p>
            </div>

            <div className="mt-6 grid gap-5 border-t pt-6 md:grid-cols-2">
              <div className="space-y-3">
                <label className="text-sm font-semibold" htmlFor="player-tags">
                  Players in this video
                </label>
                <div className="relative">
                  <Search className="text-muted-foreground absolute top-3 left-3 size-4" />
                  <input
                    aria-label="Search players to tag"
                    className="bg-background h-10 w-full rounded-lg border pr-3 pl-9 text-sm"
                    id="player-tags"
                    onChange={(event) => setPlayerQuery(event.target.value)}
                    placeholder="Search players"
                    value={playerQuery}
                  />
                </div>
                {playerResults.length > 0 ? (
                  <div className="bg-background max-h-40 overflow-y-auto rounded-lg border p-1">
                    {playerResults.slice(0, 6).map((player) => (
                      <button
                        className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm"
                        key={player.id}
                        onClick={() => {
                          setTaggedPlayers((current) => [...current, player]);
                          setPlayerQuery("");
                        }}
                        type="button"
                      >
                        <Users className="text-primary size-4" />
                        <span>{player.name}</span>
                        <span className="text-muted-foreground text-xs">
                          @{player.username}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {taggedPlayers.map((player) => (
                    <span
                      className="bg-muted inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs"
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
                  <MapPin className="text-muted-foreground absolute top-3 left-3 size-4" />
                  <input
                    aria-label="Search parks and venues"
                    className="bg-background h-10 w-full rounded-lg border pr-3 pl-9 text-sm"
                    id="video-park"
                    onChange={(event) => setPlaceQuery(event.target.value)}
                    placeholder="Search Google Places"
                    value={placeQuery}
                  />
                </div>
                {placeResults.length > 0 ? (
                  <div className="bg-background max-h-40 overflow-y-auto rounded-lg border p-1">
                    {placeResults.slice(0, 6).map((place) => (
                      <button
                        className="hover:bg-muted block w-full rounded-md px-2 py-2 text-left"
                        key={place.placeId}
                        onClick={() => void selectGoogleVenue(place)}
                        type="button"
                      >
                        <span className="block text-sm font-semibold">
                          {place.name}
                        </span>
                        <span className="text-muted-foreground block text-xs">
                          {place.address}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
                {selectedVenue ? (
                  <div className="bg-muted flex items-center justify-between rounded-lg p-3 text-sm">
                    <span className="flex items-center gap-2 font-semibold">
                      <MapPin className="text-primary size-4" />
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

          <div className="bg-card rounded-2xl border p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-bold">Create clips</h2>
                <p className="text-muted-foreground mt-1 text-sm">
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
                <Button disabled type="button" variant="outline">
                  <Scissors className="size-4" /> Processing
                </Button>
              )}
            </div>
          </div>

          <ThumbnailPickerCard
            canPick={
              Boolean(isReady && video.muxPlaybackId) &&
              video.visibility === "public" &&
              (video.durationSeconds ?? 0) > 0
            }
            customThumbnailUrl={video.thumbnailUrl}
            durationSeconds={video.durationSeconds ?? 0}
            isSaving={saveThumbnailTime.isPending}
            isUploading={thumbnailUploadPending}
            muxPlaybackId={video.muxPlaybackId ?? ""}
            onPick={(time) => saveThumbnailTime.mutate(time)}
            onUpload={handleThumbnailUpload}
            selectedTimeSeconds={
              video.thumbnailTimeSeconds ??
              DEFAULT_STUDIO_THUMBNAIL_TIME_SECONDS
            }
          />
        </section>

        <aside className="space-y-4">
          <div className="bg-card overflow-hidden rounded-2xl border">
            <div className="aspect-video bg-black">
              {isReady && playbackQuery.data?.playbackUrl ? (
                <MuxPlayer
                  accentColor="hsl(var(--primary))"
                  metadata={{ video_id: id, video_title: video.title }}
                  src={playbackQuery.data.playbackUrl}
                  style={{ aspectRatio: "16 / 9", width: "100%" }}
                />
              ) : (
                <div className="grid size-full place-items-center bg-[radial-gradient(circle_at_center,hsl(var(--primary)/.14),transparent_65%)]">
                  <Film className="text-primary/70 size-12" />
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
                  <p className="text-muted-foreground text-xs">
                    {effectiveStatus === "uploading"
                      ? `${upload.progress}% uploaded`
                      : "This page updates automatically."}
                  </p>
                </div>
              </div>
              {effectiveStatus === "uploading" ? (
                <progress
                  aria-label={`${upload.progress}% uploaded`}
                  className="accent-primary h-2 w-full overflow-hidden rounded-full"
                  max={100}
                  value={upload.progress}
                />
              ) : null}
              {upload.error ? (
                <p className="text-destructive text-xs">{upload.error}</p>
              ) : null}
            </div>
          </div>

          <div className="bg-card rounded-2xl border p-4">
            <label className="text-sm font-bold" htmlFor="video-visibility">
              Visibility
            </label>
            <select
              className="bg-background mt-3 h-11 w-full rounded-lg border px-3"
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
            <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
              Videos default to public so the community can watch your play. You
              can change this to friends only or private at any time.
            </p>
          </div>
        </aside>
      </div>

      {showSuccessModal ? (
        <div
          aria-labelledby="success-modal-title"
          aria-modal="true"
          className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm duration-200"
        >
          <div className="bg-card animate-in zoom-in-95 w-full max-w-lg rounded-2xl border p-6 shadow-2xl duration-200">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 text-primary grid size-10 place-items-center rounded-full">
                  <Check className="size-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold" id="success-modal-title">
                    Your RallyCast is Live!
                  </h2>
                  <p className="text-muted-foreground text-xs">
                    Video published successfully to RallyCasts
                  </p>
                </div>
              </div>
              <button
                aria-label="Close dialog"
                className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg p-1 transition-colors"
                onClick={() => setShowSuccessModal(false)}
                type="button"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="bg-muted/40 space-y-2 rounded-xl border p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="line-clamp-1 text-sm font-semibold">
                    {title || video.title}
                  </p>
                  <span className="bg-primary/15 text-primary rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize">
                    {visibility}
                  </span>
                </div>
                {selectedVenue ? (
                  <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <MapPin className="text-primary size-3.5 shrink-0" />
                    <span className="truncate">{selectedVenue.name}</span>
                  </p>
                ) : null}
                {taggedPlayers.length > 0 ? (
                  <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <Users className="text-primary size-3.5 shrink-0" />
                    <span className="truncate">
                      {taggedPlayers.map((p) => p.name).join(", ")}
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <label
                  className="text-muted-foreground text-xs font-semibold"
                  htmlFor="share-video-url"
                >
                  Share Link
                </label>
                <div className="flex items-center gap-2">
                  <input
                    aria-label="Share video link"
                    className="bg-background focus:ring-primary h-10 w-full rounded-lg border px-3 font-mono text-xs outline-none select-all focus:ring-2"
                    id="share-video-url"
                    readOnly
                    value={
                      publishedVideoUrl ||
                      `${window.location.origin}/videos/${videoSlug}`
                    }
                  />
                  <Button
                    className="shrink-0"
                    onClick={async () => {
                      const shareUrl =
                        publishedVideoUrl ||
                        `${window.location.origin}/videos/${videoSlug}`;
                      await navigator.clipboard.writeText(shareUrl);
                      setHasCopied(true);
                      toast.success("Link copied to clipboard!");
                      setTimeout(() => setHasCopied(false), 2500);
                    }}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {hasCopied ? (
                      <Check className="text-primary size-3.5" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                    {hasCopied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-2">
              <Button
                onClick={() => {
                  setShowSuccessModal(false);
                  void navigate({ to: "/u/studio" });
                }}
                type="button"
                variant="outline"
              >
                Back to Studio
              </Button>
              <Link
                className={cn(
                  buttonVariants({ variant: "default" }),
                  "rounded-lg"
                )}
                params={{ id: videoSlug }}
                to="/videos/$id"
              >
                <ExternalLink className="size-4" /> Watch Video
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {showDeleteModal ? (
        <div
          aria-labelledby="delete-modal-title"
          aria-modal="true"
          className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm duration-200"
        >
          <div className="bg-card animate-in zoom-in-95 w-full max-w-md rounded-2xl border p-6 shadow-2xl duration-200">
            <div className="flex items-start gap-4">
              <div className="bg-destructive/15 text-destructive grid size-10 shrink-0 place-items-center rounded-full">
                <Trash2 className="size-5" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold" id="delete-modal-title">
                  Delete this video?
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  This will permanently remove the video and all associated
                  media from RallyCasts and Mux. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                disabled={deleteVideo.isPending}
                onClick={() => setShowDeleteModal(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                disabled={deleteVideo.isPending}
                onClick={() => deleteVideo.mutate()}
                type="button"
                variant="destructive"
              >
                {deleteVideo.isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                {deleteVideo.isPending ? "Deleting…" : "Delete Video"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

const DEFAULT_STUDIO_THUMBNAIL_TIME_SECONDS = 1;
const MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024;
const ALLOWED_THUMBNAIL_TYPES = new Set([
  "image/avif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const THUMBNAIL_CANDIDATE_FRACTIONS = [
  0.04, 0.2, 0.35, 0.5, 0.65, 0.85,
] as const;

const formatStudioTime = (seconds: number) => {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
};

function ThumbnailPickerCard({
  canPick,
  customThumbnailUrl,
  durationSeconds,
  isSaving,
  isUploading,
  muxPlaybackId,
  onPick,
  onUpload,
  selectedTimeSeconds,
}: {
  canPick: boolean;
  customThumbnailUrl?: null | string;
  durationSeconds: number;
  isSaving: boolean;
  isUploading: boolean;
  muxPlaybackId: string;
  onPick: (timeSeconds: number) => void;
  onUpload: (file: File) => void;
  selectedTimeSeconds: number;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const candidateTimes = THUMBNAIL_CANDIDATE_FRACTIONS.map(
    (fraction) => Math.round(durationSeconds * fraction * 10) / 10
  );

  return (
    <div className="bg-card rounded-2xl border p-5 sm:p-6">
      <h2 className="font-bold">Thumbnail</h2>
      <p className="text-muted-foreground mt-1 text-sm">
        Pick the frame people see before they press play, or upload your own
        image.
      </p>

      <input
        accept="image/avif,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) {
            onUpload(file);
          }
        }}
        ref={fileInputRef}
        type="file"
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          className="rounded-lg"
          disabled={isUploading || !canPick}
          onClick={() => fileInputRef.current?.click()}
          type="button"
          variant="outline"
        >
          {isUploading ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <ImageUp className="size-4" />
          )}
          Upload custom thumbnail
        </Button>
        <p className="text-muted-foreground text-xs">
          AVIF, JPEG, PNG, or WebP up to 5MB.
        </p>
      </div>

      {customThumbnailUrl ? (
        <div className="border-primary/40 bg-primary/5 mt-4 flex items-center gap-3 rounded-lg border p-3">
          <img
            alt="Custom thumbnail"
            className="border-border/60 aspect-video h-16 rounded-lg border object-cover"
            src={customThumbnailUrl}
          />
          <div>
            <p className="text-sm font-semibold">Custom thumbnail in use</p>
            <p className="text-muted-foreground text-xs">
              Picking a frame below replaces it.
            </p>
          </div>
        </div>
      ) : null}

      {canPick ? (
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {candidateTimes.map((time) => {
            const isSelected =
              !customThumbnailUrl &&
              Math.abs(time - selectedTimeSeconds) < 0.05;
            return (
              <button
                aria-pressed={isSelected}
                aria-label={`Use the frame at ${formatStudioTime(time)} as the thumbnail`}
                className={cn(
                  "group focus-visible:ring-ring relative cursor-pointer overflow-hidden rounded-lg border transition-[border-color,transform] focus-visible:ring-2 focus-visible:outline-none active:scale-[0.98]",
                  isSelected
                    ? "border-primary ring-primary/40 ring-2"
                    : "border-border/60 hover:border-primary/50"
                )}
                disabled={isSaving}
                key={time}
                onClick={() => onPick(time)}
                type="button"
              >
                <img
                  alt={`Frame at ${formatStudioTime(time)}`}
                  className="bg-muted aspect-video w-full object-cover"
                  loading="lazy"
                  src={`https://image.mux.com/${encodeURIComponent(
                    muxPlaybackId
                  )}/thumbnail.jpg?width=240&time=${time}`}
                />
                <span
                  className={cn(
                    "absolute right-1 bottom-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white",
                    isSelected && "bg-primary text-primary-foreground"
                  )}
                >
                  {formatStudioTime(time)}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-muted-foreground mt-3 text-xs">
          Thumbnail picking needs a public video that has finished processing.
        </p>
      )}
    </div>
  );
}
