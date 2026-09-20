import { describe, expect, it } from 'vitest';
import {
  countPlayableCards,
  dismissRule,
  nextCard,
  playAgain,
  reconcileGameState,
  remainingCardCount,
  skipCard,
  startGame,
} from './engine.ts';
import { createSeededRandom } from './random.ts';
import { makeCard, makePlayers, makeSettings } from '../test/factories.ts';
import type { Card, GameState } from './types.ts';

const players = makePlayers('Ada', 'Grace', 'Alan');

function individualDeck(count: number): Card[] {
  return Array.from({ length: count }, (_, index) =>
    makeCard({
      id: `solo-${String(index)}`,
      audience: 'individual',
      text: '{player}, do something.',
    }),
  );
}

function play(
  state: GameState,
  turns: number,
  deps: { cards: readonly Card[]; random: () => number },
): GameState {
  let current = state;
  for (let turn = 0; turn < turns && !current.finished; turn += 1) {
    current = nextCard(current, deps);
  }
  return current;
}

describe('starting a game', () => {
  it('deals the first card immediately and counts it as turn one', () => {
    const deps = { cards: individualDeck(10), random: createSeededRandom(1) };
    const game = startGame(players, makeSettings({ length: 'short' }), deps);
    expect(game.currentCard).not.toBeNull();
    expect(game.turnCount).toBe(1);
    expect(game.finished).toBe(false);
    expect(game.targetTurns).toBe(20);
  });

  it('has no target for an endless game', () => {
    const deps = { cards: individualDeck(5), random: createSeededRandom(1) };
    expect(startGame(players, makeSettings({ length: 'endless' }), deps).targetTurns).toBeNull();
  });

  it('counts the cards a group can actually play', () => {
    const cards = [
      makeCard({ id: 'a', category: 'questions' }),
      makeCard({ id: 'b', category: 'votes' }),
    ];
    expect(countPlayableCards(makeSettings({ categories: ['questions'] }), 3, { cards })).toBe(1);
  });
});

describe('duplicate prevention', () => {
  it('never repeats a card before the deck is exhausted', () => {
    const deps = { cards: individualDeck(12), random: createSeededRandom(4) };
    let game = startGame(players, makeSettings({ length: 'endless' }), deps);
    const seen = [game.currentCard?.cardId];
    for (let turn = 0; turn < 11; turn += 1) {
      game = nextCard(game, deps);
      seen.push(game.currentCard?.cardId);
    }
    expect(new Set(seen).size).toBe(12);
  });

  it('counts a skipped card as used', () => {
    const deps = { cards: individualDeck(3), random: createSeededRandom(9) };
    const game = startGame(players, makeSettings({ length: 'endless' }), deps);
    const first = game.currentCard?.cardId;
    const skipped = skipCard(game, deps);
    expect(skipped.currentCard?.cardId).not.toBe(first);
    expect(skipped.usedCardIds).toContain(first);
  });

  it('does not advance progress when a card is skipped', () => {
    const deps = { cards: individualDeck(6), random: createSeededRandom(2) };
    const game = startGame(players, makeSettings({ length: 'short' }), deps);
    expect(skipCard(game, deps).turnCount).toBe(game.turnCount);
    expect(nextCard(game, deps).turnCount).toBe(game.turnCount + 1);
  });
});

describe('turn rotation', () => {
  it('gives every player the same number of turns over a full cycle', () => {
    const deps = { cards: individualDeck(24), random: createSeededRandom(13) };
    let game = startGame(players, makeSettings({ length: 'endless' }), deps);
    const counts = new Map<string, number>();
    for (let turn = 0; turn < 24; turn += 1) {
      const name = game.currentCard?.player?.name;
      if (name !== undefined) counts.set(name, (counts.get(name) ?? 0) + 1);
      game = nextCard(game, deps);
    }
    expect([...counts.values()]).toEqual([8, 8, 8]);
  });

  it('never gives the same player two cards in a row', () => {
    const deps = { cards: individualDeck(20), random: createSeededRandom(21) };
    let game = startGame(players, makeSettings({ length: 'endless' }), deps);
    let previous = game.currentCard?.player?.id;
    for (let turn = 0; turn < 19; turn += 1) {
      game = nextCard(game, deps);
      const current = game.currentCard?.player?.id;
      expect(current).not.toBe(previous);
      previous = current;
    }
  });
});

describe('pair cards', () => {
  const pairDeck = Array.from({ length: 10 }, (_, index) =>
    makeCard({
      id: `pair-${String(index)}`,
      audience: 'pair',
      text: '{player} and {otherPlayer} do a thing.',
    }),
  );

  it('never pairs a player with themselves', () => {
    const deps = { cards: pairDeck, random: createSeededRandom(5) };
    let game = startGame(players, makeSettings({ length: 'endless' }), deps);
    for (let turn = 0; turn < 10 && !game.finished; turn += 1) {
      const card = game.currentCard;
      if (card !== null) {
        expect(card.player?.id).toBeDefined();
        expect(card.otherPlayer?.id).toBeDefined();
        expect(card.player?.id).not.toBe(card.otherPlayer?.id);
      }
      game = nextCard(game, deps);
    }
  });

  it('ends the game rather than showing a pair card to a single player', () => {
    const deps = { cards: pairDeck, random: createSeededRandom(5) };
    const game = startGame(makePlayers('Solo'), makeSettings({ length: 'endless' }), deps);
    expect(game.finished).toBe(true);
    expect(game.endReason).toBe('deck-exhausted');
    expect(game.currentCard).toBeNull();
  });
});

describe('finishing', () => {
  it('ends after the chosen number of cards', () => {
    const deps = { cards: individualDeck(60), random: createSeededRandom(6) };
    const start = startGame(players, makeSettings({ length: 'short' }), deps);
    const game = play(start, 25, deps);
    expect(game.finished).toBe(true);
    expect(game.endReason).toBe('completed');
    expect(game.turnCount).toBe(20);
  });

  it('ends when the deck runs out before the target', () => {
    const deps = { cards: individualDeck(4), random: createSeededRandom(6) };
    const game = play(startGame(players, makeSettings({ length: 'short' }), deps), 10, deps);
    expect(game.finished).toBe(true);
    expect(game.endReason).toBe('deck-exhausted');
    expect(game.turnCount).toBe(4);
    expect(remainingCardCount(game, deps)).toBe(0);
  });

  it('ends immediately when no cards match the filters', () => {
    const deps = {
      cards: [makeCard({ id: 'only', category: 'votes' })],
      random: createSeededRandom(1),
    };
    const game = startGame(players, makeSettings({ categories: ['questions'] }), deps);
    expect(game.finished).toBe(true);
    expect(game.currentCard).toBeNull();
  });

  it('starts a fresh deck when playing again', () => {
    const deps = { cards: individualDeck(4), random: createSeededRandom(6) };
    const finished = play(startGame(players, makeSettings({ length: 'short' }), deps), 10, deps);
    const again = playAgain(finished, deps);
    expect(again.finished).toBe(false);
    expect(again.turnCount).toBe(1);
    expect(again.usedCardIds).toHaveLength(1);
    expect(again.activeRules).toEqual([]);
  });
});

describe('temporary rules', () => {
  const ruleDeck = [
    makeCard({
      id: 'rule-1',
      category: 'rules',
      audience: 'rule',
      text: 'New rule for {player}.',
      rule: '{player} is the narrator.',
    }),
    ...individualDeck(4),
  ];

  it('pins a rule and keeps it across later cards', () => {
    const deps = { cards: ruleDeck, random: createSeededRandom(3) };
    let game = startGame(players, makeSettings({ categories: ['rules', 'challenges'] }), deps);
    for (let turn = 0; turn < 4 && game.activeRules.length === 0; turn += 1) {
      game = nextCard(game, deps);
    }
    expect(game.activeRules).toHaveLength(1);
    expect(game.activeRules[0]?.text).toMatch(/is the narrator\.$/);

    const later = nextCard(game, deps);
    expect(later.activeRules).toHaveLength(1);

    const cleared = dismissRule(later, later.activeRules[0]!.id);
    expect(cleared.activeRules).toHaveLength(0);
  });
});

describe('reconciling a restored game', () => {
  it('keeps playing when a player was renamed', () => {
    const deps = { cards: individualDeck(6), random: createSeededRandom(8) };
    const game = startGame(players, makeSettings(), deps);
    const renamed = [{ id: 'p1', name: 'Ada L' }, ...players.slice(1)];
    const result = reconcileGameState(game, renamed);
    expect(result?.players[0]?.name).toBe('Ada L');
  });

  it('drops the current card when its player has been removed', () => {
    const deps = { cards: individualDeck(6), random: createSeededRandom(8) };
    const game = startGame(players, makeSettings(), deps);
    const missing = game.currentCard?.player?.id;
    const roster = players.filter((player) => player.id !== missing);
    const result = reconcileGameState(game, roster);
    expect(result).not.toBeNull();
    expect(result?.currentCard).toBeNull();
    expect(result?.players).toHaveLength(2);
  });

  it('refuses to resume when too few players remain', () => {
    const deps = { cards: individualDeck(6), random: createSeededRandom(8) };
    const game = startGame(players, makeSettings(), deps);
    expect(reconcileGameState(game, players.slice(0, 1))).toBeNull();
  });
});
