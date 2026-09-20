import type { ActiveRule, ResolvedCard } from './types.ts';

/**
 * Rules pinned by rule cards. They stay on screen until somebody removes
 * them, so the list is capped to keep the strip readable on a small phone.
 */
export const MAX_ACTIVE_RULES = 6;

export function addRule(rules: readonly ActiveRule[], card: ResolvedCard): readonly ActiveRule[] {
  if (card.rule === undefined) return rules;
  // The same card can only be in force once.
  if (rules.some((rule) => rule.cardId === card.cardId)) return rules;
  const next: ActiveRule = {
    id: `rule-${card.cardId}`,
    cardId: card.cardId,
    text: card.rule,
    ...(card.player === undefined ? {} : { owner: card.player.name }),
  };
  const combined = [...rules, next];
  return combined.slice(Math.max(0, combined.length - MAX_ACTIVE_RULES));
}

export function removeRule(rules: readonly ActiveRule[], id: string): readonly ActiveRule[] {
  return rules.filter((rule) => rule.id !== id);
}
