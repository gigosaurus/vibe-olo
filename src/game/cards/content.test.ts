import { describe, expect, it } from 'vitest';
import { allCards } from './index.ts';
import { CATEGORIES, INTENSITIES } from '../settings.ts';
import { placeholdersIn } from '../template.ts';

describe('shipped card content', () => {
  it('ships at least 120 cards', () => {
    expect(allCards.length).toBeGreaterThanOrEqual(120);
  });

  it('uses unique ids', () => {
    const ids = allCards.map((card) => card.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers every category at every intensity', () => {
    for (const category of CATEGORIES) {
      for (const intensity of INTENSITIES) {
        const matching = allCards.filter(
          (card) => card.category === category && card.intensity === intensity,
        );
        expect(matching.length, `${category}/${intensity}`).toBeGreaterThan(0);
      }
    }
  });

  it('gives individual and pair cards the placeholders they need', () => {
    for (const card of allCards) {
      const tokens = placeholdersIn(card.text);
      if (card.audience === 'individual' || card.audience === 'pair') {
        expect(tokens, card.id).toContain('player');
      }
      if (card.audience === 'pair') {
        expect(tokens, card.id).toContain('otherPlayer');
      }
      if (card.audience === 'vote') {
        expect(tokens, card.id).toContain('playerList');
      }
    }
  });

  it('never puts {otherPlayer} on a card that has no {player}', () => {
    for (const card of allCards) {
      const tokens = placeholdersIn(card.text);
      if (tokens.includes('otherPlayer')) expect(tokens, card.id).toContain('player');
    }
  });

  it('gives every rule card a pinned rule', () => {
    for (const card of allCards.filter((entry) => entry.audience === 'rule')) {
      expect(card.rule, card.id).toBeTruthy();
    }
  });

  it('gives every drink card an alcohol-free alternative', () => {
    for (const card of allCards.filter((entry) => !entry.alcoholFree)) {
      expect(card.alcoholFreeText, card.id).toBeTruthy();
      expect(card.alcoholFreeText, card.id).not.toMatch(/\bsip\b/i);
      if (card.rule !== undefined) expect(card.alcoholFreeRule, card.id).toBeTruthy();
    }
  });

  it('keeps every drink mention optional', () => {
    const optional = /\b(may|can|could)\s+(take a sip|sip)\b|take a sip if you want/i;
    for (const card of allCards) {
      const sources = [card.text, card.rule].filter(
        (value): value is string => value !== undefined,
      );
      for (const source of sources) {
        if (!/\bsip\b/i.test(source)) continue;
        expect(source, card.id).toMatch(optional);
      }
    }
  });

  it('avoids pressure, quantities and unsafe themes', () => {
    const banned = [
      /\bshots?\b/i,
      /\bchug/i,
      /\bdown (your|the|it)\b/i,
      /finish (your|the) (drink|glass)/i,
      /\bdrunk\b/i,
      /\bdrink up\b/i,
      /\bmust drink\b/i,
      /\bpenalt/i,
      /\bforfeit\b/i,
      // Driving mentioned anywhere near a drink.
      /driv\w*[^.]*\b(drink|sip|glass)\b|\b(drink|sip|glass)\b[^.]*driv\w*/i,
    ];
    for (const card of allCards) {
      const text = [card.text, card.alcoholFreeText, card.rule, card.alcoholFreeRule]
        .filter((value): value is string => value !== undefined)
        .join(' ');
      for (const pattern of banned) {
        expect(pattern.test(text), `${card.id} matched ${String(pattern)}`).toBe(false);
      }
    }
  });

  it('keeps card text short enough to read at arm’s length', () => {
    for (const card of allCards) {
      expect(card.text.length, card.id).toBeLessThanOrEqual(160);
    }
  });
});
