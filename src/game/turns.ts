import type { Player } from './types.ts';
import type { RandomSource } from './random.ts';
import { defaultRandom, randomInt } from './random.ts';

/**
 * Turn order is a plain round-robin over the roster, starting from a random
 * player. It is the fairest option available without tracking history, and it
 * means nobody sits through five cards in a row while someone else waits.
 */
export function nextPlayerIndex(playerCount: number, lastIndex: number): number {
  if (playerCount <= 0) return -1;
  const safeLast = Number.isInteger(lastIndex) ? lastIndex : -1;
  return (((safeLast + 1) % playerCount) + playerCount) % playerCount;
}

/** Random starting point for the rotation, expressed as the "previous" index. */
export function randomStartIndex(
  playerCount: number,
  random: RandomSource = defaultRandom,
): number {
  if (playerCount <= 0) return -1;
  return randomInt(playerCount, random);
}

/**
 * Picks a partner who is not `player`.
 *
 * Returns `undefined` when there is nobody else, which is how the engine knows
 * to discard a pair card instead of pairing someone with themselves.
 */
export function pickPartner(
  players: readonly Player[],
  player: Player | undefined,
  random: RandomSource = defaultRandom,
): Player | undefined {
  const candidates = players.filter((candidate) => candidate.id !== player?.id);
  if (candidates.length === 0) return undefined;
  return candidates[randomInt(candidates.length, random)];
}

/** Safe lookup that copes with a stored index pointing past the end of the roster. */
export function playerAt(players: readonly Player[], index: number): Player | undefined {
  if (index < 0 || index >= players.length) return undefined;
  return players[index];
}
