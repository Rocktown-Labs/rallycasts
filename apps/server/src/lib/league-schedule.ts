export interface RoundRobinMatch {
  awayTeamId: string;
  homeTeamId: string;
  weekNumber: number;
}

export const generateRoundRobinSchedule = (
  teamIds: string[]
): RoundRobinMatch[] => {
  if (teamIds.length < 2) {
    return [];
  }

  const rotation = [...teamIds];
  if (rotation.length % 2 === 1) {
    rotation.push("__bye__");
  }

  const rounds = rotation.length - 1;
  const matches: RoundRobinMatch[] = [];
  for (let round = 0; round < rounds; round += 1) {
    const half = rotation.length / 2;
    for (let index = 0; index < half; index += 1) {
      const [home] = rotation.slice(index, index + 1);
      const [away] = rotation.slice(rotation.length - 1 - index);
      if (home && away && home !== "__bye__" && away !== "__bye__") {
        matches.push({
          awayTeamId: round % 2 === 0 ? away : home,
          homeTeamId: round % 2 === 0 ? home : away,
          weekNumber: round + 1,
        });
      }
    }

    const [fixed, ...rest] = rotation;
    if (!fixed) {
      break;
    }
    const moving = rest;
    const last = moving.pop();
    if (last) {
      moving.unshift(last);
    }
    rotation.splice(0, rotation.length, fixed, ...moving);
  }

  return matches;
};
