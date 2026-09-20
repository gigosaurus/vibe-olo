import { describe, expect, it } from 'vitest';
import { nextPlayerIndex, pickPartner, playerAt, randomStartIndex } from './turns.ts';
import { createSeededRandom } from './random.ts';
import { makePlayers } from '../test/factories.ts';

const players = makePlayers('Ada', 'Grace', 'Alan');

describe('nextPlayerIndex', () => {
  it('walks the roster in order and wraps around', () => {
    expect(nextPlayerIndex(3, 0)).toBe(1);
    expect(nextPlayerIndex(3, 1)).toBe(2);
    expect(nextPlayerIndex(3, 2)).toBe(0);
  });

  it('starts at the first player when there is no previous turn', () => {
    expect(nextPlayerIndex(3, -1)).toBe(0);
  });

  it('recovers from a stored index that is out of range or not a number', () => {
    expect(nextPlayerIndex(3, 99)).toBe(1);
    expect(nextPlayerIndex(3, -99)).toBe(1);
    expect(nextPlayerIndex(3, Number.NaN)).toBe(0);
  });

  it('reports no player for an empty roster', () => {
    expect(nextPlayerIndex(0, 0)).toBe(-1);
    expect(randomStartIndex(0, createSeededRandom(1))).toBe(-1);
  });

  it('starts somewhere inside the roster', () => {
    const start = randomStartIndex(3, createSeededRandom(4));
    expect(start).toBeGreaterThanOrEqual(0);
    expect(start).toBeLessThan(3);
  });
});

describe('pickPartner', () => {
  it('never returns the player themselves', () => {
    const random = createSeededRandom(12);
    for (let run = 0; run < 100; run += 1) {
      expect(pickPartner(players, players[1], random)?.id).not.toBe('p2');
    }
  });

  it('returns undefined when nobody else is available', () => {
    expect(pickPartner(players.slice(0, 1), players[0], createSeededRandom(1))).toBeUndefined();
    expect(pickPartner([], undefined, createSeededRandom(1))).toBeUndefined();
  });

  it('can pick anyone when no player is on turn', () => {
    expect(players).toContainEqual(pickPartner(players, undefined, createSeededRandom(6)));
  });

  it('eventually picks every other player', () => {
    const random = createSeededRandom(31);
    const seen = new Set<string>();
    for (let run = 0; run < 100; run += 1) {
      const partner = pickPartner(players, players[0], random);
      if (partner !== undefined) seen.add(partner.id);
    }
    expect([...seen].sort()).toEqual(['p2', 'p3']);
  });
});

describe('playerAt', () => {
  it('returns undefined outside the roster', () => {
    expect(playerAt(players, -1)).toBeUndefined();
    expect(playerAt(players, 3)).toBeUndefined();
    expect(playerAt(players, 1)?.name).toBe('Grace');
  });
});
