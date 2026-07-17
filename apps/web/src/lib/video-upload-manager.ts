import { useSyncExternalStore } from "react";

import { apiClient } from "@/lib/api-client";

export type UploadPhase = "failed" | "idle" | "processing" | "uploading";

export interface VideoUploadState {
  error?: string;
  fileName?: string;
  phase: UploadPhase;
  progress: number;
}

interface StartUploadOptions {
  file: File;
  uploadUrl: string;
  videoId: string;
}

const idleState: VideoUploadState = { phase: "idle", progress: 0 };
let uploadStates = new Map<string, VideoUploadState>();
const listeners = new Set<() => void>();

const emitChange = () => {
  for (const listener of listeners) {
    listener();
  }
};

const setUploadState = (videoId: string, state: VideoUploadState) => {
  uploadStates = new Map(uploadStates).set(videoId, state);
  emitChange();
};

const reportUploadState = async (
  videoId: string,
  state: "failed" | "processing"
) => {
  await apiClient.api.v1.videos[":id"]["upload-state"].$post({
    json: { state },
    param: { id: videoId },
  });
};

const reportUploadStateSafely = async (
  videoId: string,
  state: "failed" | "processing"
) => {
  try {
    await reportUploadState(videoId, state);
  } catch {
    // The Mux webhook remains the source of truth if this status hint fails.
  }
};

export const startVideoUpload = ({
  file,
  uploadUrl,
  videoId,
}: StartUploadOptions) => {
  const request = new XMLHttpRequest();

  setUploadState(videoId, {
    fileName: file.name,
    phase: "uploading",
    progress: 0,
  });

  request.upload.addEventListener("progress", (event) => {
    if (!event.lengthComputable) {
      return;
    }

    setUploadState(videoId, {
      fileName: file.name,
      phase: "uploading",
      progress: Math.min(100, Math.round((event.loaded / event.total) * 100)),
    });
  });

  request.addEventListener("load", () => {
    if (request.status >= 200 && request.status < 300) {
      setUploadState(videoId, {
        fileName: file.name,
        phase: "processing",
        progress: 100,
      });
      void reportUploadStateSafely(videoId, "processing");
      return;
    }

    setUploadState(videoId, {
      error: "Mux could not accept this upload. You can safely try again.",
      fileName: file.name,
      phase: "failed",
      progress: 0,
    });
    void reportUploadStateSafely(videoId, "failed");
  });

  request.addEventListener("error", () => {
    setUploadState(videoId, {
      error: "The connection was interrupted while uploading.",
      fileName: file.name,
      phase: "failed",
      progress: 0,
    });
    void reportUploadStateSafely(videoId, "failed");
  });

  request.open("PUT", uploadUrl);
  if (file.type) {
    request.setRequestHeader("Content-Type", file.type);
  }
  request.send(file);
};

export const useVideoUploadState = (videoId: string) =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => uploadStates.get(videoId) ?? idleState,
    () => idleState
  );
