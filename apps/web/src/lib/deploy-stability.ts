/**
 * Helpers for surviving deploys that swap hashed client assets.
 *
 * Cloudflare static assets are served before the worker runs, so a request
 * for `/assets/*` that reaches the worker is a file that no longer exists:
 * usually a tab kept open across a deploy, or a brief mid-deploy window.
 * Falling through to SSR would answer with the HTML document, which the
 * browser refuses to run as a module ("'text/html' is not a valid
 * JavaScript MIME type") and the page dies. These helpers give that case a
 * clean 404 on the server and a self-healing reload on the client.
 */

const STATIC_ASSET_PATH_PREFIX = "/assets/";

export const isStaticAssetRequest = (request: Request): boolean =>
  new URL(request.url).pathname.startsWith(STATIC_ASSET_PATH_PREFIX);

export const staticAssetNotFoundResponse = (): Response =>
  new Response("Asset not found", {
    headers: {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8",
    },
    status: 404,
  });

const MODULE_LOAD_ERROR_PATTERNS = [
  "Failed to fetch dynamically imported module",
  "error loading dynamically imported module",
  "Importing a module script failed",
  "is not a valid JavaScript MIME type",
] as const;

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return typeof error === "string" ? error : "";
};

/** True when an error means a route chunk failed to load, not app logic. */
export const isModuleLoadError = (error: unknown): boolean => {
  const message = getErrorMessage(error);
  return MODULE_LOAD_ERROR_PATTERNS.some((pattern) =>
    message.includes(pattern)
  );
};

export const DEPLOY_RELOAD_STORAGE_KEY = "rallycasts:deploy-reload";

// A reload picks up the new asset manifest, so one attempt is enough. The
// window keeps a persistently broken deployment from causing a reload loop.
const DEPLOY_RELOAD_GUARD_WINDOW_MS = 10_000;

/**
 * Reports whether the page should hard-reload to pick up a freshly deployed
 * asset manifest, and records the attempt. Returns false when storage is
 * unavailable or a reload was already attempted recently.
 */
export const shouldReloadForNewDeploy = (): boolean => {
  try {
    const last = Number(
      globalThis.sessionStorage.getItem(DEPLOY_RELOAD_STORAGE_KEY) ?? 0
    );
    const now = Date.now();
    if (now - last < DEPLOY_RELOAD_GUARD_WINDOW_MS) {
      return false;
    }
    globalThis.sessionStorage.setItem(DEPLOY_RELOAD_STORAGE_KEY, String(now));
  } catch {
    // Storage can be unavailable (private mode, blocked cookies). Fall back
    // to the error screen's manual retry instead of an unchecked reload.
    return false;
  }
  return true;
};
