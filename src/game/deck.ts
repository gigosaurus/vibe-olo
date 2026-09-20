import type { Card, GameSettings, Player, ResolvedCard } from './types.ts';
import { allowedIntensities } from './settings.ts';
import { cardNeedsPartner, substitute } from './template.ts';
import type { RandomSource } from './random.ts';
import { defaultRandom, shuffle } from './random.ts';

/**
 * Narrows the full deck down to the cards a given group can actually be shown.
 *
 * Filtering happens once per draw rather than once per game so that a roster
 * shrinking mid-game (someone leaves) immediately stops pair cards appearing.
 */
export function filterDeck(
  cards: readonly Card[],
  settings: GameSettings,
  playerCount: number,
): readonly Card[] {
  const categories = new Set(settings.categories);
  const intensities = new Set(allowedIntensities(settings.intensity));
  return cards.filter((card) => {
    if (!categories.has(card.category)) return false;
    if (!intensities.has(card.intensity)) return false;
    // A pair card with nobody to pair up with would name the same player twice.
    if (playerCount < 2 && cardNeedsPartner(card)) return false;
    // In alcohol-free mode a drink-flavoured card is only playable if it has a
    // replacement written for it.
    if (settings.alcoholFree && !card.alcoholFree && card.alcoholFreeText === undefined) {
      return false;
    }
    return true;
  });
}

/** Cards from `deck` that have not been shown yet in this game. */
export function availableCards(
  deck: readonly Card[],
  usedCardIds: readonly string[],
): readonly Card[] {
  const used = new Set(usedCardIds);
  return deck.filter((card) => !used.has(card.id));
}

/**
 * Draws one unused card. Returns `undefined` once the filtered deck is
 * exhausted; the engine turns that into the end screen rather than repeating
 * cards the group has already seen.
 */
export function drawCard(
  deck: readonly Card[],
  usedCardIds: readonly string[],
  random: RandomSource = defaultRandom,
): Card | undefined {
  const available = availableCards(deck, usedCardIds);
  if (available.length === 0) return undefined;
  return shuffle(available, random)[0];
}

/** Text a card should display, honouring alcohol-free mode. */
export function cardText(card: Card, alcoholFree: boolean): string {
  if (alcoholFree && !card.alcoholFree && card.alcoholFreeText !== undefined) {
    return card.alcoholFreeText;
  }
  return card.text;
}

/** Rule line a card should pin, honouring alcohol-free mode. */
export function cardRule(card: Card, alcoholFree: boolean): string | undefined {
  if (alcoholFree && card.alcoholFreeRule !== undefined) return card.alcoholFreeRule;
  return card.rule;
}

/** Turns a raw card plus the chosen players into display-ready text. */
export function resolveCard(
  card: Card,
  settings: GameSettings,
  context: { players: readonly Player[]; player?: Player; otherPlayer?: Player },
): ResolvedCard {
  const templateContext = {
    players: context.players,
    ...(context.player === undefined ? {} : { player: context.player }),
    ...(context.otherPlayer === undefined ? {} : { otherPlayer: context.otherPlayer }),
  };
  const rule = cardRule(card, settings.alcoholFree);
  return {
    cardId: card.id,
    category: card.category,
    audience: card.audience,
    intensity: card.intensity,
    text: substitute(cardText(card, settings.alcoholFree), templateContext),
    ...(card.duration === undefined ? {} : { duration: card.duration }),
    ...(rule === undefined ? {} : { rule: substitute(rule, templateContext) }),
    ...(context.player === undefined ? {} : { player: context.player }),
    ...(context.otherPlayer === undefined ? {} : { otherPlayer: context.otherPlayer }),
  };
}
