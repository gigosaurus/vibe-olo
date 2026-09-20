import type { Card, GameSettings, GameState, Player } from './types.ts';
import { allCards } from './cards/index.ts';
import { LENGTH_TARGETS } from './settings.ts';
import { availableCards, filterDeck, drawCard, resolveCard } from './deck.ts';
import { addRule, removeRule } from './active-rules.ts';
import { cardNeedsPartner, cardNeedsPlayer } from './template.ts';
import { nextPlayerIndex, pickPartner, playerAt, randomStartIndex } from './turns.ts';
import type { RandomSource } from './random.ts';
import { defaultRandom } from './random.ts';
import { MIN_PLAYERS } from './players.ts';

/**
 * Everything the engine needs from the outside world. Both fields are
 * injectable so tests can run a game on a tiny deck with a seeded generator.
 */
export interface EngineDeps {
  readonly cards?: readonly Card[];
  readonly random?: RandomSource;
}

function deckOf(deps: EngineDeps): readonly Card[] {
  return deps.cards ?? allCards;
}

/** Number of cards a group would be able to draw with these settings. */
export function countPlayableCards(
  settings: GameSettings,
  playerCount: number,
  deps: EngineDeps = {},
): number {
  return filterDeck(deckOf(deps), settings, playerCount).length;
}

/**
 * Creates a fresh game and draws the first card.
 *
 * The first card counts as turn 1, so progress and the card on screen never
 * disagree.
 */
export function startGame(
  players: readonly Player[],
  settings: GameSettings,
  deps: EngineDeps = {},
): GameState {
  const random = deps.random ?? defaultRandom;
  const empty: GameState = {
    players,
    settings,
    currentCard: null,
    usedCardIds: [],
    activeRules: [],
    turnCount: 0,
    targetTurns: LENGTH_TARGETS[settings.length],
    lastPlayerIndex: randomStartIndex(players.length, random),
    finished: false,
    endReason: null,
  };
  return draw(empty, true, deps);
}

/** Reveals the next card and moves the game forward. */
export function nextCard(state: GameState, deps: EngineDeps = {}): GameState {
  return draw(state, true, deps);
}

/**
 * Replaces the current card without advancing progress.
 *
 * Skipping is free: the group loses nothing, the skipped card is simply taken
 * out of this game's rotation so it does not come straight back.
 */
export function skipCard(state: GameState, deps: EngineDeps = {}): GameState {
  return draw(state, false, deps);
}

/** Removes a pinned rule, for example when the group decides it has run its course. */
export function dismissRule(state: GameState, ruleId: string): GameState {
  return { ...state, activeRules: removeRule(state.activeRules, ruleId) };
}

/** Starts a brand new game with the same players and settings. */
export function playAgain(state: GameState, deps: EngineDeps = {}): GameState {
  return startGame(state.players, state.settings, deps);
}

/** Cards still available to this game, for progress and "deck nearly empty" hints. */
export function remainingCardCount(state: GameState, deps: EngineDeps = {}): number {
  const deck = filterDeck(deckOf(deps), state.settings, state.players.length);
  return availableCards(deck, state.usedCardIds).length;
}

/**
 * Re-points a restored game at the current roster.
 *
 * Returns `null` when the saved game can no longer be played, for instance
 * because players were deleted and fewer than the minimum remain.
 */
export function reconcileGameState(state: GameState, roster: readonly Player[]): GameState | null {
  const byId = new Map(roster.map((player) => [player.id, player]));
  const players = state.players
    .filter((player) => byId.has(player.id))
    .map((player) => byId.get(player.id) as Player);
  if (players.length < MIN_PLAYERS) return null;

  const stillPresent = (player: Player | undefined): boolean =>
    player === undefined || byId.has(player.id);
  const cardIsStale =
    state.currentCard !== null &&
    (!stillPresent(state.currentCard.player) || !stillPresent(state.currentCard.otherPlayer));

  return {
    ...state,
    players,
    currentCard: cardIsStale ? null : state.currentCard,
    lastPlayerIndex: players.length === 0 ? -1 : state.lastPlayerIndex % players.length,
  };
}

/**
 * Core draw loop.
 *
 * `advanceProgress` is false for skips. Cards that turn out to be unplayable
 * (a pair card with no available partner) are marked used and the loop tries
 * again, which terminates because the pool shrinks by one every iteration.
 */
function draw(state: GameState, advanceProgress: boolean, deps: EngineDeps): GameState {
  const random = deps.random ?? defaultRandom;
  const { players, settings } = state;

  if (
    advanceProgress &&
    state.targetTurns !== null &&
    state.turnCount >= state.targetTurns &&
    state.turnCount > 0
  ) {
    return { ...state, finished: true, endReason: 'completed' };
  }

  const deck = filterDeck(deckOf(deps), settings, players.length);
  let usedCardIds = state.usedCardIds;
  let lastPlayerIndex = state.lastPlayerIndex;

  for (;;) {
    const card = drawCard(deck, usedCardIds, random);
    if (card === undefined) {
      return {
        ...state,
        usedCardIds,
        finished: true,
        endReason: 'deck-exhausted',
      };
    }

    let player: Player | undefined;
    let otherPlayer: Player | undefined;

    if (cardNeedsPlayer(card)) {
      const index = nextPlayerIndex(players.length, lastPlayerIndex);
      player = playerAt(players, index);
      if (player !== undefined) lastPlayerIndex = index;
    }

    if (cardNeedsPartner(card)) {
      otherPlayer = pickPartner(players, player, random);
      if (otherPlayer === undefined) {
        // Not enough distinct players for this card right now: discard it and
        // keep the rotation pointer where it was.
        usedCardIds = [...usedCardIds, card.id];
        lastPlayerIndex = state.lastPlayerIndex;
        continue;
      }
    }

    const resolved = resolveCard(card, settings, {
      players,
      ...(player === undefined ? {} : { player }),
      ...(otherPlayer === undefined ? {} : { otherPlayer }),
    });

    return {
      ...state,
      currentCard: resolved,
      usedCardIds: [...usedCardIds, card.id],
      activeRules: addRule(state.activeRules, resolved),
      turnCount: advanceProgress ? state.turnCount + 1 : state.turnCount,
      lastPlayerIndex,
      finished: false,
      endReason: null,
    };
  }
}
