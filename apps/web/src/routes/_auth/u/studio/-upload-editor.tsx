/* oxlint-disable jsx-a11y/media-has-caption -- the preview plays the creator's own local file before upload; no caption track can exist */
import { Button } from "@rallycaststv/ui/components/button";
import { RotateCcw, RotateCw, Scissors } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ClipTrimTimeline } from "./-clip-timeline";
import type { ClipSelection } from "./-clip-timeline";

/**
 * The trim-before-upload editor (#85, Phase 1). After a creator picks their
 * file, MediaBunny reads it entirely on-device: local preview, filmstrip
 * thumbnails, trim, and rotation. Only the edited result is uploaded, so the
 * raw file never leaves the browser and nothing is uploaded twice.
 */

export type RotationDegrees = 0 | 90 | 180 | 270;

export interface UploadEditState {
  duration: number;
  rotation: RotationDegrees;
  selection: ClipSelection;
}

const EDITOR_MIN_SECONDS = 1;
const FILMSTRIP_FRAMES = 12;

export const isEdited = ({
  duration,
  rotation,
  selection,
}: UploadEditState): boolean =>
  rotation !== 0 || selection.start > 0.05 || selection.end < duration - 0.05;

export type UploadEditProbe = "failed" | "loading" | "ready" | "unsupported";

interface UploadTrimEditorProps {
  file: File;
  onStateChange: (state: UploadEditState | null) => void;
}

export function UploadTrimEditor({
  file,
  onStateChange,
}: UploadTrimEditorProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [probe, setProbe] = useState<UploadEditProbe>("loading");
  const [duration, setDuration] = useState(0);
  const [frameUrls, setFrameUrls] = useState<string[]>([]);
  const [rotation, setRotation] = useState<RotationDegrees>(0);
  const [selection, setSelection] = useState<ClipSelection>({
    end: 0,
    start: 0,
  });
  const selectionRef = useRef(selection);

  useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);

  // Probe the file on-device with MediaBunny: duration, filmstrip thumbnails,
  // and whether this browser can encode the file for a trim render.
  useEffect(() => {
    let disposed = false;
    setProbe("loading");
    setFrameUrls([]);

    (async () => {
      try {
        const { Input, ALL_FORMATS, BlobSource, CanvasSink } =
          await import("mediabunny");
        const input = new Input({
          formats: ALL_FORMATS,
          source: new BlobSource(file),
        });
        const total = await input.computeDuration();
        if (!Number.isFinite(total) || total <= 0) {
          throw new Error("Could not read the video duration.");
        }
        if (disposed) {
          return;
        }
        setDuration(total);
        setSelection({ end: total, start: 0 });
        setProbe("ready");

        const videoTrack = await input.getPrimaryVideoTrack();
        if (!videoTrack || !(await videoTrack.canDecode())) {
          return;
        }
        const sink = new CanvasSink(videoTrack, { width: 160 });
        const timestamps = Array.from(
          { length: FILMSTRIP_FRAMES },
          (_, index) => ((index + 0.5) * total) / FILMSTRIP_FRAMES
        );
        const urls: string[] = [];
        for await (const frameResult of sink.canvasesAtTimestamps(timestamps)) {
          const canvas = frameResult?.canvas;
          if (
            canvas instanceof HTMLCanvasElement &&
            typeof canvas.toDataURL === "function"
          ) {
            urls.push(canvas.toDataURL("image/jpeg", 0.7));
          }
          if (disposed) {
            return;
          }
        }
        if (!disposed) {
          setFrameUrls(urls);
        }
      } catch {
        if (!disposed) {
          setProbe("failed");
        }
      }
    })();

    return () => {
      disposed = true;
    };
  }, [file]);

  // Report the edit state up to the upload page whenever it changes.
  useEffect(() => {
    if (probe !== "ready" || duration <= 0) {
      onStateChange(null);
      return;
    }
    onStateChange({ duration, rotation, selection });
  }, [duration, onStateChange, probe, rotation, selection]);

  // Preview loop: the local <video> plays only the selected range.
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.paused) {
      return;
    }
    const { end, start } = selectionRef.current;
    if (video.currentTime > end - 0.05 || video.currentTime < start - 0.05) {
      video.currentTime = start;
    }
  }, []);

  const objectUrl = useMemo(() => URL.createObjectURL(file), [file]);

  useEffect(
    () => () => {
      URL.revokeObjectURL(objectUrl);
    },
    [objectUrl]
  );

  const handleScrub = useCallback((time: number) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = time;
    }
  }, []);

  const resetEdits = useCallback(() => {
    setRotation(0);
    setSelection({ end: duration, start: 0 });
  }, [duration]);

  const isRotated = rotation === 90 || rotation === 270;

  if (probe === "loading") {
    return (
      <div className="h-64 animate-pulse rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Scissors className="size-4 text-primary" />
          Reading your video on this device…
        </div>
      </div>
    );
  }

  if (probe !== "ready") {
    return (
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <Scissors className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            In-browser trimming isn't available for this video in this browser.
            Your original will be uploaded as-is.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Scissors className="size-5 text-primary" />
            Trim before upload
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Runs entirely on this device. Only the edited result uploads.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            aria-label={`Rotate video 90 degrees clockwise, currently ${rotation} degrees`}
            className="rounded-lg"
            onClick={() =>
              setRotation(
                (current) => ((current + 90) % 360) as RotationDegrees
              )
            }
            size="sm"
            variant="outline"
          >
            <RotateCw className="size-4" />
            Rotate {rotation === 0 ? "" : `(${rotation}°)`}
          </Button>
          {(rotation !== 0 ||
            selection.start > 0.05 ||
            selection.end < duration - 0.05) && (
            <Button
              className="rounded-lg"
              onClick={resetEdits}
              size="sm"
              variant="ghost"
            >
              <RotateCcw className="size-4" />
              Reset
            </Button>
          )}
        </div>
      </div>

      <div
        className="relative mx-auto w-full overflow-hidden rounded-xl bg-black"
        style={{
          aspectRatio: isRotated ? "9 / 16" : "16 / 9",
          maxWidth: isRotated ? "min(100%, 18rem)" : "100%",
        }}
      >
        <video
          aria-label="Preview of the selected part of your video"
          className="absolute size-full object-contain"
          controls
          onTimeUpdate={handleTimeUpdate}
          playsInline
          preload="metadata"
          ref={videoRef}
          src={objectUrl}
          style={{ transform: `rotate(${rotation}deg)` }}
        />
      </div>

      <ClipTrimTimeline
        duration={duration}
        end={selection.end}
        frameUrls={frameUrls}
        maxSeconds={Number.POSITIVE_INFINITY}
        minSeconds={EDITOR_MIN_SECONDS}
        onChange={setSelection}
        onScrub={handleScrub}
        start={selection.start}
      />

      <p className="text-xs text-muted-foreground">
        {isEdited({ duration, rotation, selection })
          ? "Continuing uploads the edited cut."
          : "Drag the handles to keep only the part worth watching, or continue with the full video."}
      </p>
    </div>
  );
}

interface EditRenderOptions {
  duration: number;
  file: File;
  rotation: RotationDegrees;
  selection: ClipSelection;
}

export interface EditRenderHandle {
  cancel: () => void;
  done: Promise<File>;
}

/**
 * Renders the creator's edits to a new MP4 on-device via MediaBunny and
 * resolves with the file to upload. MediaBunny copies media data whenever
 * the edit permits it and only re-encodes through WebCodecs when a trim or
 * rotation requires it.
 */
export function startEditRender({
  duration,
  file,
  onProgress,
  rotation,
  selection,
}: EditRenderOptions & {
  onProgress?: (progress: number) => void;
}): EditRenderHandle {
  const needsTrim = selection.start > 0.05 || selection.end < duration - 0.05;
  let cancelRequested = false;
  let activeConversion: { cancel: () => Promise<void> } | null = null;

  const done = (async () => {
    const {
      Input,
      ALL_FORMATS,
      BlobSource,
      BufferTarget,
      Conversion,
      Mp4OutputFormat,
      Output,
    } = await import("mediabunny");

    const input = new Input({
      formats: ALL_FORMATS,
      source: new BlobSource(file),
    });
    const output = new Output({
      format: new Mp4OutputFormat(),
      target: new BufferTarget(),
    });

    const conversion = await Conversion.init({
      input,
      output,
      ...(rotation === 0 ? {} : { video: { rotate: rotation } }),
      ...(needsTrim
        ? { trim: { end: selection.end, start: selection.start } }
        : {}),
    });

    if (cancelRequested) {
      await conversion.cancel();
      throw new DOMException("Render canceled.", "AbortError");
    }

    if (!conversion.isValid) {
      throw new Error(
        "This video's format can't be edited in this browser yet. Upload the original instead."
      );
    }

    activeConversion = conversion;
    conversion.onProgress = (progress: number) => {
      onProgress?.(progress);
    };

    try {
      await conversion.execute();
    } catch (error) {
      if (error instanceof Error && error.name === "ConversionCanceledError") {
        throw new DOMException("Render canceled.", "AbortError");
      }
      throw error;
    }

    const { buffer } = output.target;
    if (!buffer) {
      throw new Error("The edit produced no video. Try again.");
    }

    const mimeType =
      output.format.mimeType && output.format.mimeType.startsWith("video/")
        ? output.format.mimeType
        : "video/mp4";

    return new File([buffer], `${file.name.replace(/\.[^.]+$/u, "")}.mp4`, {
      lastModified: Date.now(),
      type: mimeType,
    });
  })();

  return {
    cancel: () => {
      cancelRequested = true;
      void activeConversion?.cancel();
    },
    done,
  };
}
