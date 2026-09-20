import { describe, expect, it } from 'vitest';
import { createSeededRandom, pickOne, randomInt, shuffle } from './random.ts';

describe('shuffle', () => {
  const input = Array.from({ length: 50 }, (_, index) => index);

  it('keeps every element exactly once', () => {
    const result = shuffle(input, createSeededRandom(7));
    expect(result).toHaveLength(input.length);
    expect([...result].sort((a, b) => a - b)).toEqual(input);
  });

  it('does not mutate the source array', () => {
    const source = [1, 2, 3, 4, 5];
    const copy = [...source];
    shuffle(source, createSeededRandom(3));
    expect(source).toEqual(copy);
  });

  it('actually reorders', () => {
    const result = shuffle(input, createSeededRandom(11));
    expect(result).not.toEqual(input);
  });

  it('is deterministic for a given seed', () => {
    expect(shuffle(input, createSeededRandom(42))).toEqual(shuffle(input, createSeededRandom(42)));
  });

  it('handles empty and single-element inputs', () => {
    expect(shuffle([], createSeededRandom(1))).toEqual([]);
    expect(shuffle(['only'], createSeededRandom(1))).toEqual(['only']);
  });

  it('reaches every position for a given element (no fixed-point bias)', () => {
    const random = createSeededRandom(99);
    const positions = new Set<number>();
    for (let run = 0; run < 200; run += 1) {
      positions.add(shuffle([0, 1, 2, 3, 4], random).indexOf(0));
    }
    expect([...positions].sort()).toEqual([0, 1, 2, 3, 4]);
  });

  it('produces a roughly uniform distribution over permutations', () => {
    const random = createSeededRandom(2024);
    const counts = new Map<string, number>();
    for (let run = 0; run < 6000; run += 1) {
      const key = shuffle(['a', 'b', 'c'], random).join('');
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    expect(counts.size).toBe(6);
    for (const count of counts.values()) {
      // Expected 1000 per permutation; allow generous slack for randomness.
      expect(count).toBeGreaterThan(800);
      expect(count).toBeLessThan(1200);
    }
  });
});

describe('randomInt', () => {
  it('stays within range', () => {
    const random = createSeededRandom(5);
    for (let run = 0; run < 500; run += 1) {
      const value = randomInt(4, random);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(4);
    }
  });

  it('returns 0 for a non-positive bound', () => {
    expect(randomInt(0, createSeededRandom(1))).toBe(0);
  });
});

describe('pickOne', () => {
  it('returns undefined for an empty list', () => {
    expect(pickOne([], createSeededRandom(1))).toBeUndefined();
  });

  it('returns a member of the list', () => {
    const items = ['a', 'b', 'c'];
    expect(items).toContain(pickOne(items, createSeededRandom(8)));
  });
});
