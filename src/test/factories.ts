import type { Card, GameSettings, Player } from '../game/types.ts';
import { defaultSettings } from '../game/settings.ts';

export function makePlayers(...names: string[]): Player[] {
  return names.map((name, index) => ({ id: `p${String(index + 1)}`, name }));
}

export function makeCard(overrides: Partial<Card> & Pick<Card, 'id'>): Card {
  return {
    category: 'challenges',
    intensity: 'relaxed',
    audience: 'group',
    text: 'Do a thing.',
    alcoholFree: true,
    ...overrides,
  };
}

export function makeSettings(overrides: Partial<GameSettings> = {}): GameSettings {
  return { ...defaultSettings, ...overrides };
}
