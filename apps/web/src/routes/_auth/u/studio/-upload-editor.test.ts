import { describe, expect, it } from "vitest";

import {
  buildEditRecipe,
  buildStitchedSegments,
  findNextSegmentStart,
  remapTimestampToStitched,
  segmentsOverlap,
} from "./-upload-editor";

describe("multi-segment stitching math (#85 phase 2)", () => {
  it("orders segments by source time and assigns contiguous output offsets", () => {
    const stitched = buildStitchedSegments([
      { end: 180, start: 120 },
      { end: 60, start: 30 },
    ]);

    expect(stitched).toEqual([
      { end: 60, outputStart: 0, start: 30 },
      { end: 180, outputStart: 30, start: 120 },
    ]);
  });

  it("remaps timestamps inside segments and drops everything else", () => {
    const SECOND = 1;
    const stitched = buildStitchedSegments([
      { end: 45, start: 30 },
      { end: 150, start: 120 },
    ]);

    // Inside the first segment: shifted back to its output start.
    expect(remapTimestampToStitched(31, stitched)).toBe(1 * SECOND);
    // Inside the second segment: continues right after the first (15s).
    expect(remapTimestampToStitched(121, stitched)).toBe(16 * SECOND);
    // The gap between segments is dropped.
    expect(remapTimestampToStitched(60, stitched)).toBeNull();
    // Before and after all segments are dropped too.
    expect(remapTimestampToStitched(5, stitched)).toBeNull();
    expect(remapTimestampToStitched(200, stitched)).toBeNull();
    // The segment end itself belongs to the next frame, so it drops.
    expect(remapTimestampToStitched(45, stitched)).toBeNull();
  });

  it("finds the next segment start for preview skipping", () => {
    const stitched = buildStitchedSegments([
      { end: 20, start: 10 },
      { end: 100, start: 80 },
    ]);

    expect(findNextSegmentStart(5, stitched)).toBe(10);
    expect(findNextSegmentStart(25, stitched)).toBe(80);
    // After the last segment there is nothing to skip to.
    expect(findNextSegmentStart(150, stitched)).toBeNull();
  });

  it("detects overlapping candidate segments", () => {
    const existing = [
      { end: 60, start: 30 },
      { end: 200, start: 180 },
    ];

    // Crosses the first segment's end.
    expect(segmentsOverlap({ end: 70, start: 50 }, existing)).toBe(true);
    // Nested inside the second segment.
    expect(segmentsOverlap({ end: 185, start: 175 }, existing)).toBe(true);
    // Sits entirely in the gap.
    expect(segmentsOverlap({ end: 170, start: 100 }, existing)).toBe(false);
  });
});

describe("buildEditRecipe (#85 recipe storage)", () => {
  const baseState = {
    duration: 300,
    rotation: 0 as const,
    segments: [],
    selection: { end: 300, start: 0 },
  };

  it("returns null for an untouched video", () => {
    expect(buildEditRecipe(baseState)).toBeNull();
  });

  it("normalizes a single-range trim into one explicit segment", () => {
    const recipe = buildEditRecipe({
      ...baseState,
      selection: { end: 120.456, start: 30 },
    });

    expect(recipe).toEqual({
      rotation: 0,
      segments: [{ end: 120.46, start: 30 }],
      sourceDurationSeconds: 300,
      version: 1,
    });
  });

  it("sorts and clamps multi-segment recipes", () => {
    const recipe = buildEditRecipe({
      ...baseState,
      rotation: 90,
      segments: [
        // Clamped to duration.
        { end: 400, start: 180 },
        { end: 45, start: 30 },
      ],
      selection: { end: 1, start: 0 },
    });

    expect(recipe?.rotation).toBe(90);
    expect(recipe?.segments).toEqual([
      { end: 45, start: 30 },
      { end: 300, start: 180 },
    ]);
    expect(recipe?.sourceDurationSeconds).toBe(300);
    expect(recipe?.version).toBe(1);
  });
});
