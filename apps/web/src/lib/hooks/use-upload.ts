import { useMutation } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { readApiJson } from "@/lib/hooks/api";

/**
 * Mirrors the server limits in apps/server/src/routes/upload.ts so common
 * failures surface instantly with an actionable message instead of an opaque
 * request error.
 */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = new Set([
  "image/avif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

/** Returns the reason a file cannot be uploaded, or null when it is valid. */
export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return "Only AVIF, JPEG, PNG, and WebP images are supported";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "Image must be 5MB or smaller";
  }
  return null;
}

export function useMuxUpload() {
  return useMutation({
    mutationFn: async (json: {
      description?: string;
      mediaType?: "short" | "video";
      title: string;
      visibility?: "friends" | "private" | "public";
    }) => {
      const res = await apiClient.api.v1.upload.mux.$post({ json });

      if (!res.ok) {
        throw new Error("Failed to create Mux upload");
      }

      return res.json();
    },
  });
}

export function useMuxUploadStatus() {
  return useMutation({
    mutationFn: async (uploadId: string) => {
      const res = await apiClient.api.v1.upload.mux.status.$post({
        json: { uploadId },
      });

      if (!res.ok) {
        throw new Error("Failed to check upload status");
      }

      return res.json();
    },
  });
}

export function useImageUpload() {
  return useMutation({
    mutationFn: (file: File) => {
      const validationError = validateImageFile(file);
      if (validationError) {
        return Promise.reject(new Error(validationError));
      }

      const formData = new FormData();
      formData.append("file", file);

      // readApiJson surfaces the server's `message` on non-OK responses so
      // callers can show why an upload failed instead of a generic error.
      return readApiJson(
        apiClient.api.v1.upload.image.$post({ form: formData })
      ) as Promise<{
        key: string;
        url: string | null;
      }>;
    },
  });
}
