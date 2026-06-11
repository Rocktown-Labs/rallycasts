import { describe, expect, it } from "vitest";

import { buildOnboardingBio, parseDateOfBirth } from "./onboarding-profile";

const fixedToday = new Date("2026-06-11T12:00:00.000Z");

describe("parseDateOfBirth", () => {
  it("parses slash dates and computes age", () => {
    expect(parseDateOfBirth("04/01/1991", fixedToday)).toEqual({
      age: 35,
      formatted: "April 1, 1991",
    });
  });

  it("parses compact two digit birth years", () => {
    expect(parseDateOfBirth("040191", fixedToday)).toEqual({
      age: 35,
      formatted: "April 1, 1991",
    });
  });

  it("rejects invalid or underage dates", () => {
    expect(parseDateOfBirth("02/31/2010", fixedToday)).toBeNull();
    expect(parseDateOfBirth("06/12/2022", fixedToday)).toBeNull();
  });
});

describe("buildOnboardingBio", () => {
  it("summarizes onboarding preferences for the current profile schema", () => {
    expect(
      buildOnboardingBio({
        availability: ["Weeknights", "Saturday mornings"],
        contentFormats: ["Match highlights", "Local park heat"],
        frequencyLabel: "2-3 times a week",
        goalLabels: ["Find players", "Watch match clips"],
        playStyle: "Competitive",
      })
    ).toBe(
      "Looking for find players, watch match clips. plays 2-3 times a week. competitive court energy. usually available weeknights, saturday mornings. wants match highlights, local park heat in their feed"
    );
  });
});
