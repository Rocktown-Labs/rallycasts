import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CLIP_MIN_SECONDS,
  ClipTrimTimeline,
  clampClipEnd,
  clampClipStart,
  formatClipTime,
  getEffectiveMinSeconds,
  initialClipSelection,
  shiftClipSelection,
} from "./-clip-timeline";

const DURATION = 300;

afterEach(() => {
  cleanup();
});

describe("clip selection math", () => {
  it("starts with the first 15 seconds of a video", () => {
    expect(initialClipSelection(DURATION)).toEqual({ end: 15, start: 0 });
  });

  it("starts with the whole video when it is shorter than the minimum", () => {
    expect(initialClipSelection(9)).toEqual({ end: 9, start: 0 });
  });

  it("the effective minimum never exceeds the video length", () => {
    expect(getEffectiveMinSeconds(DURATION)).toBe(CLIP_MIN_SECONDS);
    expect(getEffectiveMinSeconds(6)).toBe(6);
  });

  it("the start handle cannot make the clip too short, too long, or cross the end", () => {
    expect(clampClipStart(100, 60, DURATION)).toBe(45);
    expect(clampClipStart(58, 60, DURATION)).toBe(45);
    expect(clampClipStart(-5, 60, DURATION)).toBe(0);
    // 100s with a 150s end is a valid 50s clip, so it stays put.
    expect(clampClipStart(100, 150, DURATION)).toBe(100);
  });

  it("the end handle cannot make the clip too short, too long, or pass the video end", () => {
    expect(clampClipEnd(10, 60, DURATION)).toBe(75);
    // At most 120s past the start, never past the video end.
    expect(clampClipEnd(500, 60, DURATION)).toBe(180);
    expect(clampClipEnd(30, 0, DURATION)).toBe(30);
    // 200s is only 10s past 190s: raised to the 15s minimum.
    expect(clampClipEnd(200, 190, DURATION)).toBe(205);
  });

  it("slides the selection without leaving the video", () => {
    // Sliding right by 100s keeps the window inside the 300s video.
    expect(shiftClipSelection({ end: 60, start: 30 }, 100, DURATION)).toEqual({
      end: 160,
      start: 130,
    });
    expect(shiftClipSelection({ end: 60, start: 30 }, -100, DURATION)).toEqual({
      end: 30,
      start: 0,
    });
  });

  it("formats times as m:ss", () => {
    expect(formatClipTime(0)).toBe("0:00");
    expect(formatClipTime(59.6)).toBe("1:00");
    expect(formatClipTime(125)).toBe("2:05");
  });

  it("supports editor rules: near-zero minimum and no maximum", () => {
    // The upload editor passes a 1s minimum and no length cap, so the
    // handles move freely across the video.
    expect(
      clampClipStart(299, 300, DURATION, 1, Number.POSITIVE_INFINITY)
    ).toBe(299);
    expect(clampClipEnd(5, 0, DURATION, 1, Number.POSITIVE_INFINITY)).toBe(5);
    expect(clampClipEnd(300, 0, DURATION, 1, Number.POSITIVE_INFINITY)).toBe(
      300
    );
    // The effective minimum never exceeds the video length, even with a
    // tiny rule: a 4s video can still be trimmed whole.
    expect(getEffectiveMinSeconds(4, 15)).toBe(4);
  });
});

describe("ClipTrimTimeline", () => {
  const trackRect = { height: 80, left: 0, top: 0, width: 400 };
  const callbacks = {
    onChange: vi.fn(),
    onScrub: vi.fn(),
  };

  const setup = () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      () =>
        ({
          ...trackRect,
          bottom: trackRect.top + trackRect.height,
          right: trackRect.left + trackRect.width,
          toJSON: () => trackRect,
        }) as DOMRect
    );
    return render(
      <ClipTrimTimeline
        duration={DURATION}
        end={60}
        frameUrls={[]}
        start={30}
        {...callbacks}
      />
    );
  };

  it("renders accessible slider handles and the selection length", () => {
    setup();

    const startHandle = screen.getByRole("slider", {
      name: /clip start/iu,
    });
    const endHandle = screen.getByRole("slider", { name: /clip end/iu });
    expect(startHandle.getAttribute("aria-valuenow")).toBe("30");
    expect(endHandle.getAttribute("aria-valuenow")).toBe("60");
    expect(screen.getByTestId("clip-length-badge").textContent).toBe(
      "30s selected"
    );
  });

  it("moves handles with pointer drag and clamps to the clip rules", () => {
    const { getByRole } = setup();
    const startHandle = getByRole("slider", { name: /clip start/iu });

    // Pointer events are not captured in jsdom, so drive the handlers.
    fireEvent.pointerDown(startHandle, { clientX: 100 });
    fireEvent.pointerMove(startHandle, { clientX: 150 });
    fireEvent.pointerUp(startHandle);

    // 150px on a 400px track of 300s = 112.5s, above the end handle's
    // 45s floor (60s end minus 15s minimum): clamps to 45.
    expect(callbacks.onChange).toHaveBeenLastCalledWith({ end: 60, start: 45 });
    expect(callbacks.onScrub).toHaveBeenLastCalledWith(45);
  });

  it("adjusts handles with the keyboard", () => {
    const { getByRole } = setup();
    const endHandle = getByRole("slider", { name: /clip end/iu });

    fireEvent.keyDown(endHandle, { key: "ArrowRight", shiftKey: true });
    expect(callbacks.onChange).toHaveBeenLastCalledWith({ end: 65, start: 30 });

    fireEvent.keyDown(endHandle, { key: "End" });
    // End jumps as far as it can: 120s past a 30s start.
    expect(callbacks.onChange).toHaveBeenLastCalledWith({
      end: 150,
      start: 30,
    });
  });
});
