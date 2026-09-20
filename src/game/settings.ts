import type { Category, GameLength, GameSettings, Intensity } from './types.ts';

export const CATEGORIES: readonly Category[] = [
  'icebreakers',
  'questions',
  'votes',
  'challenges',
  'rules',
];

export const INTENSITIES: readonly Intensity[] = ['relaxed', 'standard', 'chaotic'];
export const GAME_LENGTHS: readonly GameLength[] = ['short', 'standard', 'endless'];

/** Cards drawn before the end screen appears. `null` means the game never ends on its own. */
export const LENGTH_TARGETS: Readonly<Record<GameLength, number | null>> = {
  short: 20,
  standard: 40,
  endless: null,
};

export const defaultSettings: GameSettings = {
  intensity: 'standard',
  length: 'standard',
  categories: CATEGORIES,
  alcoholFree: false,
};

export const CATEGORY_LABELS: Readonly<Record<Category, string>> = {
  icebreakers: 'Icebreakers',
  questions: 'Questions',
  votes: 'Votes',
  challenges: 'Challenges',
  rules: 'Group rules',
};

export const CATEGORY_HINTS: Readonly<Record<Category, string>> = {
  icebreakers: 'Gentle openers for a group that just sat down.',
  questions: 'Cheeky questions, always safe to pass on.',
  votes: 'The group points at someone on the count of three.',
  challenges: 'Short things to act out, perform or attempt.',
  rules: 'Temporary rules that stay pinned until you remove them.',
};

export const INTENSITY_LABELS: Readonly<Record<Intensity, string>> = {
  relaxed: 'Relaxed',
  standard: 'Standard',
  chaotic: 'Chaotic',
};

export const INTENSITY_HINTS: Readonly<Record<Intensity, string>> = {
  relaxed: 'Easy-going cards only.',
  standard: 'Relaxed cards plus a bolder mix.',
  chaotic: 'Everything, including the loudest cards.',
};

export const LENGTH_LABELS: Readonly<Record<GameLength, string>> = {
  short: 'Short',
  standard: 'Standard',
  endless: 'Endless',
};

export const LENGTH_HINTS: Readonly<Record<GameLength, string>> = {
  short: 'About 20 cards.',
  standard: 'About 40 cards.',
  endless: 'Play until you stop.',
};

/**
 * Intensity is cumulative: picking Chaotic still includes the calmer cards so
 * the deck stays varied instead of turning into one long shouting match.
 */
export function allowedIntensities(selected: Intensity): readonly Intensity[] {
  switch (selected) {
    case 'relaxed':
      return ['relaxed'];
    case 'standard':
      return ['relaxed', 'standard'];
    case 'chaotic':
      return ['relaxed', 'standard', 'chaotic'];
  }
}

export function isSettingsValid(settings: GameSettings): boolean {
  return settings.categories.length > 0;
}

export function toggleCategory(
  settings: GameSettings,
  category: Category,
  enabled: boolean,
): GameSettings {
  const set = new Set(settings.categories);
  if (enabled) {
    set.add(category);
  } else {
    set.delete(category);
  }
  // Keep the canonical order so stored settings compare predictably.
  return { ...settings, categories: CATEGORIES.filter((item) => set.has(item)) };
}
