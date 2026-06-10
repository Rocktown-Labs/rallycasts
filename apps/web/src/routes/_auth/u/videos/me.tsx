import { Button } from "@rallycaststv/ui/components/button";
import { createFileRoute } from "@tanstack/react-router";
import { PlusCircle, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { EmptyState, VideoCard } from "@/components/rally/cards";
import { useMyVideos, useCreateVideo } from "@/lib/hooks";
import { useMuxUpload } from "@/lib/hooks/use-upload";

export const Route = createFileRoute("/_auth/u/videos/me")({
  component: VideosPage,
});

function UploadModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const muxUpload = useMuxUpload();
  const createVideo = useCreateVideo();

  if (!isOpen) {
    return null;
  }

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error("Please select a video file");
      return;
    }
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    setIsUploading(true);

    try {
      const { uploadUrl } = await muxUpload.mutateAsync();

      const uploadRes = await fetch(uploadUrl, {
        body: file,
        headers: {
          "Content-Type": file.type,
        },
        method: "PUT",
      });

      if (!uploadRes.ok) {
        throw new Error("Upload to Mux failed");
      }

      await createVideo.mutateAsync({
        description: description || undefined,
        mediaType: "video",
        title: title.trim(),
        visibility: "public",
      });

      toast.success(
        "Video uploaded successfully! Processing will begin shortly."
      );
      onClose();
      setTitle("");
      setDescription("");
      if (fileRef.current) {
        fileRef.current.value = "";
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-xl p-6 space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Upload className="size-5" /> Upload Video
        </h2>

        <div className="space-y-2">
          <label htmlFor="videoTitle" className="text-sm font-semibold">
            Title
          </label>
          <input
            id="videoTitle"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter video title"
            aria-label="Video title"
            className="w-full p-2.5 bg-card border border-border rounded-md text-sm focus:ring-1 focus:ring-primary focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="videoDescription" className="text-sm font-semibold">
            Description
          </label>
          <textarea
            id="videoDescription"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter description (optional)"
            aria-label="Video description"
            rows={3}
            className="w-full p-2.5 bg-card border border-border rounded-md text-sm focus:ring-1 focus:ring-primary focus:outline-none resize-none"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="videoFile" className="text-sm font-semibold">
            Video File
          </label>
          <input
            id="videoFile"
            ref={fileRef}
            type="file"
            accept="video/*"
            aria-label="Video file"
            className="w-full p-2.5 bg-card border border-border rounded-md text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 rounded-lg text-xs"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={isUploading}
            className="flex-1 rounded-lg text-xs font-semibold"
          >
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function VideosPage() {
  const { data, isLoading } = useMyVideos();
  const videos = data?.videos ?? [];
  const [showUpload, setShowUpload] = useState(false);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Your Videos</h1>
          <div className="mt-6 flex rounded-md bg-muted p-1">
            <Button className="rounded-md" size="sm">
              All Videos
            </Button>
            <Button size="sm" variant="ghost">
              Public
            </Button>
            <Button size="sm" variant="ghost">
              Private
            </Button>
          </div>
        </div>
        <Button
          className="rounded-md text-xs"
          onClick={() => setShowUpload(true)}
        >
          <PlusCircle className="size-4" />
          Upload New Video
        </Button>
      </div>
      <UploadModal isOpen={showUpload} onClose={() => setShowUpload(false)} />
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-64 animate-pulse rounded-lg bg-muted"
            />
          ))}
        </div>
      ) : null}
      {videos.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      ) : (
        <EmptyState
          message="Upload or process a Mux video and it will appear in your studio library."
          title="No videos yet"
        />
      )}
    </div>
  );
}
