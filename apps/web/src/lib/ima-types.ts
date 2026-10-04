/**
 * Minimal typings for the Google IMA HTML5 SDK (`ima3.js`), which has no
 * bundled types. Only the members RallyCasts uses for Mux prerolls are
 * declared here. See https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side
 */

export interface ImaAdDisplayContainer {
  destroy: () => void;
  initialize: () => void;
}

export interface ImaAdsRequest {
  adTagUrl: string;
  linearAdSlotHeight: number;
  linearAdSlotWidth: number;
}

export interface ImaAdsManager {
  destroy: () => void;
  init: (width: number, height: number, viewMode: string) => void;
  start: () => void;
}

export interface ImaAdsManagerLoadedEvent {
  getAdsManager: (videoElement: HTMLVideoElement | null) => ImaAdsManager;
}

export interface ImaAdsLoader {
  contentComplete: () => void;
  destroy: () => void;
}

export interface ImaSdk {
  AdDisplayContainer: new (
    container: HTMLElement,
    videoElement?: HTMLVideoElement | null
  ) => ImaAdDisplayContainer;
  AdErrorEvent: { Type: { AD_ERROR: string } };
  AdEvent: {
    Type: {
      ALL_ADS_COMPLETED: string;
      CONTENT_PAUSE_REQUESTED: string;
      CONTENT_RESUME_REQUESTED: string;
    };
  };
  AdsLoader: new (container: ImaAdDisplayContainer) => ImaAdsLoader & {
    addEventListener: (
      type: string,
      handler: (event: ImaAdsManagerLoadedEvent) => void
    ) => void;
    requestAds: (request: ImaAdsRequest) => void;
  };
  AdsManagerLoadedEvent: { Type: { ADS_MANAGER_LOADED: string } };
  AdsRequest: new () => ImaAdsRequest;
  ViewMode: { NORMAL: string };
}

export interface ImaWindow {
  google?: { ima?: ImaSdk };
}

const IMA_SCRIPT_URL = "https://imasdk.googleapis.com/js/sdkloader/ima3.js";

let pendingLoad: Promise<ImaSdk> | null = null;

export const loadImaSdk = (): Promise<ImaSdk> => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IMA requires a browser window"));
  }
  const existing = (window as unknown as ImaWindow).google?.ima;
  if (existing) {
    return Promise.resolve(existing);
  }
  if (!pendingLoad) {
    // oxlint-disable-next-line promise/avoid-new -- script onload/onerror events expose no promise-based alternative.
    pendingLoad = new Promise<ImaSdk>((resolve, reject) => {
      const script = document.createElement("script");
      script.async = true;
      script.src = IMA_SCRIPT_URL;
      script.addEventListener("error", () => {
        pendingLoad = null;
        reject(new Error("Google IMA SDK failed to load"));
      });
      script.addEventListener("load", () => {
        const sdk = (window as unknown as ImaWindow).google?.ima;
        if (sdk) {
          resolve(sdk);
        } else {
          pendingLoad = null;
          reject(new Error("Google IMA SDK did not initialize"));
        }
      });
      // oxlint-disable-next-line unicorn/prefer-dom-node-append -- append() resolves to an incompatible ambient typing in this project; appendChild typechecks.
      document.head.appendChild(script);
    });
  }
  return pendingLoad;
};
