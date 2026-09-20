import { describe, expect, it } from 'vitest';
import { availableCards, cardRule, cardText, drawCard, filterDeck, resolveCard } from './deck.ts';
import { createSeededRandom } from './random.ts';
import { makeCard, makePlayers, makeSettings } from '../test/factories.ts';
import { allCards } from './cards/index.ts';

const deck = [
  makeCard({ id: 'relaxed-question', category: 'questions', intensity: 'relaxed' }),
  makeCard({ id: 'standard-question', category: 'questions', intensity: 'standard' }),
  makeCard({ id: 'chaotic-challenge', category: 'challenges', intensity: 'chaotic' }),
  makeCard({
    id: 'pair-card',
    category: 'challenges',
    intensity: 'relaxed',
    audience: 'pair',
    text: '{player} and {otherPlayer} high five.',
  }),
  makeCard({
    id: 'boozy',
    category: 'challenges',
    intensity: 'relaxed',
    text: 'Take a sip if you want.',
    alcoholFree: false,
    alcoholFreeText: 'Strike a pose if you want.',
  }),
  makeCard({
    id: 'boozy-no-alternative',
    category: 'challenges',
    intensity: 'relaxed',
    text: 'Raise a glass.',
    alcoholFree: false,
  }),
];

const ids = (cards: readonly { id: string }[]): string[] => cards.map((card) => card.id);

describe('filterDeck', () => {
  it('keeps only the selected categories', () => {
    const result = filterDeck(deck, makeSettings({ categories: ['questions'] }), 4);
    expect(ids(result)).toEqual(['relaxed-question', 'standard-question']);
  });

  it('treats intensity as cumulative', () => {
    expect(ids(filterDeck(deck, makeSettings({ intensity: 'relaxed' }), 4))).not.toContain(
      'standard-question',
    );
    expect(ids(filterDeck(deck, makeSettings({ intensity: 'standard' }), 4))).toContain(
      'standard-question',
    );
    expect(ids(filterDeck(deck, makeSettings({ intensity: 'chaotic' }), 4))).toContain(
      'chaotic-challenge',
    );
  });

  it('drops pair cards when only one player is left', () => {
    expect(ids(filterDeck(deck, makeSettings({ intensity: 'chaotic' }), 1))).not.toContain(
      'pair-card',
    );
    expect(ids(filterDeck(deck, makeSettings({ intensity: 'chaotic' }), 2))).toContain('pair-card');
  });

  it('drops drink cards with no alcohol-free wording when alcohol-free mode is on', () => {
    const result = ids(filterDeck(deck, makeSettings({ alcoholFree: true }), 4));
    expect(result).toContain('boozy');
    expect(result).not.toContain('boozy-no-alternative');
  });

  it('returns an empty deck when nothing matches', () => {
    expect(filterDeck(deck, makeSettings({ categories: ['votes'] }), 4)).toEqual([]);
  });
});

describe('alcohol-free transformation', () => {
  const boozy = deck[4]!;

  it('swaps the text only when alcohol-free mode is on', () => {
    expect(cardText(boozy, false)).toBe('Take a sip if you want.');
    expect(cardText(boozy, true)).toBe('Strike a pose if you want.');
  });

  it('swaps the pinned rule when one is provided', () => {
    const rule = makeCard({
      id: 'rule',
      audience: 'rule',
      text: 'New rule.',
      rule: 'Sip on a mention.',
      alcoholFree: false,
      alcoholFreeText: 'New rule.',
      alcoholFreeRule: 'Pose on a mention.',
    });
    expect(cardRule(rule, false)).toBe('Sip on a mention.');
    expect(cardRule(rule, true)).toBe('Pose on a mention.');
  });

  it('leaves alcohol-free cards untouched in both modes', () => {
    const plain = deck[0]!;
    expect(cardText(plain, true)).toBe(cardText(plain, false));
  });

  it('never shows drinking wording from the shipped deck in alcohol-free mode', () => {
    const settings = makeSettings({ intensity: 'chaotic', alcoholFree: true });
    const playable = filterDeck(allCards, settings, 4);
    for (const card of playable) {
      expect(cardText(card, true)).not.toMatch(/\bsip\b/i);
    }
  });
});

describe('drawCard', () => {
  it('never returns a card that has already been used', () => {
    const used = ['relaxed-question', 'standard-question'];
    const card = drawCard(deck.slice(0, 3), used, createSeededRandom(1));
    expect(card?.id).toBe('chaotic-challenge');
  });

  it('returns undefined once every card is used', () => {
    expect(drawCard(deck, ids(deck), createSeededRandom(1))).toBeUndefined();
  });

  it('reports what is left', () => {
    expect(ids(availableCards(deck, ['pair-card', 'boozy']))).toEqual([
      'relaxed-question',
      'standard-question',
      'chaotic-challenge',
      'boozy-no-alternative',
    ]);
  });
});

describe('resolveCard', () => {
  const players = makePlayers('Ada', 'Grace');

  it('substitutes names and carries optional fields through', () => {
    const card = makeCard({
      id: 'pair',
      audience: 'pair',
      text: '{player} and {otherPlayer} swap seats.',
      duration: 30,
    });
    const resolved = resolveCard(card, makeSettings(), {
      players,
      player: players[0]!,
      otherPlayer: players[1]!,
    });
    expect(resolved.text).toBe('Ada and Grace swap seats.');
    expect(resolved.duration).toBe(30);
    expect(resolved.player?.name).toBe('Ada');
    expect(resolved.otherPlayer?.name).toBe('Grace');
  });

  it('substitutes names inside a pinned rule', () => {
    const card = makeCard({
      id: 'rule',
      audience: 'rule',
      text: 'New rule for {player}.',
      rule: '{player} is the timekeeper.',
    });
    const resolved = resolveCard(card, makeSettings(), { players, player: players[1]! });
    expect(resolved.rule).toBe('Grace is the timekeeper.');
  });
});
