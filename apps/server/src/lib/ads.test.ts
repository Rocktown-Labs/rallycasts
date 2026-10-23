import type { createDb } from "@rallycaststv/db";
import { describe, expect, it, vi } from "vitest";

import { decideAds } from "./ads";

describe("decideAds fault tolerance", () => {
  it("returns an empty array and does not throw when candidate query fails with a D1 internal error", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const mockDb = {
      select: vi.fn().mockImplementation(() => {
        throw new Error(
          "D1_ERROR: internal error; reference = e_Gz3hrU_e4d9c3c5db3a4315801d2c83468f1edc"
        );
      }),
    } as unknown as ReturnType<typeof createDb>;

    const results = await decideAds(mockDb, { placement: "display" });
    expect(results).toEqual([]);
    expect(errorSpy).toHaveBeenCalledWith(
      "Ad decision candidate query failed:",
      expect.any(Error)
    );
    errorSpy.mockRestore();
  });

  it("retries once when a transient D1 error occurs and succeeds if the retry succeeds", async () => {
    let callCount = 0;
    const fakeChain = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockImplementation(() => {
        callCount += 1;
        if (callCount === 1) {
          throw new Error(
            "D1_ERROR: internal error; reference = transient_test"
          );
        }
        return Promise.resolve([]);
      }),
    };

    const mockDb = {
      select: vi.fn().mockReturnValue(fakeChain),
    } as unknown as ReturnType<typeof createDb>;

    const results = await decideAds(mockDb, { placement: "display" });
    expect(callCount).toBe(2);
    expect(results).toEqual([]);
  });

  it("returns an empty array when daily stats query fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const fakeCandidate = {
      campaign: {
        city: null,
        cpmCents: 500,
        createdAt: new Date(),
        createdByUserId: null,
        dailyBudgetCents: 1000,
        endsAt: null,
        eventId: "event-1",
        fundedCents: 5000,
        id: "camp-1",
        name: "Test Campaign",
        placements: "both" as const,
        rejectionReason: null,
        reviewedAt: null,
        reviewedByUserId: null,
        skillLevel: null,
        spentCents: 0,
        startsAt: null,
        state: null,
        status: "active" as const,
        totalBudgetCents: 5000,
        updatedAt: new Date(),
        venueId: null,
        videoCpmCents: 1500,
      },
      creative: {
        body: "Body",
        campaignId: "camp-1",
        createdAt: new Date(),
        ctaPath: null,
        id: "creative-1",
        imageUrl: null,
        kind: "display" as const,
        status: "active" as const,
        title: "Test Creative",
        updatedAt: new Date(),
        videoId: null,
      },
      event: {
        bracketType: "single_elimination" as const,
        brandingJson: null,
        capacity: null,
        checkInMinutes: 30,
        courtLabelsJson: null,
        createdAt: new Date(),
        currency: "usd",
        description: null,
        endsAt: null,
        entryFeeCents: 0,
        eventType: "open_play" as const,
        hostLabel: null,
        hostType: "organizer" as const,
        id: "event-1",
        name: "Test Event",
        organizationId: null,
        organizerUserId: "user-1",
        refundPolicy: "Full refund",
        registrationDeadline: null,
        startsAt: new Date(Date.now() + 86_400_000),
        status: "published" as const,
        updatedAt: new Date(),
        venueId: null,
      },
    };

    let queryCount = 0;
    const mockDb = {
      select: vi.fn().mockImplementation(() => {
        queryCount += 1;
        if (queryCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                innerJoin: vi.fn().mockReturnValue({
                  where: vi.fn().mockResolvedValue([fakeCandidate]),
                }),
              }),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockRejectedValue(new Error("D1 stats failure")),
          }),
        };
      }),
    } as unknown as ReturnType<typeof createDb>;

    const results = await decideAds(mockDb, { placement: "display" });
    expect(results).toEqual([]);
    expect(errorSpy).toHaveBeenCalledWith(
      "Ad decision daily stats query failed:",
      expect.any(Error)
    );
    errorSpy.mockRestore();
  });
});
