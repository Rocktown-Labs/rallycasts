import { describe, expect, it } from "vitest";

import {
  createRealtimeAccessToken,
  verifyRealtimeAccessToken,
} from "./realtime-auth";

describe("realtime access tokens", () => {
  it("binds a short-lived token to its user and resource", async () => {
    const token = await createRealtimeAccessToken("test-secret", {
      name: "Test Player",
      resourceId: "conversation-1",
      userId: "user-1",
    });

    await expect(
      verifyRealtimeAccessToken(
        token ?? undefined,
        "test-secret",
        "conversation-1",
        "user-1"
      )
    ).resolves.toMatchObject({
      name: "Test Player",
      resourceId: "conversation-1",
      userId: "user-1",
    });
    await expect(
      verifyRealtimeAccessToken(
        token ?? undefined,
        "test-secret",
        "conversation-2",
        "user-1"
      )
    ).resolves.toBeNull();
  });

  it("rejects tampered tokens and invalid lifetimes", async () => {
    const token = await createRealtimeAccessToken("test-secret", {
      name: "Test Player",
      resourceId: "conversation-1",
      userId: "user-1",
    });

    const [payload, signature] = token?.split(".") ?? [];
    const tamperedSignature = signature
      ? `${signature.startsWith("a") ? "b" : "a"}${signature.slice(1)}`
      : "";
    await expect(
      verifyRealtimeAccessToken(
        `${payload}.${tamperedSignature}`,
        "test-secret",
        "conversation-1"
      )
    ).resolves.toBeNull();
    await expect(
      createRealtimeAccessToken(
        "test-secret",
        { name: "Test Player", resourceId: "conversation-1", userId: "user-1" },
        0
      )
    ).resolves.toBeNull();
  });
});
