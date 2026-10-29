import { describe, expect, it } from "vitest";

import { createPlaybackTracker } from "./playback-tracking";

describe("playback watch time", () => {
  it("counts elapsed playback rather than the video position", () => {
    const tracker = createPlaybackTracker();
    expect(tracker.sample(0, 0, true, false)).toBe(0);
    expect(tracker.sample(1, 1000, true, false)).toBe(1);
    expect(tracker.sample(2, 2000, true, false)).toBe(2);
  });

  it("does not count seeks, pauses, or long background gaps", () => {
    const tracker = createPlaybackTracker();
    tracker.sample(0, 0, true, false);
    expect(tracker.sample(90, 1000, true, false)).toBe(0);
    expect(tracker.sample(95, 1200, true, true)).toBe(0);
    expect(tracker.sample(95, 2000, false, false)).toBe(0);
    tracker.sample(95, 3000, true, false);
    expect(tracker.sample(96, 4000, true, false)).toBe(1);
    expect(tracker.sample(156, 64_000, true, false)).toBe(1);
  });
});
