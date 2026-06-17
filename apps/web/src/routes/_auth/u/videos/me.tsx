import { Button } from "@rallycaststv/ui/components/button";
import { createFileRoute } from "@tanstack/react-router";
import { PlusCircle, Upload, Search, X, MapPin, Users } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { EmptyState, VideoCard } from "@/components/rally/cards";
import { apiClient } from "@/lib/api-client";
import { useMyVideos, useCreateVideo } from "@/lib/hooks";
import { useMuxUpload } from "@/lib/hooks/use-upload";

export const Route = createFileRoute("/_auth/u/videos/me")({
  component: VideosPage,
});

interface Player {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
}

interface Place {
  placeId: string;
  name: string;
  address: string;
}

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

  // Tagging states
  const [playerQuery, setPlayerQuery] = useState("");
  const [playerResults, setPlayerResults] = useState<Player[]>([]);
  const [taggedPlayers, setTaggedPlayers] = useState<Player[]>([]);

  const [placeQuery, setPlaceQuery] = useState("");
  const [placeResults, setPlaceResults] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  const muxUpload = useMuxUpload();
  const createVideo = useCreateVideo();

  if (!isOpen) {
    return null;
  }

  const handlePlayerSearch = async (val: string) => {
    setPlayerQuery(val);
    if (val.trim().length < 2) {
      setPlayerResults([]);
      return;
    }
    try {
      const res = await apiClient.api.players.$get({ query: { q: val } });
      if (res.ok) {
        const data = await res.json();
        // filter out already tagged players
        setPlayerResults(
          data.players.filter(
            (p) => !taggedPlayers.some((tp) => tp.id === p.id)
          )
        );
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handlePlaceSearch = async (val: string) => {
    setPlaceQuery(val);
    if (val.trim().length < 2) {
      setPlaceResults([]);
      return;
    }
    try {
      const res = await apiClient.api.places.search.$get({ query: { q: val } });
      if (res.ok) {
        const data = await res.json();
        setPlaceResults(data.places);
      }
    } catch (error) {
      console.error(error);
    }
  };

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
      let venueId: string | null = null;
      if (selectedPlace) {
        // Resolve google place to venue in DB
        const venueRes = await fetch("/api/places/venues", {
          body: JSON.stringify({ placeId: selectedPlace.placeId }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        });

        if (venueRes.ok || venueRes.status === 409) {
          const venueData = (await venueRes.json()) as {
            venue: { id: string };
          };
          venueId = venueData.venue.id;
        } else {
          toast.warning(
            "Could not associate location, video will upload without place tag."
          );
        }
      }

      const { uploadId, uploadUrl } = await muxUpload.mutateAsync();

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
        muxUploadId: uploadId,
        status: "uploading",
        taggedUserIds: taggedPlayers.map((p) => p.id),
        title: title.trim(),
        venueId,
        visibility: "public",
      });

      toast.success(
        "Video uploaded successfully! Processing will begin shortly."
      );
      onClose();
      setTitle("");
      setDescription("");
      setTaggedPlayers([]);
      setSelectedPlace(null);
      setPlayerQuery("");
      setPlaceQuery("");
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
      <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
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
            rows={2}
            className="w-full p-2.5 bg-card border border-border rounded-md text-sm focus:ring-1 focus:ring-primary focus:outline-none resize-none"
          />
        </div>

        {/* Tagged Location */}
        <div className="space-y-2 relative">
          <label
            htmlFor="placeSearchInput"
            className="text-sm font-semibold flex items-center gap-1.5"
          >
            <MapPin className="size-4 text-muted-foreground" /> Location (Tag
            Place)
          </label>
          {selectedPlace ? (
            <div className="flex items-center justify-between p-2.5 bg-accent/20 border border-primary/20 rounded-md text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="size-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold truncate text-xs">
                    {selectedPlace.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {selectedPlace.address}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 rounded-full shrink-0"
                onClick={() => setSelectedPlace(null)}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <input
                id="placeSearchInput"
                type="text"
                value={placeQuery}
                onChange={(e) => handlePlaceSearch(e.target.value)}
                placeholder="Search courts or parks..."
                aria-label="Search courts or parks for location"
                className="w-full pl-9 pr-4 p-2.5 bg-card border border-border rounded-md text-sm focus:ring-1 focus:ring-primary focus:outline-none"
              />
              {placeResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto bg-card border border-border rounded-md shadow-lg z-50 divide-y divide-border">
                  {placeResults.map((place) => (
                    <button
                      key={place.placeId}
                      type="button"
                      onClick={() => {
                        setSelectedPlace(place);
                        setPlaceResults([]);
                        setPlaceQuery("");
                      }}
                      className="w-full text-left p-2.5 hover:bg-muted/80 text-xs transition-colors flex flex-col gap-0.5"
                    >
                      <span className="font-semibold text-foreground">
                        {place.name}
                      </span>
                      <span className="text-muted-foreground truncate">
                        {place.address}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tagged Players */}
        <div className="space-y-2 relative">
          <label
            htmlFor="playerSearchInput"
            className="text-sm font-semibold flex items-center gap-1.5"
          >
            <Users className="size-4 text-muted-foreground" /> Tag Friends /
            Players
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <input
              id="playerSearchInput"
              type="text"
              value={playerQuery}
              onChange={(e) => handlePlayerSearch(e.target.value)}
              placeholder="Search players by name or @username..."
              aria-label="Search players by name or username to tag"
              className="w-full pl-9 pr-4 p-2.5 bg-card border border-border rounded-md text-sm focus:ring-1 focus:ring-primary focus:outline-none"
            />
            {playerResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto bg-card border border-border rounded-md shadow-lg z-50 divide-y divide-border">
                {playerResults.map((player) => (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => {
                      setTaggedPlayers([...taggedPlayers, player]);
                      setPlayerResults([]);
                      setPlayerQuery("");
                    }}
                    className="w-full text-left p-2.5 hover:bg-muted/80 text-xs transition-colors flex items-center gap-3"
                  >
                    <div className="size-6 rounded-full bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                      {player.image ? (
                        <img
                          src={player.image}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <Users className="size-3 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {player.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        @{player.username}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {taggedPlayers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {taggedPlayers.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center gap-1 pl-2 pr-1.5 py-1 bg-accent/20 border border-border rounded-full text-xs font-medium"
                >
                  <span>@{player.username || player.name}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setTaggedPlayers(
                        taggedPlayers.filter((p) => p.id !== player.id)
                      )
                    }
                    className="size-4 rounded-full flex items-center justify-center hover:bg-accent/40 text-muted-foreground hover:text-foreground transition-colors animate-fade-in"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
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
            className="w-full p-2.5 bg-card border border-border rounded-md text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
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
