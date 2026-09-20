import { describe, expect, it } from 'vitest';
import {
  STORAGE_KEY,
  STORAGE_VERSION,
  clearPersistedState,
  loadPersistedState,
  parsePersistedState,
  savePersistedState,
} from './persistence.ts';
import { createMemoryStore } from './storage.ts';
import { defaultSettings } from '../game/settings.ts';
import { startGame } from '../game/engine.ts';
import { createSeededRandom } from '../game/random.ts';
import { makeCard, makePlayers, makeSettings } from '../test/factories.ts';

const deck = Array.from({ length: 8 }, (_, index) =>
  makeCard({ id: `c${String(index)}`, audience: 'individual', text: '{player}, go.' }),
);

describe('parsing stored state', () => {
  it('returns null for malformed JSON', () => {
    expect(parsePersistedState('{not json')).toBeNull();
  });

  it('returns null for an empty or missing value', () => {
    expect(parsePersistedState(null)).toBeNull();
    expect(parsePersistedState('')).toBeNull();
  });

  it('returns null for a version from the future', () => {
    expect(parsePersistedState(JSON.stringify({ version: 99, players: [] }))).toBeNull();
  });

  it('returns null when there is no version at all', () => {
    expect(parsePersistedState(JSON.stringify({ players: [{ id: 'a', name: 'Ada' }] }))).toBeNull();
  });

  it('drops player entries that are not usable', () => {
    const raw = JSON.stringify({
      version: STORAGE_VERSION,
      players: [
        { id: 'p1', name: 'Ada' },
        { id: 'p2', name: '   ' },
        { name: 'No id' },
        'nonsense',
        { id: 'p3', name: 'ada' },
        { id: 'p4', name: 'Grace' },
      ],
    });
    const parsed = parsePersistedState(raw);
    expect(parsed?.players.map((player) => player.name)).toEqual(['Ada', 'Grace']);
  });

  it('falls back to defaults for unknown setting values', () => {
    const raw = JSON.stringify({
      version: STORAGE_VERSION,
      settings: { intensity: 'nuclear', length: 42, categories: ['questions', 'nope'] },
    });
    const parsed = parsePersistedState(raw);
    expect(parsed?.settings.intensity).toBe(defaultSettings.intensity);
    expect(parsed?.settings.length).toBe(defaultSettings.length);
    expect(parsed?.settings.categories).toEqual(['questions']);
    expect(parsed?.settings.alcoholFree).toBe(false);
  });

  it('restores all categories when the stored list is empty', () => {
    const raw = JSON.stringify({ version: STORAGE_VERSION, settings: { categories: [] } });
    expect(parsePersistedState(raw)?.settings.categories).toEqual(defaultSettings.categories);
  });
});

describe('migration', () => {
  it('upgrades a version 1 record', () => {
    const raw = JSON.stringify({
      version: 1,
      players: [{ id: 'p1', name: 'Ada' }],
      settings: { intensity: 'chaotic', length: 'quick', categories: ['votes'], sober: true },
    });
    const parsed = parsePersistedState(raw);
    expect(parsed?.settings).toEqual({
      intensity: 'chaotic',
      length: 'short',
      categories: ['votes'],
      alcoholFree: true,
    });
    // Version 1 games are not resumable, so the saved game is discarded.
    expect(parsed?.game).toBeNull();
    expect(parsed?.players.map((player) => player.name)).toEqual(['Ada']);
  });
});

describe('round trip', () => {
  it('saves and restores an interrupted game', () => {
    const store = createMemoryStore();
    const players = makePlayers('Ada', 'Grace', 'Alan');
    const game = startGame(players, makeSettings({ length: 'short' }), {
      cards: deck,
      random: createSeededRandom(3),
    });
    expect(savePersistedState(store, { players, settings: game.settings, game })).toBe(true);

    const restored = loadPersistedState(store);
    expect(restored.game?.currentCard?.cardId).toBe(game.currentCard?.cardId);
    expect(restored.game?.currentCard?.text).toBe(game.currentCard?.text);
    expect(restored.game?.turnCount).toBe(game.turnCount);
    expect(restored.game?.usedCardIds).toEqual(game.usedCardIds);
    expect(restored.game?.currentCard?.player?.id).toBe(game.currentCard?.player?.id);
  });

  it('restores active rules', () => {
    const store = createMemoryStore();
    const players = makePlayers('Ada', 'Grace');
    const game = startGame(players, makeSettings(), { cards: deck, random: createSeededRandom(1) });
    const withRule = {
      ...game,
      activeRules: [{ id: 'rule-x', cardId: 'x', text: 'No first names.', owner: 'Ada' }],
    };
    savePersistedState(store, { players, settings: game.settings, game: withRule });
    expect(loadPersistedState(store).game?.activeRules).toEqual(withRule.activeRules);
  });

  it('drops a saved card whose player no longer exists', () => {
    const store = createMemoryStore();
    const players = makePlayers('Ada', 'Grace');
    const game = startGame(players, makeSettings(), { cards: deck, random: createSeededRandom(2) });
    savePersistedState(store, { players, settings: game.settings, game });

    // Simulate the roster shrinking inside the saved game record.
    const raw = JSON.parse(store.get(STORAGE_KEY) as string) as Record<string, unknown>;
    const savedGame = raw['game'] as Record<string, unknown>;
    savedGame['players'] = [{ id: 'p2', name: 'Grace' }];
    store.set(STORAGE_KEY, JSON.stringify(raw));

    const restored = loadPersistedState(store);
    expect(restored.game?.players).toHaveLength(1);
    if (game.currentCard?.player?.id === 'p1') {
      expect(restored.game?.currentCard?.player).toBeUndefined();
    }
  });

  it('returns empty state when storage holds nothing', () => {
    const store = createMemoryStore();
    expect(loadPersistedState(store)).toEqual({
      players: [],
      settings: defaultSettings,
      game: null,
    });
  });

  it('clears everything it owns', () => {
    const store = createMemoryStore();
    savePersistedState(store, {
      players: makePlayers('Ada'),
      settings: defaultSettings,
      game: null,
    });
    clearPersistedState(store);
    expect(store.get(STORAGE_KEY)).toBeNull();
  });

  it('reports failure when the store refuses to write', () => {
    const failing = { ...createMemoryStore(), set: () => false };
    expect(
      savePersistedState(failing, { players: [], settings: defaultSettings, game: null }),
    ).toBe(false);
  });
});
