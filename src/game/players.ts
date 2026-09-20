import { appConfig } from '../config/app-config.ts';
import type { Player } from './types.ts';
import type { RandomSource } from './random.ts';
import { defaultRandom } from './random.ts';

/** Why a name was rejected. The UI maps these to messages. */
export type NameProblem = 'empty' | 'duplicate' | 'too-long' | 'roster-full';

export type NameResult =
  | { readonly ok: true; readonly name: string }
  | { readonly ok: false; readonly problem: NameProblem };

export const MIN_PLAYERS = appConfig.minPlayers;
export const MAX_PLAYERS = appConfig.maxPlayers;
export const MAX_NAME_LENGTH = appConfig.maxPlayerNameLength;

/** Collapses whitespace and trims, so " Ada   Lovelace " becomes "Ada Lovelace". */
export function normaliseName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

/** Case-insensitive comparison key, so "ada" and "Ada" count as the same player. */
function nameKey(name: string): string {
  return normaliseName(name).toLocaleLowerCase();
}

/**
 * Validates a name against the current roster.
 *
 * @param ignoreId - player being renamed, so their own name is not a duplicate.
 */
export function validateName(
  raw: string,
  players: readonly Player[],
  ignoreId?: string,
): NameResult {
  const name = normaliseName(raw);
  if (name.length === 0) return { ok: false, problem: 'empty' };
  if (name.length > MAX_NAME_LENGTH) return { ok: false, problem: 'too-long' };
  const key = nameKey(name);
  const clash = players.some((player) => player.id !== ignoreId && nameKey(player.name) === key);
  if (clash) return { ok: false, problem: 'duplicate' };
  return { ok: true, name };
}

export function createPlayerId(random: RandomSource = defaultRandom): string {
  return `p-${Date.now().toString(36)}-${Math.floor(random() * 1e9).toString(36)}`;
}

export type RosterResult =
  | { readonly ok: true; readonly players: readonly Player[] }
  | { readonly ok: false; readonly problem: NameProblem };

/** Returns a new roster with the player appended, or the reason it was rejected. */
export function addPlayer(
  players: readonly Player[],
  raw: string,
  random: RandomSource = defaultRandom,
): RosterResult {
  if (players.length >= MAX_PLAYERS) return { ok: false, problem: 'roster-full' };
  const result = validateName(raw, players);
  if (!result.ok) return result;
  return { ok: true, players: [...players, { id: createPlayerId(random), name: result.name }] };
}

/** Returns a new roster with the named player renamed, or the rejection reason. */
export function renamePlayer(players: readonly Player[], id: string, raw: string): RosterResult {
  const result = validateName(raw, players, id);
  if (!result.ok) return result;
  return {
    ok: true,
    players: players.map((player) =>
      player.id === id ? { ...player, name: result.name } : player,
    ),
  };
}

export function removePlayer(players: readonly Player[], id: string): readonly Player[] {
  return players.filter((player) => player.id !== id);
}

/** Moves a player one slot in the given direction, clamped at the ends. */
export function movePlayer(
  players: readonly Player[],
  id: string,
  direction: -1 | 1,
): readonly Player[] {
  const index = players.findIndex((player) => player.id === id);
  if (index < 0) return players;
  const target = index + direction;
  if (target < 0 || target >= players.length) return players;
  const next = players.slice();
  const moved = next[index] as Player;
  const displaced = next[target] as Player;
  next[index] = displaced;
  next[target] = moved;
  return next;
}

/** A roster can start a game when it has enough players and no blank names. */
export function isRosterPlayable(players: readonly Player[]): boolean {
  return (
    players.length >= MIN_PLAYERS &&
    players.length <= MAX_PLAYERS &&
    players.every((player) => normaliseName(player.name).length > 0)
  );
}

/** Human-readable explanation for a rejected name. */
export function describeNameProblem(problem: NameProblem): string {
  switch (problem) {
    case 'empty':
      return 'Enter a name before adding a player.';
    case 'duplicate':
      return 'That name is already taken. Try adding an initial.';
    case 'too-long':
      return `Keep names to ${String(MAX_NAME_LENGTH)} characters or fewer.`;
    case 'roster-full':
      return `You can play with up to ${String(MAX_PLAYERS)} players.`;
  }
}
