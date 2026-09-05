import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import {
  castingJobsCollection,
  conversationsCollection,
  getConversationMessagesCollection,
  getEventMatchesCollection,
  getVideoCommentsCollection,
  myVideosCollection,
  notificationsCollection,
} from "./index";

describe("TanStack DB Collections", () => {
  it("initializes global eager collections with valid identifiers", () => {
    expect(conversationsCollection.id).toBe("conversations");
    expect(notificationsCollection.id).toBe("notifications");
    expect(myVideosCollection.id).toBe("my-videos");
    expect(castingJobsCollection.id).toBe("casting-jobs");
  });

  it("creates and memoizes scoped conversation messages collection per QueryClient and ID", () => {
    const qc = new QueryClient();
    const col1 = getConversationMessagesCollection(qc, "conv-123");
    const col2 = getConversationMessagesCollection(qc, "conv-123");
    const colOther = getConversationMessagesCollection(qc, "conv-456");

    expect(col1.id).toBe("messages-conv-123");
    expect(col1).toBe(col2);
    expect(colOther.id).toBe("messages-conv-456");
    expect(col1).not.toBe(colOther);
  });

  it("creates and memoizes scoped video comments collection", () => {
    const qc = new QueryClient();
    const col1 = getVideoCommentsCollection(qc, "vid-100");
    const col2 = getVideoCommentsCollection(qc, "vid-100");

    expect(col1.id).toBe("comments-vid-100");
    expect(col1).toBe(col2);
  });

  it("creates and memoizes scoped event matches collection", () => {
    const qc = new QueryClient();
    const col1 = getEventMatchesCollection(qc, "event-999");
    const col2 = getEventMatchesCollection(qc, "event-999");

    expect(col1.id).toBe("event-matches-event-999");
    expect(col1).toBe(col2);
  });
});
