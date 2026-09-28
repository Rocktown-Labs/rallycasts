import { beforeEach, describe, expect, it } from "vitest";

import {
  DEPLOY_RELOAD_STORAGE_KEY,
  isModuleLoadError,
  isStaticAssetRequest,
  shouldReloadForNewDeploy,
  staticAssetNotFoundResponse,
} from "./deploy-stability";

describe("isStaticAssetRequest", () => {
  it("matches requests under /assets/", () => {
    expect(
      isStaticAssetRequest(
        new Request("https://rallycasts.com/assets/me-DKGTcT7b.js")
      )
    ).toBe(true);
    expect(
      isStaticAssetRequest(
        new Request("https://rallycasts.com/assets/index-BeMS2e3U.css")
      )
    ).toBe(true);
  });

  it("does not match page routes", () => {
    expect(
      isStaticAssetRequest(new Request("https://rallycasts.com/u/me"))
    ).toBe(false);
    expect(
      isStaticAssetRequest(new Request("https://rallycasts.com/assets"))
    ).toBe(false);
  });
});

describe("staticAssetNotFoundResponse", () => {
  it("returns a plain text 404 that is never cached", async () => {
    const response = staticAssetNotFoundResponse();

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toBe(
      "text/plain; charset=utf-8"
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.text()).toBe("Asset not found");
  });
});

describe("isModuleLoadError", () => {
  it("detects the production MIME type error", () => {
    expect(
      isModuleLoadError(
        new Error("'text/html' is not a valid JavaScript MIME type")
      )
    ).toBe(true);
  });

  it("detects dynamic import failures across browsers", () => {
    expect(
      isModuleLoadError(
        new Error(
          "Failed to fetch dynamically imported module: /assets/me-DKGTcT7b.js"
        )
      )
    ).toBe(true);
    expect(
      isModuleLoadError(new Error("error loading dynamically imported module"))
    ).toBe(true);
    expect(
      isModuleLoadError(new Error("Importing a module script failed."))
    ).toBe(true);
  });

  it("does not swallow unrelated errors", () => {
    expect(isModuleLoadError(new Error("Loader data mismatch"))).toBe(false);
    expect(isModuleLoadError("Not a module error")).toBe(false);
    expect(isModuleLoadError(null)).toBe(false);
    const missing: unknown = undefined;
    expect(isModuleLoadError(missing)).toBe(false);
  });
});

describe("shouldReloadForNewDeploy", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("allows one reload attempt, then holds off within the guard window", () => {
    expect(shouldReloadForNewDeploy()).toBe(true);
    expect(shouldReloadForNewDeploy()).toBe(false);
    expect(typeof sessionStorage.getItem(DEPLOY_RELOAD_STORAGE_KEY)).toBe(
      "string"
    );
  });

  it("allows another reload once the guard window has passed", () => {
    sessionStorage.setItem(
      DEPLOY_RELOAD_STORAGE_KEY,
      String(Date.now() - 11_000)
    );

    expect(shouldReloadForNewDeploy()).toBe(true);
  });
});
