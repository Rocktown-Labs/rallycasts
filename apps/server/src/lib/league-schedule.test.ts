import { describe, expect, it } from "vitest";

import { generateRoundRobinSchedule } from "./league-schedule";

describe("generateRoundRobinSchedule", () => {
  it("creates every pair exactly once for an even field", () => {
    const matches = generateRoundRobinSchedule(["a", "b", "c", "d"]);
    expect(matches).toHaveLength(6);
    expect(
      new Set(
        matches.map(({ awayTeamId, homeTeamId }) =>
          [awayTeamId, homeTeamId].toSorted().join(":")
        )
      )
    ).toEqual(new Set(["a:b", "a:c", "a:d", "b:c", "b:d", "c:d"]));
    expect(new Set(matches.map((match) => match.weekNumber))).toHaveLength(3);
  });

  it("handles an odd field with one bye each round", () => {
    const matches = generateRoundRobinSchedule(["a", "b", "c", "d", "e"]);
    expect(matches).toHaveLength(10);
    expect(new Set(matches.map((match) => match.weekNumber))).toHaveLength(5);
  });
});
