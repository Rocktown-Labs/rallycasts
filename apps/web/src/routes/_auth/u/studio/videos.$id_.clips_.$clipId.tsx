import { Button } from "@rallycaststv/ui/components/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, Copy, LoaderCircle, Scissors } from "lucide-react";
import { useState } from "react";

import { apiClient } from "@/lib/api-client";
import { getVideoSlug } from "@/lib/hooks";
import { readApiJson } from "@/lib/hooks/api";

export const Route = createFileRoute(
  "/_auth/u/studio/videos/$id_/clips_/$clipId"
)({
  component: () => <ClipCreatedPage />,
});

const ClipCreatedPage = () => {
  const { clipId, id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [hasCopied, setHasCopied] = useState(false);

  // Same query key as useVideo, so the clipper's cache invalidations and
  // this poll share state. Poll until Mux finishes, then stop.
  const { data: videoData, isLoading } = useQuery({
    enabled: clipId.length > 0,
    queryFn: () =>
      readApiJson(
        apiClient.api.v1.videos[":id"].$get({ param: { id: clipId } })
      ),
    queryKey: ["videos", clipId],
    refetchInterval: (query) =>
      query.state.data?.video?.status === "ready" ? false : 4000,
  });

  const clip = videoData?.video;
  const isReady = clip?.status === "ready";
  const shareUrl = clip
    ? `${window.location.origin}/videos/${getVideoSlug(clip)}`
    : null;

  const copyShareLink = async () => {
    if (!shareUrl) {
      return;
    }
    await navigator.clipboard.writeText(shareUrl);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2500);
  };

  const createAnother = async () => {
    await queryClient.invalidateQueries({ queryKey: ["videos", clipId] });
    await navigate({
      params: { id },
      to: "/u/studio/videos/$id/clips",
    });
  };

  return (
    <main className="mx-auto max-w-5xl space-y-5">
      <header className="flex items-center gap-4">
        <Button
          aria-label="Back to the clipper"
          onClick={() => void createAnother()}
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
          <h1 className="text-3xl font-bold">
            {isLoading ? "Your RallyClip" : (clip?.title ?? "Your RallyClip")}
          </h1>
        </div>
      </header>

      <div className="bg-card space-y-5 rounded-2xl border p-5 sm:p-6">
        <div className="bg-primary text-primary-foreground flex items-center gap-3 rounded-lg px-4 py-3">
          {isReady ? (
            <Check className="size-5 shrink-0" />
          ) : (
            <LoaderCircle className="size-5 shrink-0 animate-spin" />
          )}
          <div>
            <p className="text-sm font-bold">
              {isReady ? "Your clip is live" : "Your clip is processing"}
            </p>
            <p className="text-xs opacity-85">
              {isReady
                ? "It is published and ready to share."
                : "Mux is cutting the clip. This usually takes under a minute; this page updates on its own."}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-sm font-semibold" htmlFor="clip-share-url">
            Share link
          </label>
          <div className="flex items-center gap-2">
            <p
              className="border-border bg-background min-w-0 flex-1 truncate rounded-lg border px-3 py-2.5 font-mono text-xs"
              id="clip-share-url"
            >
              {shareUrl ?? "The link appears once processing starts."}
            </p>
            <Button
              className="rounded-lg"
              disabled={!shareUrl}
              onClick={() => void copyShareLink()}
              type="button"
              variant="outline"
            >
              {hasCopied ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
              {hasCopied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {isReady && shareUrl ? (
            <a
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center justify-center rounded-lg px-5 text-sm font-medium transition-colors"
              href={shareUrl}
            >
              View clip
            </a>
          ) : (
            <Button className="rounded-lg" disabled type="button">
              View clip
            </Button>
          )}
          <Button
            className="rounded-lg"
            onClick={() => void createAnother()}
            type="button"
            variant="outline"
          >
            <Scissors className="size-4" />
            Create another clip
          </Button>
          <Link
            className="border-border hover:bg-muted inline-flex h-10 items-center justify-center rounded-lg border px-5 text-sm font-medium transition-colors"
            params={{ id }}
            to="/u/studio/videos/$id"
          >
            Back to this video
          </Link>
        </div>
      </div>
    </main>
  );
};
