/**
 * A slightly "lucky" dice roll used only for the computer at Expert difficulty, at the user's
 * explicit request to make Expert tougher to beat. Rolls twice and keeps the better of the two —
 * still genuinely random (either roll is an equally fair pair of dice), just biased toward larger
 * pip totals and doubles on average, rather than a fixed/rigged outcome.
 */

function rollPair(): [number, number] {
  return [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
}

/** Doubles are weighted extra since they grant four moves instead of two. */
function favorability(dice: [number, number]): number {
  const sum = dice[0] + dice[1];
  return dice[0] === dice[1] ? sum * 2 : sum;
}

export function rollFavorableDice(): [number, number] {
  const a = rollPair();
  const b = rollPair();
  return favorability(b) > favorability(a) ? b : a;
}
