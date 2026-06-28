import { describe, expect, it } from "vitest";

import { demoVideos, getDemoVideoDetail, getDemoVideoPage } from "./demo-data";

describe("demo video discovery", () => {
  it("provides enough deterministic videos to exercise multiple pages", () => {
    expect(demoVideos.length).toBeGreaterThanOrEqual(40);

    const firstPage = getDemoVideoPage(undefined, 12);
    const secondPage = getDemoVideoPage(firstPage.nextCursor ?? undefined, 12);

    expect(firstPage.videos).toHaveLength(12);
    expect(secondPage.videos).toHaveLength(12);
    expect(secondPage.videos[0]?.id).not.toBe(firstPage.videos[0]?.id);
    expect(
      new Set([...firstPage.videos, ...secondPage.videos].map(({ id }) => id))
        .size
    ).toBe(24);
  });

  it("resolves demo cards into complete read-only detail records", () => {
    const detail = getDemoVideoDetail("demo-video-1");

    expect(detail).toMatchObject({
      isDemo: true,
      video: {
        id: "demo-video-1",
        visibility: "public",
      },
    });
    expect(detail?.owner?.username).toBe("cgstewart");
    expect(detail?.venue?.name).toBeTruthy();
    expect(detail?.relatedVideos).toHaveLength(8);
    expect(detail?.relatedVideos).not.toContainEqual(
      expect.objectContaining({ id: "demo-video-1" })
    );
  });
});
