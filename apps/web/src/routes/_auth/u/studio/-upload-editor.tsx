import { Button } from "@rallycaststv/ui/components/button";
import { Plus, RotateCcw, RotateCw, Scissors, X } from "lucide-react";
/* oxlint-disable jsx-a11y/media-has-caption -- the preview plays the creator's own local file before upload; no caption track can exist */
import type { AudioSample, VideoSample } from "mediabunny";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ClipTrimTimeline, formatClipTime } from "./-clip-timeline";
import type { ClipSelection } from "./-clip-timeline";

/**
 * The trim-before-upload editor (#85). After a creator picks their file,
 * MediaBunny reads it entirely on-device: local preview, filmstrip
 * thumbnails, trim, rotation, and multi-segment stitching. Only the edited
 * result is uploaded, so the raw file never leaves the browser and nothing
 * is uploaded twice.
 */

export type RotationDegrees = 0 | 90 | 180 | 270;

export interface UploadEditState {
  duration: number;
  rotation: RotationDegrees;
  segments: ClipSelection[];
  selection: ClipSelection;
}

export interface StitchedSegment {
  end: number;
  outputStart: number;
  start: number;
}

const EDITOR_MIN_SECONDS = 1;
const FILMSTRIP_FRAMES = 12;

/**
 * When segments are set, they define the output: every sample inside a
 * segment is kept and remapped to be contiguous, everything else is
 * dropped. An empty segment list means the single timeline selection is the
 * edit (the whole video when untouched).
 */
export const buildStitchedSegments = (
  segments: readonly ClipSelection[]
): StitchedSegment[] => {
  const sorted = [...segments].toSorted(
    (left, right) => left.start - right.start
  );
  let cursor = 0;
  return sorted.map((segment) => {
    const outputStart = cursor;
    cursor += segment.end - segment.start;
    return { end: segment.end, outputStart, start: segment.start };
  });
};

/** Maps a source timestamp onto the stitched timeline, or null to drop. */
export const remapTimestampToStitched = (
  timestamp: number,
  stitched: readonly StitchedSegment[]
): number | null => {
  for (const segment of stitched) {
    if (timestamp >= segment.start && timestamp < segment.end) {
      return timestamp - segment.start + segment.outputStart;
    }
  }
  return null;
};

/**
 * The next segment boundary at or after a timestamp (its start when inside a
 * gap, or the start of the segment after the current one), used to skip
 * across dropped footage during preview playback.
 */
export const findNextSegmentStart = (
  timestamp: number,
  stitched: readonly StitchedSegment[]
): number | null => {
  for (const segment of stitched) {
    if (timestamp < segment.start) {
      return segment.start;
    }
  }
  return null;
};

export const segmentsOverlap = (
  candidate: ClipSelection,
  segments: readonly ClipSelection[]
): boolean =>
  segments.some(
    (segment) => candidate.start < segment.end && candidate.end > segment.start
  );

export const isEdited = ({
  duration,
  rotation,
  segments,
  selection,
}: UploadEditState): boolean =>
  rotation !== 0 ||
  segments.length > 0 ||
  selection.start > 0.05 ||
  selection.end < duration - 0.05;

export type UploadEditProbe = "failed" | "loading" | "ready" | "unsupported";

export interface EditRecipeSegment {
  end: number;
  start: number;
}

export interface UploadEditRecipe {
  rotation: RotationDegrees;
  segments: EditRecipeSegment[];
  sourceDurationSeconds: number;
  version: 1;
}

const roundToCentisecond = (value: number) =>
  Math.round(Math.max(0, value) * 100) / 100;

/**
 * The non-destructive description of the edit that produced this upload:
 * the kept ranges and rotation, measured against the creator's original
 * file. Sent with the upload so the server can store a few hundred bytes
 * of recipe instead of the raw file (#85).
 */
export const buildEditRecipe = ({
  duration,
  rotation,
  segments,
  selection,
}: UploadEditState): UploadEditRecipe | null => {
  const keptRanges: EditRecipeSegment[] =
    segments.length > 0
      ? segments
      : [
          {
            end: Math.min(duration, selection.end),
            start: Math.max(0, selection.start),
          },
        ];

  const normalized = keptRanges
    .map((segment) => ({
      end: roundToCentisecond(Math.min(duration, segment.end)),
      start: roundToCentisecond(Math.max(0, segment.start)),
    }))
    .filter((segment) => segment.end > segment.start)
    .toSorted((left, right) =>
      left.start === right.start
        ? left.end - right.end
        : left.start - right.start
    );

  if (normalized.length === 0) {
    return null;
  }

  // A recipe that describes the whole video with no rotation is no
  // transformation at all; the original is the recipe.
  const isWholeVideo =
    normalized.length === 1 &&
    normalized[0].start <= 0.05 &&
    normalized[0].end >= duration - 0.05;
  if (rotation === 0 && isWholeVideo) {
    return null;
  }

  return {
    rotation,
    segments: normalized,
    sourceDurationSeconds: roundToCentisecond(duration),
    version: 1,
  };
};

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
  const [segments, setSegments] = useState<ClipSelection[]>([]);
  const playheadRef = useRef({ rotation, segments, selection });

  useEffect(() => {
    playheadRef.current = { rotation, segments, selection };
  }, [rotation, segments, selection]);

  const stitched = useMemo(() => buildStitchedSegments(segments), [segments]);

  // Probe the file on-device with MediaBunny: duration, filmstrip thumbnails,
  // and whether this browser can handle the file at all.
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
    onStateChange({ duration, rotation, segments, selection });
  }, [duration, onStateChange, probe, rotation, segments, selection]);

  // Preview playback: with segments set, the playhead skips over dropped
  // footage; otherwise it loops the selected range.
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.paused) {
      return;
    }
    const { selection: current, segments: currentSegments } =
      playheadRef.current;

    if (currentSegments.length > 0) {
      const currentStitched = buildStitchedSegments(currentSegments);
      const outside = currentSegments.every(
        (segment) =>
          video.currentTime < segment.start || video.currentTime >= segment.end
      );
      if (outside) {
        const next =
          findNextSegmentStart(video.currentTime, currentStitched) ??
          currentStitched[0]?.start ??
          0;
        video.currentTime = next;
      }
      return;
    }

    if (
      video.currentTime > current.end - 0.05 ||
      video.currentTime < current.start - 0.05
    ) {
      video.currentTime = current.start;
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

  const addSegment = useCallback(() => {
    const candidate = selection;
    if (candidate.end - candidate.start < EDITOR_MIN_SECONDS) {
      toast.error("Segments need at least 1 second of video.");
      return;
    }
    if (segmentsOverlap(candidate, segments)) {
      toast.error("Segments can't overlap. Adjust the selection first.");
      return;
    }
    setSegments((current) =>
      [...current, candidate].sort((left, right) => left.start - right.start)
    );
  }, [segments, selection]);

  const removeSegment = useCallback((index: number) => {
    setSegments((current) => current.filter((_, i) => i !== index));
  }, []);

  const resetEdits = useCallback(() => {
    setRotation(0);
    setSegments([]);
    setSelection({ end: duration, start: 0 });
  }, [duration]);

  const keptSeconds = stitched.reduce(
    (total, segment) => total + (segment.end - segment.start),
    0
  );

  const hasEdits =
    rotation !== 0 ||
    segments.length > 0 ||
    selection.start > 0.05 ||
    selection.end < duration - 0.05;

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

  const getStatusCopy = (): string => {
    if (!hasEdits) {
      return "Drag the handles to keep only the part worth watching, add several ranges for a highlight cut, or continue with the full video.";
    }
    if (segments.length > 0) {
      return "Continuing uploads only the stitched ranges, in order.";
    }
    return "Continuing uploads the edited cut.";
  };
  const statusCopy = getStatusCopy();

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
          {hasEdits ? (
            <Button
              className="rounded-lg"
              onClick={resetEdits}
              size="sm"
              variant="ghost"
            >
              <RotateCcw className="size-4" />
              Reset
            </Button>
          ) : null}
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
          aria-label="Preview of the parts of your video that will upload"
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          className="rounded-lg"
          onClick={addSegment}
          size="sm"
          variant="outline"
        >
          <Plus className="size-4" />
          Add this range to the video
        </Button>
        {segments.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            {segments.length} range{segments.length === 1 ? "" : "s"} stitched
            together · {formatClipTime(keptSeconds)} kept
          </p>
        ) : null}
      </div>

      {segments.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {stitched.map((segment, index) => (
            <li
              className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
              key={`${segment.start}-${segment.end}`}
            >
              <span>
                {index + 1}. {formatClipTime(segment.start)} to{" "}
                {formatClipTime(segment.end)} (
                {Math.round(segment.end - segment.start)}s)
              </span>
              <button
                aria-label={`Remove range ${index + 1}`}
                className="rounded-full transition-colors hover:text-foreground"
                onClick={() => removeSegment(index)}
                type="button"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="text-xs text-muted-foreground">{statusCopy}</p>
    </div>
  );
}

interface EditRenderOptions {
  duration: number;
  file: File;
  rotation: RotationDegrees;
  segments: ClipSelection[];
  selection: ClipSelection;
}

export interface EditRenderHandle {
  cancel: () => void;
  done: Promise<File>;
}

/**
 * Renders the creator's edits to a new MP4 on-device via MediaBunny and
 * resolves with the file to upload.
 *
 * - No edits: nothing to do (the caller uploads the original).
 * - Single range: MediaBunny copies media data whenever the edit permits it
 *   and only re-encodes through WebCodecs when required.
 * - Multiple ranges: one conversion whose sample-level `process` callbacks
 *   drop everything outside the ranges and remap timestamps so the kept
 *   ranges play back-to-back; the conversion is bounded to the outer range
 *   so untouched footage is never decoded.
 */
export function startEditRender({
  duration,
  file,
  onProgress,
  rotation,
  segments,
  selection,
}: EditRenderOptions & {
  onProgress?: (progress: number) => void;
}): EditRenderHandle {
  const isMultiSegment = segments.length > 0;
  const stitched = buildStitchedSegments(segments);
  const needsSingleTrim =
    !isMultiSegment &&
    (selection.start > 0.05 || selection.end < duration - 0.05);

  let cancelRequested = false;
  let activeConversion: { cancel: () => Promise<void> } | null = null;

  const remapVideoSample = (sample: VideoSample): VideoSample | null => {
    const remapped = remapTimestampToStitched(sample.timestamp, stitched);
    if (remapped === null) {
      return null;
    }
    sample.setTimestamp(remapped);
    return sample;
  };

  const remapAudioSample = (sample: AudioSample): AudioSample | null => {
    const remapped = remapTimestampToStitched(sample.timestamp, stitched);
    if (remapped === null) {
      return null;
    }
    sample.setTimestamp(remapped);
    return sample;
  };

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

    const videoOptions: Record<string, unknown> | undefined = (() => {
      if (isMultiSegment) {
        return {
          ...(rotation === 0 ? {} : { rotate: rotation }),
          process: remapVideoSample,
        };
      }
      if (rotation !== 0) {
        return { rotate: rotation };
      }
    })();

    const getTrimOptions = (): { end: number; start: number } | undefined => {
      if (isMultiSegment) {
        return {
          end: stitched.at(-1)?.end ?? duration,
          start: stitched[0]?.start ?? 0,
        };
      }
      if (needsSingleTrim) {
        return { end: selection.end, start: selection.start };
      }
      return undefined;
    };
    const trimOptions = getTrimOptions();

    const conversion = await Conversion.init({
      audio: isMultiSegment ? { process: remapAudioSample } : undefined,
      input,
      output,
      video: videoOptions,
      ...(trimOptions ? { trim: trimOptions } : {}),
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
