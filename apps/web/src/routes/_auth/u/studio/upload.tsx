import { Button } from "@rallycaststv/ui/components/button";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Film, LoaderCircle, Scissors, Upload, Video, Zap } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
import { readApiJson } from "@/lib/hooks/api";
import { startVideoUpload } from "@/lib/video-upload-manager";

import { isEdited, startEditRender, UploadTrimEditor } from "./-upload-editor";
import type { EditRenderHandle, UploadEditState } from "./-upload-editor";

export const Route = createFileRoute("/_auth/u/studio/upload")({
  component: StudioUploadPage,
});

const titleFromFileName = (fileName: string) =>
  fileName
    .replace(/\.[^.]+$/u, "")
    .replaceAll(/[-_]+/gu, " ")
    .trim();

function StudioUploadPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [isPreparing, setIsPreparing] = useState(false);
  const [editState, setEditState] = useState<UploadEditState | null>(null);
  const [render, setRender] = useState<{
    handle: EditRenderHandle;
    progress: number;
  } | null>(null);

  const selectFile = (selectedFile: File | undefined) => {
    if (!selectedFile) {
      return;
    }
    if (!selectedFile.type.startsWith("video/")) {
      toast.error("Choose a video file to continue.");
      return;
    }

    setFile(selectedFile);
    setEditState(null);
    if (!title) {
      setTitle(titleFromFileName(selectedFile.name));
    }
  };

  const uploadFile = async (uploadFileToUse: File) => {
    const result = await readApiJson(
      apiClient.api.v1.upload.mux.$post({
        json: {
          mediaType: "video",
          title: title.trim(),
          visibility: "public",
        },
      })
    );

    startVideoUpload({
      file: uploadFileToUse,
      uploadUrl: result.uploadUrl,
      videoId: result.video.id,
    });
    await navigate({
      params: { id: result.video.id },
      to: "/u/studio/videos/$id",
    });
  };

  const cancelRender = () => {
    render?.handle.cancel();
    setRender(null);
  };

  const beginUpload = async () => {
    if (!file || !title.trim()) {
      toast.error("Choose a video and give it a title.");
      return;
    }

    setIsPreparing(true);
    try {
      if (editState && isEdited(editState)) {
        // Render the edit on-device first, then upload the result.
        const handle = startEditRender({
          duration: editState.duration,
          file,
          onProgress: (progress) => {
            setRender((current) =>
              current ? { ...current, progress } : current
            );
          },
          rotation: editState.rotation,
          segments: editState.segments,
          selection: editState.selection,
        });
        setRender({ handle, progress: 0 });
        const editedFile = await handle.done;
        setRender(null);
        await uploadFile(editedFile);
      } else {
        await uploadFile(file);
      }
    } catch (error) {
      setRender(null);
      if (error instanceof DOMException && error.name === "AbortError") {
        toast.info("Edit canceled. Your original video is unchanged.");
      } else {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not prepare the upload."
        );
      }
      setIsPreparing(false);
    }
  };

  const isRendering = render !== null;

  return (
    <main className="mx-auto max-w-6xl space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          RallyCasts Studio
        </p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Upload a video
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Trim it first if you like, then let Mux handle the streaming work
          while you add details, prepare clips, and decide when it goes public.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-5">
          <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-8">
            <button
              className="flex min-h-72 w-full flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-8 text-center transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              <span className="grid size-16 place-items-center rounded-full bg-primary text-primary-foreground">
                <Upload className="size-7" />
              </span>
              <span>
                <span className="block text-lg font-bold">
                  {file ? file.name : "Choose your video"}
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {file
                    ? `${(file.size / 1024 / 1024).toFixed(1)} MB ready to upload`
                    : "MP4, MOV, WebM, and other common video formats"}
                </span>
              </span>
            </button>
            <input
              accept="video/*"
              aria-label="Choose a video file"
              className="sr-only"
              id="studio-video-file"
              onChange={(event) => selectFile(event.target.files?.[0])}
              ref={fileInputRef}
              type="file"
            />

            <div className="mt-6 space-y-2">
              <label className="text-sm font-semibold" htmlFor="studio-title">
                Working title
              </label>
              <input
                aria-label="Working title"
                className="h-11 w-full rounded-lg border bg-background px-3 outline-none transition-shadow focus:ring-2 focus:ring-primary"
                id="studio-title"
                maxLength={160}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Give people a reason to press play"
                value={title}
              />
            </div>

            {isRendering ? (
              <div className="mt-6 space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <LoaderCircle className="size-4 animate-spin text-primary" />
                    Trimming on this device…
                  </span>
                  <span className="text-sm font-bold text-primary tabular-nums">
                    {Math.round(render.progress * 100)}%
                  </span>
                </div>
                <progress
                  aria-label="Edit render progress"
                  className="h-2 w-full accent-primary"
                  max={100}
                  value={Math.round(render.progress * 100)}
                />
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    Only the trimmed cut will upload.
                  </p>
                  <Button
                    className="rounded-lg"
                    onClick={cancelRender}
                    size="sm"
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="mt-6 flex justify-end">
              <Button
                className="min-w-40 rounded-lg"
                disabled={!file || !title.trim() || isPreparing || isRendering}
                onClick={beginUpload}
              >
                {isPreparing && !isRendering
                  ? "Preparing…"
                  : "Continue to studio"}
              </Button>
            </div>
          </div>

          {file && !isRendering ? (
            <UploadTrimEditor file={file} onStateChange={setEditState} />
          ) : null}
        </div>

        <aside className="space-y-3">
          {[
            [
              Scissors,
              "Trim before upload",
              "Cut the boring parts on this device; only the good cut uploads.",
            ],
            [
              Video,
              "Upload in the background",
              "Move straight into your video workspace.",
            ],
            [
              Zap,
              "Mux processing",
              "Adaptive streaming, thumbnails, and playback.",
            ],
            [
              Film,
              "Clip after processing",
              "Cut social-ready moments from the full video.",
            ],
          ].map(([Icon, heading, copy]) => (
            <div
              className="rounded-xl border bg-card p-4"
              key={String(heading)}
            >
              <Icon className="size-5 text-primary" />
              <h2 className="mt-3 text-sm font-bold">{String(heading)}</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {String(copy)}
              </p>
            </div>
          ))}
        </aside>
      </section>
    </main>
  );
}
