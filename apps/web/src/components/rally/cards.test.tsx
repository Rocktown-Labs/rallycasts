import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RallyClipCard, VideoCard } from "./cards";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    params: _params,
    to,
    ...props
  }: {
    children: ReactNode;
    params?: unknown;
    to?: string;
  } & Record<string, unknown>) => (
    <a {...props} href={String(to)}>
      {children}
    </a>
  ),
}));

const baseVideo = {
  id: "clip-uuid-1",
  muxPlaybackId: "playback123",
  title: "Kitchen showdown",
};

const mockMatchMedia = (overrides?: {
  hover?: boolean;
  reduceMotion?: boolean;
}) => {
  const hover = overrides?.hover ?? true;
  const reduceMotion = overrides?.reduceMotion ?? false;
  vi.stubGlobal("matchMedia", (query: string) => {
    const matches = query.includes("hover") ? hover : reduceMotion;
    return {
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches,
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    };
  });
};

const findPreview = () =>
  document.querySelector<HTMLImageElement>(
    'img[aria-hidden="true"][src*="animated.webp"]'
  );

const getThumbnailLink = (label: RegExp) => {
  const links = screen.getAllByRole("link", { name: label });
  // The thumbnail link renders first in both card types.
  return links[0] as HTMLElement;
};

const dwell = (ms = 500) => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};

describe("hover video previews", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockMatchMedia();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    cleanup();
  });

  it("starts the animated preview after dwelling on a video card", () => {
    render(<VideoCard video={baseVideo} />);
    const link = getThumbnailLink(/kitchen showdown/iu);
    fireEvent.pointerEnter(link);
    expect(findPreview()).toBeNull();

    dwell();
    const preview = findPreview();
    expect(preview).not.toBeNull();
    expect(preview?.src).toContain("image.mux.com/playback123/animated.webp");
  });

  it("stops the preview when the pointer leaves", () => {
    render(<VideoCard video={baseVideo} />);
    const link = getThumbnailLink(/kitchen showdown/iu);
    fireEvent.pointerEnter(link);
    dwell();
    expect(findPreview()).not.toBeNull();

    fireEvent.pointerLeave(link);
    expect(findPreview()).toBeNull();
  });

  it("does not start a dwell timer for cards without playback", () => {
    render(<VideoCard video={{ ...baseVideo, muxPlaybackId: null }} />);
    const link = getThumbnailLink(/kitchen showdown/iu);
    fireEvent.pointerEnter(link);
    dwell();
    expect(findPreview()).toBeNull();
  });

  it("does not preview when the visitor prefers reduced motion", () => {
    mockMatchMedia({ reduceMotion: true });
    render(<RallyClipCard video={baseVideo} />);
    const link = getThumbnailLink(/kitchen showdown/iu);
    fireEvent.pointerEnter(link);
    dwell();
    expect(findPreview()).toBeNull();
  });

  it("previews short cards too", () => {
    render(<RallyClipCard video={baseVideo} />);
    const link = getThumbnailLink(/kitchen showdown/iu);
    fireEvent.pointerEnter(link);
    dwell();
    expect(findPreview()?.src).toContain("animated.webp");
  });
});
