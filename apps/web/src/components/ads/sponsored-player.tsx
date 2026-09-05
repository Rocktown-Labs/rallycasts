import MuxPlayer from "@mux/mux-player-react/lazy";
import { env } from "@rallycaststv/env/web";
import { Play, Video as VideoIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { loadImaSdk } from "@/lib/ima-types";
import type { ImaAdsManager } from "@/lib/ima-types";

interface Playable {
  pause: () => void;
  play: () => Promise<void> | void;
}

export interface SponsoredPlayerAdContext {
  city?: string | null;
  skillLevel?: string | null;
  state?: string | null;
  venueId?: string | null;
}

interface SponsoredPlayerProps {
  adContext?: SponsoredPlayerAdContext;
  poster?: string;
  playbackId: string;
  title: string;
  videoId: string;
  viewerId?: string;
}

type Phase = "ad" | "content" | "poster";

/**
 * Mux Player with RallyCasts-preroll support. On play we ask our own
 * VAST ad server (`GET /api/v1/ads/vast`) for one preroll; when it returns
 * an empty VAST (or IMA is blocked) the content plays with no interruption.
 * Impressions, quartiles, and clicks are reported by IMA tracking pixels,
 * so the client sends no ad beacons itself.
 */
export function SponsoredPlayer({
  adContext,
  poster,
  playbackId,
  title,
  videoId,
  viewerId,
}: SponsoredPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const adContainerRef = useRef<HTMLDivElement | null>(null);
  const adVideoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<Playable | null>(null);
  const managerRef = useRef<ImaAdsManager | null>(null);
  const [phase, setPhase] = useState<Phase>("poster");

  const playContent = useCallback(() => {
    setPhase("content");
    const attemptPlay = async () => {
      try {
        await playerRef.current?.play();
      } catch {
        // Autoplay policies may still block; controls remain available.
      }
    };
    void attemptPlay();
  }, []);

  const endAd = useCallback(() => {
    try {
      managerRef.current?.destroy();
    } catch {
      // Destroy is best-effort; content still resumes.
    }
    managerRef.current = null;
    playContent();
  }, [playContent]);

  useEffect(
    () => () => {
      try {
        managerRef.current?.destroy();
      } catch {
        // Unmount cleanup is best-effort.
      }
      managerRef.current = null;
    },
    []
  );

  const handlePlay = useCallback(async () => {
    const params = new URLSearchParams({ videoId });
    if (adContext?.city) {
      params.set("city", adContext.city);
    }
    if (adContext?.state) {
      params.set("state", adContext.state);
    }
    if (adContext?.skillLevel) {
      params.set("skillLevel", adContext.skillLevel);
    }
    if (adContext?.venueId) {
      params.set("venueId", adContext.venueId);
    }
    const adTagUrl = `${env.VITE_SERVER_URL}/api/v1/ads/vast?${params.toString()}`;

    let vast: string | null = null;
    try {
      const response = await fetch(adTagUrl, { credentials: "omit" });
      vast = await response.text();
    } catch {
      vast = null;
    }
    if (!vast || !(vast.includes("<Ad ") || vast.includes("<Ad>"))) {
      playContent();
      return;
    }

    const adContainer = adContainerRef.current;
    const adVideo = adVideoRef.current;
    const container = containerRef.current;
    if (!(adContainer && adVideo && container)) {
      playContent();
      return;
    }

    let sdk;
    try {
      sdk = await loadImaSdk();
    } catch {
      playContent();
      return;
    }

    try {
      setPhase("ad");
      const displayContainer = new sdk.AdDisplayContainer(adContainer, adVideo);
      displayContainer.initialize();
      const loader = new sdk.AdsLoader(displayContainer);
      loader.addEventListener(
        sdk.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
        (loaded) => {
          const width = container.clientWidth || 640;
          const height = container.clientHeight || 360;
          const manager = loaded.getAdsManager(null);
          managerRef.current = manager;
          const adsManager = manager as ImaAdsManager & {
            addEventListener(type: string, handler: () => void): void;
          };
          adsManager.addEventListener(
            sdk.AdEvent.Type.CONTENT_PAUSE_REQUESTED,
            () => playerRef.current?.pause()
          );
          adsManager.addEventListener(
            sdk.AdEvent.Type.CONTENT_RESUME_REQUESTED,
            endAd
          );
          adsManager.addEventListener(
            sdk.AdEvent.Type.ALL_ADS_COMPLETED,
            endAd
          );
          adsManager.init(width, height, sdk.ViewMode.NORMAL);
          adsManager.start();
        }
      );
      const errorLoader = loader as unknown as {
        addEventListener(type: string, handler: () => void): void;
      };
      errorLoader.addEventListener(sdk.AdErrorEvent.Type.AD_ERROR, endAd);
      const request = new sdk.AdsRequest();
      request.adTagUrl = adTagUrl;
      request.linearAdSlotWidth = container.clientWidth || 640;
      request.linearAdSlotHeight = container.clientHeight || 360;
      loader.requestAds(request);
    } catch {
      endAd();
    }
  }, [adContext, endAd, playContent, videoId]);

  return (
    <div
      className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-black shadow-lg"
      ref={containerRef}
    >
      <div className={phase === "ad" ? "invisible" : "visible"}>
        <MuxPlayer
          accentColor="hsl(var(--primary))"
          metadata={{
            player_name: "rallycasts-watch",
            video_id: videoId,
            video_title: title,
            ...(viewerId ? { viewer_user_id: viewerId } : {}),
          }}
          poster={poster}
          playbackId={playbackId}
          ref={(element) => {
            playerRef.current = element as unknown as Playable | null;
          }}
          style={{ aspectRatio: "16 / 9", width: "100%" }}
        />
      </div>

      <div
        className={
          phase === "ad"
            ? "absolute inset-0 bg-black"
            : "pointer-events-none absolute inset-0 hidden"
        }
        ref={adContainerRef}
      >
        <video
          className="size-full"
          playsInline
          ref={adVideoRef}
          aria-label="Advertisement"
        >
          <track kind="captions" />
        </video>
      </div>

      {phase === "poster" ? (
        <button
          aria-label={`Play ${title}`}
          className="absolute inset-0 z-10 flex size-full cursor-pointer items-center justify-center border-none bg-black/40 p-0 transition-all hover:bg-black/30"
          onClick={() => void handlePlay()}
          type="button"
        >
          {poster ? (
            <img
              alt=""
              className="absolute inset-0 size-full object-contain"
              src={poster}
            />
          ) : (
            <span className="flex flex-col items-center gap-3 text-white">
              <VideoIcon className="size-12 text-[#bcdf21]" />
            </span>
          )}
          <span className="relative flex size-16 items-center justify-center rounded-full bg-primary/95 text-primary-foreground shadow-xl transition-transform duration-200 hover:scale-110">
            <Play className="ml-1 size-8 fill-current" />
          </span>
        </button>
      ) : null}
    </div>
  );
}
