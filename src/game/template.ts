import type { Card, Player } from './types.ts';

/** Values available to a card template. */
export interface TemplateContext {
  /** Player on turn, when the card concerns someone in particular. */
  readonly player?: Player;
  /** Second player, for cards that pair two people up. */
  readonly otherPlayer?: Player;
  /** Everyone in the game, used by `{playerList}`. */
  readonly players: readonly Player[];
}

const PLACEHOLDER = /\{(player|otherPlayer|playerList)\}/g;

/** "Ada", "Ada and Grace", "Ada, Grace and Alan". */
export function formatPlayerList(players: readonly Player[]): string {
  const names = players.map((player) => player.name);
  if (names.length === 0) return 'the group';
  if (names.length === 1) return names[0] as string;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1] as string}`;
}

/**
 * Replaces `{player}`, `{otherPlayer}` and `{playerList}` in card text.
 *
 * Missing values fall back to neutral wording instead of leaving a raw
 * placeholder on screen, so a card can never show `{player}` to a group.
 */
export function substitute(text: string, context: TemplateContext): string {
  return text.replace(PLACEHOLDER, (_match, token: string) => {
    switch (token) {
      case 'player':
        return context.player?.name ?? 'whoever is holding the phone';
      case 'otherPlayer':
        return context.otherPlayer?.name ?? 'someone else';
      case 'playerList':
        return formatPlayerList(context.players);
      default:
        return _match;
    }
  });
}

/** Lists the placeholders a piece of card text uses. */
export function placeholdersIn(text: string): readonly string[] {
  return [...text.matchAll(PLACEHOLDER)].map((match) => match[1] as string);
}

/** `true` when the card names a single player and therefore needs a turn holder. */
export function cardNeedsPlayer(card: Card): boolean {
  if (card.audience === 'individual' || card.audience === 'pair') return true;
  return usesToken(card, 'player');
}

/** `true` when the card needs a second, different player. */
export function cardNeedsPartner(card: Card): boolean {
  if (card.audience === 'pair') return true;
  return usesToken(card, 'otherPlayer');
}

function usesToken(card: Card, token: string): boolean {
  const sources = [card.text, card.alcoholFreeText, card.rule, card.alcoholFreeRule];
  return sources.some((source) => source !== undefined && source.includes(`{${token}}`));
}
