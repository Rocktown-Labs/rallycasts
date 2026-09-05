import type { adCampaign, adCreative } from "@rallycaststv/db/schema/domain";

import type { AdEventKind, AdPlacement } from "./ads";

const escapeXml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const padDurationPart = (part: number) => String(part).padStart(2, "0");

const formatDuration = (seconds: number) => {
  const total = Math.max(1, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  return `${padDurationPart(hours)}:${padDurationPart(minutes)}:${padDurationPart(rest)}`;
};

export interface VastAdInput {
  adSystem?: string;
  campaign: typeof adCampaign.$inferSelect;
  clickThrough: string;
  creative: typeof adCreative.$inferSelect;
  durationSeconds: number;
  impressionUrl: string;
  mediaFileUrl: string;
  skipAfterSeconds?: number;
  title: string;
  trackingUrl: (event: AdEventKind) => string;
}

/**
 * Minimal VAST 4.2 response: one preroll `<Linear>` creative. IMA-compatible
 * fields only (Impression, TrackingEvents, VideoClicks). Sponsor media is a
 * progressive MP4 so the Google IMA HTML5 SDK can play it over Mux content.
 */
export const buildVastResponse = (input: VastAdInput): string => {
  const duration = formatDuration(input.durationSeconds);
  const skipOffset =
    input.skipAfterSeconds && input.skipAfterSeconds > 0
      ? ` skipoffset="${formatDuration(input.skipAfterSeconds)}"`
      : "";
  const quartileEvents: AdEventKind[] = [
    "start",
    "firstQuartile",
    "midpoint",
    "thirdQuartile",
    "complete",
  ];
  const tracking = quartileEvents
    .map(
      (event) =>
        `          <Tracking event="${event}"><![CDATA[${input.trackingUrl(event)}]]></Tracking>`
    )
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<VAST version="4.2">',
    `  <Ad id="${escapeXml(input.campaign.id)}">`,
    "    <InLine>",
    `      <AdSystem>${escapeXml(input.adSystem ?? "RallyCasts")}</AdSystem>`,
    `      <AdTitle>${escapeXml(input.title)}</AdTitle>`,
    `      <Impression><![CDATA[${input.impressionUrl}]]></Impression>`,
    "      <Creatives>",
    `        <Creative id="${escapeXml(input.creative.id)}">`,
    `          <Linear${skipOffset}>`,
    `            <Duration>${duration}</Duration>`,
    "            <TrackingEvents>",
    tracking,
    "            </TrackingEvents>",
    "            <VideoClicks>",
    `              <ClickThrough><![CDATA[${input.clickThrough}]]></ClickThrough>`,
    "            </VideoClicks>",
    "            <MediaFiles>",
    '              <MediaFile delivery="progressive" type="video/mp4" width="1280" height="720">',
    `                <![CDATA[${input.mediaFileUrl}]]>`,
    "              </MediaFile>",
    "            </MediaFiles>",
    "          </Linear>",
    "        </Creative>",
    "      </Creatives>",
    "    </InLine>",
    "  </Ad>",
    "</VAST>",
    "",
  ].join("\n");
};

/** Valid VAST with no ads: the player must play content uninterrupted. */
export const buildEmptyVast = (): string =>
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<VAST version="4.2">',
    "</VAST>",
    "",
  ].join("\n");

export const countVastAds = (xml: string): number =>
  (xml.match(/<Ad[\s>]/gu) ?? []).length;

/** Sponsor media must be a Mux-served progressive MP4 so IMA can play it. */
export const isAllowedVastMediaUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return (
      (parsed.protocol === "https:" &&
        parsed.hostname === "stream.mux.com" &&
        parsed.pathname.endsWith(".mp4")) ||
      (parsed.hostname.endsWith("media.rallycasts.com") &&
        parsed.pathname.endsWith(".mp4"))
    );
  } catch {
    return false;
  }
};

export type { AdPlacement };
export type CampaignRow = typeof adCampaign.$inferSelect;
export type CreativeRow = typeof adCreative.$inferSelect;
