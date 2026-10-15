/**
 * Deterministic dummy rosters and brackets for the tournament preview.
 * Everything is generated client-side — nothing is written to the database.
 *
 * Naming is designed for worst-case density: word numbers only go to twenty
 * ("User One"…"User Twenty"), then switch to compact numerals ("User 21"…
 * "User 128"), because "User One Hundred Twenty Eight" overflows bracket
 * cards at the 128-player scale.
 */

export type PreviewMode = "singles" | "doubles";

export interface PreviewPlayer {
  /** "userone1"…"usertwenty20", then "user21"…"user128". */
  username: string;
  /** "User One"…"User Twenty", then "User 21"…"User 128". */
  name: string;
  /** Deterministic DUPR-style rating, always 2 decimals. */
  rating: number;
  skillLevel: "advanced" | "beginner" | "intermediate" | "pro";
}

export interface PreviewTeam {
  /** Stable per preview render. */
  id: string;
  /** Singles use the player's name; doubles use "Team One"… */
  name: string;
  players: PreviewPlayer[];
}

export interface PreviewMatch {
  awayTeam: PreviewTeam | null;
  homeTeam: PreviewTeam | null;
  id: string;
  round: number;
  /** Seed numbers for round one; null once winners feed the slot. */
  seedOne: number | null;
  seedTwo: number | null;
}

export interface PreviewBracket {
  matchesByRound: PreviewMatch[][];
  /** Padded bracket size (next power of two). */
  paddedSize: number;
}

const WORD_NUMBERS = [
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
  "Twenty",
] as const;

export const PREVIEW_BRACKET_SIZES = [
  8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 88, 96, 104, 112, 120, 128,
] as const;

export const MAX_PREVIEW_PLAYERS = 128;

/** "User One"…"User Twenty", then "User 21"…; max 8–10 characters. */
export const previewPlayerName = (index: number): string => {
  const number = index + 1;
  const label =
    number <= WORD_NUMBERS.length ? WORD_NUMBERS[number - 1] : String(number);
  return `User ${label}`;
};

export const previewPlayerUsername = (index: number): string => {
  const number = index + 1;
  if (number <= WORD_NUMBERS.length) {
    return `user${WORD_NUMBERS[number - 1].toLowerCase()}${number}`;
  }
  return `user${number}`;
};

export const previewTeamName = (index: number): string =>
  `Team ${index + 1 <= WORD_NUMBERS.length ? WORD_NUMBERS[index] : index + 1}`;

/**
 * Deterministic spread of DUPR-style ratings (3.00–4.90). No randomness so
 * the preview is stable across renders and screenshots.
 */
export const previewRating = (index: number): number =>
  3 + ((index * 7) % 20) / 10;

export const previewSkillLevel = (
  rating: number
): PreviewPlayer["skillLevel"] => {
  if (rating < 3.5) {
    return "beginner";
  }
  if (rating < 4) {
    return "intermediate";
  }
  if (rating < 4.5) {
    return "advanced";
  }
  return "pro";
};

export const buildPreviewPlayers = (count: number): PreviewPlayer[] =>
  Array.from({ length: count }, (_, index) => {
    const rating = previewRating(index);
    return {
      name: previewPlayerName(index),
      rating,
      skillLevel: previewSkillLevel(rating),
      username: previewPlayerUsername(index),
    };
  });

/** Doubles rosters pair players in order: (1,2), (3,4)… */
export const buildPreviewTeams = (
  mode: PreviewMode,
  unitCount: number
): PreviewTeam[] => {
  const playerCount = mode === "doubles" ? unitCount * 2 : unitCount;
  const players = buildPreviewPlayers(playerCount);
  return Array.from({ length: unitCount }, (_, index) => {
    const teamPlayers =
      mode === "doubles"
        ? players.slice(index * 2, index * 2 + 2)
        : [players[index]];
    return {
      id: `preview-team-${index + 1}`,
      name: mode === "doubles" ? previewTeamName(index) : teamPlayers[0].name,
      players: teamPlayers,
    };
  });
};

/**
 * Single-elimination tree with the same seed math as the real bracket
 * generator: seeds pad to the next power of two, seed n faces seed
 * (paddedSize + 1 - n), and missing seeds are byes. Round one carries the
 * real teams; later rounds are TBD slots.
 */
export const buildPreviewBracket = (teams: PreviewTeam[]): PreviewBracket => {
  const unitCount = teams.length;
  const paddedSize = 2 ** Math.ceil(Math.log2(unitCount));
  const teamBySeed = new Map<number, PreviewTeam>(
    teams.map((team, index) => [index + 1, team])
  );

  const matchesByRound: PreviewMatch[][] = [];
  let matchesThisRound = paddedSize / 2;
  let round = 1;
  while (matchesThisRound >= 1) {
    const matches: PreviewMatch[] = [];
    for (let slot = 0; slot < matchesThisRound; slot += 1) {
      const seedOne = slot + 1;
      const seedTwo = paddedSize + 1 - seedOne;
      const isBye = round === 1 && seedOne === seedTwo;
      matches.push({
        awayTeam: round === 1 ? (teamBySeed.get(seedTwo) ?? null) : null,
        homeTeam: round === 1 ? (teamBySeed.get(seedOne) ?? null) : null,
        id: `preview-match-${round}-${slot + 1}`,
        round,
        seedOne: round === 1 ? seedOne : null,
        seedTwo: round === 1 && !isBye ? seedTwo : null,
      });
    }
    matchesByRound.push(matches);
    matchesThisRound = Math.floor(matchesThisRound / 2);
    round += 1;
  }

  return { matchesByRound, paddedSize };
};

export const isByeMatch = (match: PreviewMatch): boolean =>
  Boolean(match.homeTeam) !== Boolean(match.awayTeam);

/** Deterministic initials + hue for the dummy avatar. */
export const previewAvatar = (
  name: string
): { hue: number; initials: string } => {
  const words = name.trim().split(/\s+/u);
  const first = [...(words[0] ?? "")][0] ?? "?";
  const last = [...(words.at(-1) ?? "")][0] ?? first;
  const initials =
    words.length > 1 ? `${first}${last}`.toUpperCase() : first.toUpperCase();
  let hash = 0;
  for (const char of name) {
    hash = (hash * 31 + (char.codePointAt(0) ?? 0)) % 360;
  }
  return { hue: hash, initials };
};
