import { describe, expect, it } from "vitest";

import { MAX_IMAGE_BYTES, validateImageFile } from "./use-upload";

describe("validateImageFile", () => {
  it("accepts the supported image types", () => {
    for (const type of [
      "image/avif",
      "image/jpeg",
      "image/png",
      "image/webp",
    ]) {
      const file = new File([new Uint8Array(8)], "image", { type });
      expect(validateImageFile(file)).toBeNull();
    }
  });

  it("rejects unsupported types", () => {
    const file = new File([new Uint8Array(8)], "photo", {
      type: "image/heic",
    });
    expect(validateImageFile(file)).toBe(
      "Only AVIF, JPEG, PNG, and WebP images are supported"
    );
  });

  it("rejects files over 5MB", () => {
    const file = new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], "big.png", {
      type: "image/png",
    });
    expect(validateImageFile(file)).toBe("Image must be 5MB or smaller");
  });
});
