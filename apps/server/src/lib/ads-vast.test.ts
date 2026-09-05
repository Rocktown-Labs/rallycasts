import { describe, expect, it } from "vitest";

import {
  BEACON_TTL_MS,
  bucketSpendCents,
  hashViewer,
  signBeaconParams,
  verifyBeaconParams,
} from "./ads";
import {
  buildEmptyVast,
  buildVastResponse,
  countVastAds,
  isAllowedVastMediaUrl,
} from "./ads-vast";

const campaign = {
  cpmCents: 500,
  id: "camp-1",
  videoCpmCents: 1500,
} as Parameters<typeof buildVastResponse>[0]["campaign"];

const creative = {
  id: "cre-1",
} as Parameters<typeof buildVastResponse>[0]["creative"];

const trackingUrl = (event: string) => `https://ads.example.com/t?ev=${event}`;

describe("bucketSpendCents", () => {
  it("avoids fractional-cent drift with floor", () => {
    expect(bucketSpendCents(1, 500)).toBe(0);
    expect(bucketSpendCents(2, 500)).toBe(1);
    expect(bucketSpendCents(1000, 500)).toBe(500);
    expect(bucketSpendCents(1000, 1500)).toBe(1500);
  });
});

describe("VAST builder", () => {
  it("builds a VAST 4.2 preroll with tracking and skipoffset", () => {
    const xml = buildVastResponse({
      campaign,
      clickThrough: "https://rallycasts.com/events/e1",
      creative,
      durationSeconds: 12,
      impressionUrl: "https://ads.example.com/t?ev=impression",
      mediaFileUrl: "https://stream.mux.com/abc/medium.mp4",
      skipAfterSeconds: 5,
      title: "Spring Classic <Boost>",
      trackingUrl,
    });

    expect(countVastAds(xml)).toBe(1);
    expect(xml).toContain('<VAST version="4.2">');
    expect(xml).toContain("<Duration>00:00:12</Duration>");
    expect(xml).toContain('skipoffset="00:00:05"');
    expect(xml).toContain("<Duration>00:00:12</Duration>");
    expect(xml).toContain("Spring Classic &lt;Boost&gt;");
    for (const event of [
      "start",
      "firstQuartile",
      "midpoint",
      "thirdQuartile",
      "complete",
    ]) {
      expect(xml).toContain(`event="${event}"`);
    }
  });

  it("builds a valid empty VAST when no campaign is eligible", () => {
    const xml = buildEmptyVast();
    expect(countVastAds(xml)).toBe(0);
    expect(xml).toContain("<VAST");
  });
});

describe("isAllowedVastMediaUrl", () => {
  it("allows Mux progressive MP4s and first-party R2 MP4s", () => {
    expect(isAllowedVastMediaUrl("https://stream.mux.com/abc/medium.mp4")).toBe(
      true
    );
    expect(
      isAllowedVastMediaUrl("https://media.rallycasts.com/clips/a.mp4")
    ).toBe(true);
  });

  it("rejects third-party or non-MP4 media", () => {
    expect(isAllowedVastMediaUrl("https://evil.example.com/a.mp4")).toBe(false);
    expect(
      isAllowedVastMediaUrl("https://stream.mux.com/abc/stream.m3u8")
    ).toBe(false);
    expect(isAllowedVastMediaUrl("not-a-url")).toBe(false);
  });
});

describe("beacon signing", () => {
  it("signs and verifies tracking params, rejecting tampering and expiry", async () => {
    const secret = "test-beacon-secret";
    const base = {
      c: "camp-1",
      cr: "cre-1",
      ev: "impression" as const,
      exp: String(Date.now() + BEACON_TTL_MS),
      p: "preroll" as const,
    };
    const sig = await signBeaconParams(secret, base);
    await expect(verifyBeaconParams(secret, { ...base, sig })).resolves.toBe(
      true
    );
    await expect(
      verifyBeaconParams(secret, { ...base, c: "camp-2", sig })
    ).resolves.toBe(false);
    await expect(
      verifyBeaconParams(secret, { ...base, exp: String(Date.now() - 1), sig })
    ).resolves.toBe(false);
  });

  it("hashes viewer identity to an opaque short token", async () => {
    const hashed = await hashViewer("secret", "1.2.3.4", "TestAgent/1.0");
    expect(hashed).toMatch(/^[a-f\d]{16}$/u);
    await expect(hashViewer("secret", null, null)).resolves.toBeUndefined();
  });
});
