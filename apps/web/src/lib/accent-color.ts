/**
 * Accent-color helpers for tournament branding. Organizers pick any hex
 * color, so text sitting on (or tinted by) the accent must compute its own
 * contrast instead of assuming a dark brand color.
 */

/** Linearized RGB channel per WCAG. */
const toLinearChannel = (value: number): number => {
  const channel = value / 255;
  return channel <= 0.03928
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
};

/** WCAG relative luminance for a #rrggbb hex color. */
export const accentLuminance = (hex: string): number => {
  const normalized = hex.replace("#", "");
  const channels = [0, 2, 4].map((offset) =>
    Number.parseInt(normalized.slice(offset, offset + 2), 16)
  );
  const [r, g, b] = channels.map(toLinearChannel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** Gold-level accents are "light" for contrast purposes. */
export const isLightAccent = (hex: string): boolean =>
  accentLuminance(hex) > 0.45;

/** Text color that stays legible on a solid accent background. */
export const accentForeground = (hex: string): string =>
  isLightAccent(hex) ? "#111827" : "#ffffff";

/** Readable accent-derived text for use on faint accent tints. */
export const accentText = (hex: string): string => {
  if (!isLightAccent(hex)) {
    return hex;
  }
  const normalized = hex.replace("#", "");
  const darkened = [0, 2, 4].map((offset) =>
    Math.round(Number.parseInt(normalized.slice(offset, offset + 2), 16) * 0.55)
  );
  return `#${darkened
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
};
