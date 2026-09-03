import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { useInfiniteVideos } from "./use-videos";

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    api: {
      v1: {
        videos: {
          $get: vi.fn(() =>
            Promise.resolve(
              Response.json(
                { message: "Demo fallback" },
                { status: 503, statusText: "Unavailable" }
              )
            )
          ),
        },
      },
    },
  },
}));

describe("useInfiniteVideos", () => {
  it("surfaces API failures instead of fabricating demo pages", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useInfiniteVideos(12), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
    expect(result.current.isSuccess).toBe(false);
  });
});
