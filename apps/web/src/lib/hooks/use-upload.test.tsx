import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  MAX_IMAGE_BYTES,
  useImageUpload,
  validateImageFile,
} from "./use-upload";

const renderImageUploadHook = () => {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return renderHook(() => useImageUpload(), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
};

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

describe("useImageUpload", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends the selected file in the multipart request body", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          key: "images/abc.png",
          url: "https://media.example.com/images/abc.png",
        }),
      ok: true,
      status: 200,
      statusText: "OK",
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderImageUploadHook();
    const file = new File(["png-bytes"], "logo.png", { type: "image/png" });

    act(() => {
      result.current.mutate(file);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toEqual({
      key: "images/abc.png",
      url: "https://media.example.com/images/abc.png",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toContain("/api/v1/upload/image");

    // Regression guard: the hono client serializes `form` with
    // Object.entries, which silently drops FormData instances and ships an
    // empty multipart body (the server then logs missing_file). The body
    // must actually contain the selected file.
    const body = init.body as FormData;
    expect(body.get("file")).toBeInstanceOf(File);
    const sentFile = body.get("file") as File;
    expect(sentFile.name).toBe("logo.png");
    expect(sentFile.type).toBe("image/png");
  });

  it("rejects invalid files without issuing a request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderImageUploadHook();
    const file = new File(["x"], "notes.txt", { type: "text/plain" });

    act(() => {
      result.current.mutate(file);
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error?.message).toBe(
      "Only AVIF, JPEG, PNG, and WebP images are supported"
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
