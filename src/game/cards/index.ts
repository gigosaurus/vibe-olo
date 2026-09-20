import type { Card } from '../types.ts';
import { icebreakerCards } from './icebreakers.ts';
import { questionCards } from './questions.ts';
import { voteCards } from './votes.ts';
import { challengeCards } from './challenges.ts';
import { ruleCards } from './rules.ts';

/**
 * The complete deck. Card data lives in per-category modules so that adding
 * content never means touching engine or rendering code.
 */
export const allCards: readonly Card[] = [
  ...icebreakerCards,
  ...questionCards,
  ...voteCards,
  ...challengeCards,
  ...ruleCards,
];

export { icebreakerCards, questionCards, voteCards, challengeCards, ruleCards };
