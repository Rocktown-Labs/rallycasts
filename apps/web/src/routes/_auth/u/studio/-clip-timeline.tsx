import { cn } from "@rallycaststv/ui/lib/utils";
/* oxlint-disable jsx-a11y/prefer-tag-over-role -- trim handles are custom drag controls, not form inputs; slider role + keyboard support is the correct pattern */
import type { PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useRef } from "react";

export const CLIP_MIN_SECONDS = 15;
export const CLIP_MAX_SECONDS = 120;

/**
 * Videos shorter than the minimum clip length can still be clipped whole,
 * so the effective minimum is the smaller of the rule and the video.
 */
export const getEffectiveMinSeconds = (
  duration: number,
  minSeconds: number = CLIP_MIN_SECONDS
) => Math.min(minSeconds, Math.max(0, duration));

export interface ClipSelection {
  start: number;
  end: number;
}

/** The default selection for a video: the first 15 seconds, or all of it. */
export const initialClipSelection = (duration: number): ClipSelection => {
  if (!Number.isFinite(duration) || duration <= 0) {
    return { end: CLIP_MIN_SECONDS, start: 0 };
  }
  const length = getEffectiveMinSeconds(duration);
  return { end: Math.min(duration, length), start: 0 };
};

/**
 * Where the start handle may sit for the current end: it cannot cross the
 * end handle, cannot make the clip shorter than the minimum, and cannot
 * make it longer than the maximum.
 */
export const clampClipStart = (
  start: number,
  end: number,
  duration: number,
  minSeconds: number = CLIP_MIN_SECONDS,
  maxSeconds: number = CLIP_MAX_SECONDS
): number => {
  const min = getEffectiveMinSeconds(duration, minSeconds);
  const lower = Math.max(0, end - maxSeconds);
  const upper = Math.max(0, end - min);
  return Math.min(upper, Math.max(lower, start));
};

/**
 * Where the end handle may sit for the current start: at least the minimum
 * clip length past it, at most the maximum, never past the video end.
 */
export const clampClipEnd = (
  end: number,
  start: number,
  duration: number,
  minSeconds: number = CLIP_MIN_SECONDS,
  maxSeconds: number = CLIP_MAX_SECONDS
): number => {
  const min = getEffectiveMinSeconds(duration, minSeconds);
  const lower = start + min;
  const upper = Math.min(duration, start + maxSeconds);
  const clamped = Math.min(upper, Math.max(lower, end));
  return Math.min(duration, Math.max(0, clamped));
};

/** Slide the whole selection by a delta without leaving the video. */
export const shiftClipSelection = (
  selection: ClipSelection,
  delta: number,
  duration: number
): ClipSelection => {
  const width = selection.end - selection.start;
  const start = Math.max(
    0,
    Math.min(selection.start + delta, duration - width)
  );
  return { end: start + width, start };
};

export const formatClipTime = (seconds: number): string => {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
};

const HANDLE_STEP_SECONDS = 1;
const HANDLE_LARGE_STEP_SECONDS = 5;

interface ClipTrimTimelineProps {
  duration: number;
  end: number;
  frameUrls: string[];
  maxSeconds?: number;
  minSeconds?: number;
  onChange: (selection: ClipSelection) => void;
  onScrub?: (time: number) => void;
  start: number;
}

type DragMode = "end" | "start" | "window";

/**
 * A trim timeline in the style of mobile video editors: a filmstrip of the
 * source video with draggable start/end handles, a draggable selection
 * window, dimmed footage outside the selection, and time labels. Handles
 * clamp to the provided length rules (the clipper passes its 15s minimum
 * and 2-minute maximum) and are fully keyboard operable.
 */
export function ClipTrimTimeline({
  duration,
  end,
  frameUrls,
  maxSeconds = CLIP_MAX_SECONDS,
  minSeconds = CLIP_MIN_SECONDS,
  onChange,
  onScrub,
  start,
}: ClipTrimTimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragMode = useRef<DragMode | null>(null);
  const dragOrigin = useRef({ end, pointerX: 0, start });
  const effectiveMin = getEffectiveMinSeconds(duration, minSeconds);

  const timeAtPointer = useCallback(
    (clientX: number): number => {
      const track = trackRef.current;
      if (!track || duration <= 0) {
        return 0;
      }
      const rect = track.getBoundingClientRect();
      if (rect.width === 0) {
        return 0;
      }
      const ratio = (clientX - rect.left) / rect.width;
      return Math.max(0, Math.min(duration, ratio * duration));
    },
    [duration]
  );

  const updateStart = useCallback(
    (rawStart: number, scrub = true) => {
      const nextStart = clampClipStart(
        rawStart,
        end,
        duration,
        minSeconds,
        maxSeconds
      );
      onChange({ end, start: nextStart });
      if (scrub) {
        onScrub?.(nextStart);
      }
    },
    [duration, end, maxSeconds, minSeconds, onChange, onScrub]
  );

  const updateEnd = useCallback(
    (rawEnd: number, scrub = true) => {
      const nextEnd = clampClipEnd(
        rawEnd,
        start,
        duration,
        minSeconds,
        maxSeconds
      );
      onChange({ end: nextEnd, start });
      if (scrub) {
        onScrub?.(nextEnd);
      }
    },
    [duration, maxSeconds, minSeconds, onChange, onScrub, start]
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const mode = dragMode.current;
      if (!mode) {
        return;
      }
      if (mode === "start") {
        updateStart(timeAtPointer(event.clientX));
        return;
      }
      if (mode === "end") {
        updateEnd(timeAtPointer(event.clientX));
        return;
      }
      const deltaSeconds =
        ((event.clientX - dragOrigin.current.pointerX) /
          (trackRef.current?.getBoundingClientRect().width || 1)) *
        duration;
      onChange(
        shiftClipSelection(
          {
            end: dragOrigin.current.end,
            start: dragOrigin.current.start,
          },
          deltaSeconds,
          duration
        )
      );
    },
    [duration, onChange, timeAtPointer, updateEnd, updateStart]
  );

  const beginDrag = useCallback(
    (event: ReactPointerEvent<HTMLElement>, mode: DragMode) => {
      event.preventDefault();
      if (typeof event.currentTarget.setPointerCapture === "function") {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      dragMode.current = mode;
      dragOrigin.current = { end, pointerX: event.clientX, start };
    },
    [end, start]
  );

  const endDrag = useCallback(() => {
    dragMode.current = null;
  }, []);

  const handleKeyboard = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, mode: DragMode) => {
      const step =
        event.shiftKey && event.key.startsWith("Arrow")
          ? HANDLE_LARGE_STEP_SECONDS
          : HANDLE_STEP_SECONDS;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        const direction = event.key === "ArrowLeft" ? -1 : 1;
        if (mode === "start") {
          updateStart(start + direction * step);
        } else {
          updateEnd(end + direction * step);
        }
        return;
      }
      if (mode === "start" && event.key === "Home") {
        event.preventDefault();
        updateStart(0);
      }
      if (mode === "start" && event.key === "End") {
        event.preventDefault();
        updateStart(end - effectiveMin);
      }
      if (mode === "end" && event.key === "Home") {
        event.preventDefault();
        updateEnd(start + effectiveMin);
      }
      if (mode === "end" && event.key === "End") {
        event.preventDefault();
        updateEnd(duration);
      }
    },
    [duration, effectiveMin, end, start, updateEnd, updateStart]
  );

  const startPct = duration > 0 ? Math.min(100, (start / duration) * 100) : 0;
  const endPct = duration > 0 ? Math.min(100, (end / duration) * 100) : 0;
  const clipSeconds = Math.max(0, end - start);

  return (
    <div className="touch-none space-y-2 select-none">
      <div
        className="bg-muted relative h-20 overflow-hidden rounded-lg"
        data-testid="clip-trim-timeline"
        ref={trackRef}
      >
        <div className="absolute inset-0 flex">
          {frameUrls.length > 0
            ? frameUrls.map((url, index) => (
                <img
                  alt=""
                  className="h-full min-w-0 flex-1 object-cover"
                  key={url + String(index)}
                  loading="lazy"
                  src={url}
                />
              ))
            : null}
        </div>

        {/* Dimmed footage outside the selection */}
        <div
          className="absolute inset-y-0 left-0 bg-black/75"
          style={{ width: `${startPct}%` }}
        />
        <div
          className="absolute inset-y-0 right-0 bg-black/75"
          style={{ width: `${100 - endPct}%` }}
        />

        {/* Selection window: drag to slide the selection */}
        <div
          className="absolute inset-y-0 z-10 cursor-grab active:cursor-grabbing"
          data-testid="clip-trim-window"
          onPointerDown={(event) => beginDrag(event, "window")}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          style={{
            left: `${startPct}%`,
            width: `${Math.max(0, endPct - startPct)}%`,
          }}
        />

        {/* Start handle: a trim handle is a drag control, not a form input. */}
        <button
          role="slider"
          type="button"
          aria-label={`Clip start, currently ${formatClipTime(start)}`}
          aria-valuemax={Math.round(duration)}
          aria-valuemin={0}
          aria-valuenow={Math.round(start)}
          className="focus-visible:ring-ring absolute inset-y-0 z-20 -ml-1.5 flex w-3 cursor-ew-resize items-center justify-center rounded-sm bg-[#bcdf21] outline-none focus-visible:ring-2"
          onKeyDown={(event) => handleKeyboard(event, "start")}
          onPointerDown={(event) => beginDrag(event, "start")}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          style={{ left: `${startPct}%` }}
        >
          <span className="h-5 w-0.5 rounded-full bg-black/50" />
        </button>

        {/* End handle: a trim handle is a drag control, not a form input. */}
        <button
          role="slider"
          type="button"
          aria-label={`Clip end, currently ${formatClipTime(end)}`}
          aria-valuemax={Math.round(duration)}
          aria-valuemin={0}
          aria-valuenow={Math.round(end)}
          className="focus-visible:ring-ring absolute inset-y-0 z-20 -mr-1.5 flex w-3 cursor-ew-resize items-center justify-center rounded-sm bg-[#bcdf21] outline-none focus-visible:ring-2"
          onKeyDown={(event) => handleKeyboard(event, "end")}
          onPointerDown={(event) => beginDrag(event, "end")}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          style={{ left: `${endPct}%` }}
        >
          <span className="h-5 w-0.5 rounded-full bg-black/50" />
        </button>
      </div>

      <div className="text-muted-foreground flex items-center justify-between text-xs">
        <span
          className={cn(
            "font-semibold tabular-nums",
            startPct > 0 && "text-foreground/80"
          )}
        >
          {formatClipTime(start)}
        </span>
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-1 font-bold tabular-nums",
            clipSeconds >= effectiveMin - 0.01 &&
              clipSeconds <= maxSeconds + 0.01
              ? "bg-primary/10 text-primary"
              : "bg-destructive/10 text-destructive"
          )}
          data-testid="clip-length-badge"
        >
          {clipSeconds.toFixed(0)}s selected
        </span>
        <span className="font-semibold tabular-nums">
          {formatClipTime(end)}
        </span>
      </div>
    </div>
  );
}
