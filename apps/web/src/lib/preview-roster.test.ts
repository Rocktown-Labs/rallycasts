import { describe, expect, it } from "vitest";

import {
  buildPreviewBracket,
  buildPreviewPlayers,
  buildPreviewTeams,
  previewAvatar,
  previewPlayerName,
  previewPlayerUsername,
  previewTeamName,
} from "./preview-roster";

describe("previewPlayerName", () => {
  it("keeps names compact at the 128-player scale", () => {
    const names = Array.from({ length: 128 }, (_, index) =>
      previewPlayerName(index)
    );
    expect(names[0]).toBe("User One");
    expect(names[19]).toBe("User Twenty");
    expect(names[20]).toBe("User 21");
    expect(names[127]).toBe("User 128");
    for (const name of names) {
      // Word numbers stop at twenty; "User Seventeen" is the longest at 14.
      expect(name.length).toBeLessThanOrEqual(14);
    }
    expect(new Set(names).size).toBe(128);
  });

  it("produces unique usernames matching the @userone1 shape", () => {
    const usernames = Array.from({ length: 128 }, (_, index) =>
      previewPlayerUsername(index)
    );
    expect(usernames[0]).toBe("userone1");
    expect(usernames[19]).toBe("usertwenty20");
    expect(usernames[20]).toBe("user21");
    expect(usernames[127]).toBe("user128");
    expect(new Set(usernames).size).toBe(128);
  });
});

describe("previewTeamName", () => {
  it("stays compact", () => {
    expect(previewTeamName(0)).toBe("Team One");
    expect(previewTeamName(19)).toBe("Team Twenty");
    expect(previewTeamName(20)).toBe("Team 21");
    expect(previewTeamName(127)).toBe("Team 128");
  });
});

describe("buildPreviewPlayers", () => {
  it("assigns deterministic ratings with two decimals and a skill level", () => {
    const players = buildPreviewPlayers(128);
    expect(players).toHaveLength(128);
    for (const player of players) {
      expect(player.rating.toFixed(2)).toHaveLength(4);
      expect(player.rating).toBeGreaterThanOrEqual(3);
      expect(player.rating).toBeLessThan(5);
      expect(player.skillLevel).toBeTruthy();
    }
    // Deterministic across calls.
    expect(buildPreviewPlayers(8)).toEqual(players.slice(0, 8));
  });
});

describe("buildPreviewTeams", () => {
  it("pairs players into named doubles teams", () => {
    const teams = buildPreviewTeams("doubles", 8);
    expect(teams).toHaveLength(8);
    expect(teams[0].name).toBe("Team One");
    expect(teams[0].players).toHaveLength(2);
    expect(teams[0].players[0].name).toBe("User One");
    expect(teams[0].players[1].name).toBe("User Two");
    expect(teams[7].players[1].name).toBe("User Sixteen");
  });

  it("uses player names for singles units", () => {
    const teams = buildPreviewTeams("singles", 8);
    expect(teams).toHaveLength(8);
    expect(teams[0].name).toBe("User One");
    expect(teams[0].players).toHaveLength(1);
  });
});

describe("buildPreviewBracket", () => {
  it("builds a clean power-of-two tree with no byes at 8", () => {
    const teams = buildPreviewTeams("singles", 8);
    const bracket = buildPreviewBracket(teams);
    expect(bracket.paddedSize).toBe(8);
    expect(bracket.matchesByRound.map((round) => round.length)).toEqual([
      4, 2, 1,
    ]);
    const [roundOne] = bracket.matchesByRound;
    expect(roundOne.every((match) => match.homeTeam && match.awayTeam)).toBe(
      true
    );
    expect(roundOne[0].seedOne).toBe(1);
    expect(roundOne[0].seedTwo).toBe(8);
  });

  it("gives byes to non-power-of-two fields like 24 and 40", () => {
    for (const size of [24, 40, 120]) {
      const bracket = buildPreviewBracket(buildPreviewTeams("singles", size));
      const [roundOne] = bracket.matchesByRound;
      const byes = roundOne.filter(
        (match) => Boolean(match.homeTeam) !== Boolean(match.awayTeam)
      );
      expect(byes.length).toBe(bracket.paddedSize - size);
      // Later rounds are TBD placeholders.
      const [finalRound] = bracket.matchesByRound.slice(-1);
      expect(finalRound).toHaveLength(1);
      expect(finalRound[0].homeTeam).toBeNull();
    }
  });

  it("handles the 128-player ceiling", () => {
    const bracket = buildPreviewBracket(buildPreviewTeams("singles", 128));
    expect(bracket.paddedSize).toBe(128);
    expect(bracket.matchesByRound[0]).toHaveLength(64);
    expect(bracket.matchesByRound).toHaveLength(7);
    const total = bracket.matchesByRound.reduce(
      (sum, round) => sum + round.length,
      0
    );
    expect(total).toBe(127);
  });

  it("supports doubles brackets with team-sized slots", () => {
    const bracket = buildPreviewBracket(buildPreviewTeams("doubles", 8));
    expect(bracket.matchesByRound[0]).toHaveLength(4);
    expect(bracket.matchesByRound[0][0].homeTeam?.players).toHaveLength(2);
  });
});

describe("previewAvatar", () => {
  it("derives readable initials and a stable hue", () => {
    expect(previewAvatar("User One").initials).toBe("UO");
    expect(previewAvatar("User 21").initials).toBe("U2");
    expect(previewAvatar("Jo").initials).toBe("J");
    expect(previewAvatar("User One").hue).toBe(previewAvatar("User One").hue);
  });
});
