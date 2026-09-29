import { useLiveQuery } from "@tanstack/react-db";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

import { readApiJson } from "@/lib/hooks/api";

import { getConversationMessagesCollection } from "./conversations";
import type { MessageItem } from "./conversations";

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    api: {
      v1: {
        social: {
          conversations: {
            ":id": {
              messages: {
                $get: vi.fn(),
                $post: vi.fn(),
              },
            },
          },
        },
      },
    },
  },
}));

vi.mock("@/lib/hooks/api", () => ({
  readApiJson: vi.fn(),
}));

const realMessage = (id: string): MessageItem => ({
  $synced: true,
  message: {
    body: `server message ${id}`,
    conversationId: "conv-1",
    createdAt: "2026-09-29T00:00:00.000Z",
    id,
    senderUserId: "user-b",
  },
  sender: {
    id: "user-b",
    name: "Bob",
  },
});

const renderProbe = (
  qc: QueryClient,
  collection: ReturnType<typeof getConversationMessagesCollection>
) => {
  const container = document.createElement("div");
  // oxlint-disable-next-line unicorn/prefer-dom-node-append
  document.body.appendChild(container);

  const seen: MessageItem[][] = [];
  const Probe = () => {
    const { data } = useLiveQuery(collection);
    const messages = (data ?? []) as MessageItem[];
    const last = seen.at(-1);
    const unchanged =
      last &&
      last.length === messages.length &&
      last.every(
        (item, index) => item.message.id === messages[index]?.message.id
      );
    if (!unchanged) {
      seen.push(messages);
    }
    return null;
  };

  const root = createRoot(container);
  root.render(
    <QueryClientProvider client={qc}>
      <Probe />
    </QueryClientProvider>
  );
  return {
    get seen() {
      return seen;
    },
    unmount() {
      root.unmount();
      container.remove();
    },
  };
};

describe("conversation messages collection sync", () => {
  it("resolves the optimistic temp record into the server message without a duplicate", async () => {
    const qc = new QueryClient();
    const collection = getConversationMessagesCollection(qc, "conv-1");

    vi.mocked(readApiJson).mockResolvedValue({
      messages: [realMessage("server-1")],
    });

    const probe = renderProbe(qc, collection);

    // Wait for the initial query to load.
    await vi.waitFor(() => {
      expect(probe.seen.at(-1)?.map((item) => item.message.id)).toEqual([
        "server-1",
      ]);
    });

    const temp: MessageItem = {
      $synced: false,
      message: {
        body: "optimistic hello",
        conversationId: "conv-1",
        createdAt: new Date().toISOString(),
        id: "temp-1",
        senderUserId: "user-a",
      },
      sender: {
        id: "user-a",
        name: "Alice",
      },
    };

    // Simulate the send: optimistic insert goes through onInsert + refetch.
    await collection.insert(temp);

    await vi.waitFor(() => {
      const latest = probe.seen.at(-1) ?? [];
      expect(latest.map((item) => item.message.id)).toEqual(["server-1"]);
      // No stale optimistic "Sending…" row may survive the reconciliation.
      expect(latest.some((item) => item.$synced === false)).toBe(false);
    });

    probe.unmount();
  });
});
