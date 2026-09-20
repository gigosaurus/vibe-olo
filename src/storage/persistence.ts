import { appConfig } from '../config/app-config.ts';
import type {
  ActiveRule,
  Category,
  GameLength,
  GameSettings,
  GameState,
  Intensity,
  Player,
  ResolvedCard,
} from '../game/types.ts';
import { CATEGORIES, GAME_LENGTHS, INTENSITIES, defaultSettings } from '../game/settings.ts';
import { MAX_PLAYERS, normaliseName } from '../game/players.ts';
import type { KeyValueStore } from './storage.ts';

/**
 * Bump this whenever the persisted shape changes, and add a migration step.
 * Unknown or unmigratable versions are discarded rather than half-read.
 */
export const STORAGE_VERSION = 2;
export const STORAGE_KEY = `${appConfig.storageNamespace}:state`;

export interface PersistedState {
  readonly players: readonly Player[];
  readonly settings: GameSettings;
  /** Interrupted game, restored after an accidental refresh. */
  readonly game: GameState | null;
}

export const emptyPersistedState: PersistedState = {
  players: [],
  settings: defaultSettings,
  game: null,
};

/* ------------------------------------------------------------------ guards */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  const text = asString(value);
  if (text === null) return null;
  return (allowed as readonly string[]).includes(text) ? (text as T) : null;
}

function parsePlayers(value: unknown): readonly Player[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const players: Player[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const id = asString(entry['id']);
    const rawName = asString(entry['name']);
    if (id === null || rawName === null) continue;
    const name = normaliseName(rawName);
    if (name.length === 0) continue;
    const key = name.toLocaleLowerCase();
    if (seen.has(id) || seen.has(key)) continue;
    seen.add(id);
    seen.add(key);
    players.push({ id, name });
    if (players.length >= MAX_PLAYERS) break;
  }
  return players;
}

function parseSettings(value: unknown): GameSettings {
  if (!isRecord(value)) return defaultSettings;
  const categories = Array.isArray(value['categories'])
    ? CATEGORIES.filter((category) => (value['categories'] as unknown[]).includes(category))
    : defaultSettings.categories;
  return {
    intensity: oneOf<Intensity>(value['intensity'], INTENSITIES) ?? defaultSettings.intensity,
    length: oneOf<GameLength>(value['length'], GAME_LENGTHS) ?? defaultSettings.length,
    // An empty category list would make the deck unplayable, so fall back.
    categories: categories.length > 0 ? categories : defaultSettings.categories,
    alcoholFree: value['alcoholFree'] === true,
  };
}

function parseResolvedCard(value: unknown, players: readonly Player[]): ResolvedCard | null {
  if (!isRecord(value)) return null;
  const cardId = asString(value['cardId']);
  const text = asString(value['text']);
  const category = oneOf<Category>(value['category'], CATEGORIES);
  const intensity = oneOf<Intensity>(value['intensity'], INTENSITIES);
  const audience = oneOf(value['audience'], [
    'individual',
    'pair',
    'vote',
    'group',
    'rule',
  ] as const);
  if (cardId === null || text === null || category === null || audience === null) return null;
  const duration = asFiniteNumber(value['duration']);
  const rule = asString(value['rule']);
  const player = matchPlayer(value['player'], players);
  const otherPlayer = matchPlayer(value['otherPlayer'], players);
  return {
    cardId,
    category,
    intensity: intensity ?? 'standard',
    audience,
    text,
    ...(duration === null ? {} : { duration }),
    ...(rule === null ? {} : { rule }),
    ...(player === null ? {} : { player }),
    ...(otherPlayer === null ? {} : { otherPlayer }),
  };
}

/** Restores a player reference by id, so a renamed player keeps their card. */
function matchPlayer(value: unknown, players: readonly Player[]): Player | null {
  if (!isRecord(value)) return null;
  const id = asString(value['id']);
  if (id === null) return null;
  return players.find((player) => player.id === id) ?? null;
}

function parseActiveRules(value: unknown): readonly ActiveRule[] {
  if (!Array.isArray(value)) return [];
  const rules: ActiveRule[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const id = asString(entry['id']);
    const cardId = asString(entry['cardId']);
    const text = asString(entry['text']);
    if (id === null || cardId === null || text === null) continue;
    const owner = asString(entry['owner']);
    rules.push({ id, cardId, text, ...(owner === null ? {} : { owner }) });
  }
  return rules;
}

function parseGame(value: unknown): GameState | null {
  if (!isRecord(value)) return null;
  const players = parsePlayers(value['players']);
  if (players.length === 0) return null;
  const settings = parseSettings(value['settings']);
  const usedCardIds = Array.isArray(value['usedCardIds'])
    ? value['usedCardIds'].filter((id): id is string => typeof id === 'string')
    : [];
  const turnCount = asFiniteNumber(value['turnCount']) ?? 0;
  const targetTurnsRaw = asFiniteNumber(value['targetTurns']);
  const lastPlayerIndex = asFiniteNumber(value['lastPlayerIndex']) ?? -1;
  return {
    players,
    settings,
    currentCard: parseResolvedCard(value['currentCard'], players),
    usedCardIds,
    activeRules: parseActiveRules(value['activeRules']),
    turnCount: Math.max(0, Math.floor(turnCount)),
    targetTurns: targetTurnsRaw === null ? null : Math.max(1, Math.floor(targetTurnsRaw)),
    lastPlayerIndex: Math.floor(lastPlayerIndex),
    finished: value['finished'] === true,
    endReason:
      value['endReason'] === 'completed' || value['endReason'] === 'deck-exhausted'
        ? value['endReason']
        : null,
  };
}

/* -------------------------------------------------------------- migrations */

/**
 * Version 1 stored `settings.sober` instead of `settings.alcoholFree`, and
 * called the shortest game "quick". Anything older than v1 is dropped.
 */
function migrate(raw: Record<string, unknown>): Record<string, unknown> | null {
  const version = asFiniteNumber(raw['version']);
  if (version === null) return null;
  if (version > STORAGE_VERSION) return null;

  let record = raw;
  if (version === 1) {
    const settings = isRecord(record['settings']) ? { ...record['settings'] } : {};
    if ('sober' in settings) {
      settings['alcoholFree'] = settings['sober'] === true;
      delete settings['sober'];
    }
    if (settings['length'] === 'quick') settings['length'] = 'short';
    record = { ...record, version: 2, settings, game: null };
  }
  return record;
}

/* ----------------------------------------------------------------- public */

/** Parses a raw JSON string into state. Returns `null` for anything unusable. */
export function parsePersistedState(raw: string | null): PersistedState | null {
  if (raw === null || raw.length === 0) return null;
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(decoded)) return null;
  const migrated = migrate(decoded);
  if (migrated === null) return null;
  const players = parsePlayers(migrated['players']);
  return {
    players,
    settings: parseSettings(migrated['settings']),
    game: parseGame(migrated['game']),
  };
}

/** Reads state from the store, falling back to empty state on any problem. */
export function loadPersistedState(store: KeyValueStore): PersistedState {
  return parsePersistedState(store.get(STORAGE_KEY)) ?? emptyPersistedState;
}

/** Writes state. Returns `false` when the browser refused to persist it. */
export function savePersistedState(store: KeyValueStore, state: PersistedState): boolean {
  try {
    return store.set(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, ...state }));
  } catch {
    return false;
  }
}

/** Removes every key this app owns. */
export function clearPersistedState(store: KeyValueStore): void {
  store.remove(STORAGE_KEY);
}
