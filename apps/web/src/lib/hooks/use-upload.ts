import { useMutation } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";

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
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const res = await apiClient.api.v1.upload.image.$post({
        form: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to upload image");
      }

      return res.json();
    },
  });
}
