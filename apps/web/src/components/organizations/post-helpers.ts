const IMAGE_MARKDOWN_REGEX =
  /!\[(?<alt>[^\]]*)\]\((?<url>https?:\/\/[^\s)]+)\)/gu;
const URL_IMAGE_REGEX =
  /(?<url>https?:\/\/[^\s]+\.(?:png|jpe?g|webp|gif|svg)(?:\?[^\s]*)?)/giu;

export interface ExtractedPostContent {
  cleanText: string;
  images: string[];
}

/**
 * Extracts all image URLs from a post's content (both markdown images and standalone image URLs)
 * and returns the cleaned text caption.
 */
export function parsePostContent(content: string): ExtractedPostContent {
  if (!content) {
    return { cleanText: "", images: [] };
  }

  const images: string[] = [];
  const seenImages = new Set<string>();

  // 1. Extract markdown image syntax: ![alt](url)
  const withoutMarkdown = content.replace(
    IMAGE_MARKDOWN_REGEX,
    (_, _alt, url) => {
      if (!seenImages.has(url)) {
        seenImages.add(url);
        images.push(url);
      }
      return "";
    }
  );

  // 2. Extract standalone image URLs if not already captured
  const cleanText = withoutMarkdown
    .replace(URL_IMAGE_REGEX, (url) => {
      if (!seenImages.has(url)) {
        seenImages.add(url);
        images.push(url);
        return "";
      }
      return "";
    })
    .trim();

  return {
    cleanText,
    images,
  };
}

/**
 * Formats a timestamp into friendly relative or calendar dates
 * e.g. "Just now", "4m ago", "3h ago", "Yesterday at 2:15 PM", "Oct 10 at 1:50 PM"
 */
export function formatTimeAgo(
  timestampInput?: string | number | Date | null
): string {
  if (!timestampInput) {
    return "Recently";
  }

  const date = new Date(timestampInput);
  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return "Just now";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays === 1) {
    return `Yesterday at ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return date.toLocaleDateString([], {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  });
}
