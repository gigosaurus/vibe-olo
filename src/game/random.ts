/**
 * Randomness is injected everywhere in the engine so tests can run against a
 * deterministic source instead of `Math.random`.
 */

/** Returns a float in `[0, 1)`, like `Math.random`. */
export type RandomSource = () => number;

export const defaultRandom: RandomSource = () => Math.random();

/**
 * Small, fast, deterministic PRNG (mulberry32). Used by tests and by anything
 * that wants reproducible output; not suitable for cryptography.
 */
export function createSeededRandom(seed: number): RandomSource {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer in `[0, max)`. Returns 0 when `max` is not positive. */
export function randomInt(max: number, random: RandomSource = defaultRandom): number {
  if (max <= 0) return 0;
  return Math.floor(random() * max) % max;
}

/**
 * Unbiased Fisher-Yates shuffle. Returns a new array; the input is untouched
 * so callers can keep the original ordering of card data.
 */
export function shuffle<T>(items: readonly T[], random: RandomSource = defaultRandom): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1, random);
    const a = result[i] as T;
    const b = result[j] as T;
    result[i] = b;
    result[j] = a;
  }
  return result;
}

/** Picks one element, or `undefined` for an empty list. */
export function pickOne<T>(
  items: readonly T[],
  random: RandomSource = defaultRandom,
): T | undefined {
  if (items.length === 0) return undefined;
  return items[randomInt(items.length, random)];
}
