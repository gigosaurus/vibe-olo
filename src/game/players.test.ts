import { describe, expect, it } from 'vitest';
import {
  MAX_PLAYERS,
  addPlayer,
  isRosterPlayable,
  movePlayer,
  normaliseName,
  removePlayer,
  renamePlayer,
  validateName,
} from './players.ts';
import { makePlayers } from '../test/factories.ts';

describe('player names', () => {
  it('trims and collapses whitespace', () => {
    expect(normaliseName('  Robin   Banks  ')).toBe('Robin Banks');
  });

  it('rejects a blank name', () => {
    expect(validateName('   ', [])).toEqual({ ok: false, problem: 'empty' });
  });

  it('rejects a name that is only longer than the limit after trimming is applied', () => {
    expect(validateName('a'.repeat(40), [])).toEqual({ ok: false, problem: 'too-long' });
  });

  it('rejects duplicates regardless of case and surrounding space', () => {
    const players = makePlayers('Robin');
    expect(validateName('  robin ', players)).toEqual({ ok: false, problem: 'duplicate' });
  });

  it('lets a player keep their own name while renaming', () => {
    const players = makePlayers('Robin', 'Sam');
    expect(validateName('Robin', players, 'p1')).toEqual({ ok: true, name: 'Robin' });
    expect(validateName('Sam', players, 'p1')).toEqual({ ok: false, problem: 'duplicate' });
  });
});

describe('roster operations', () => {
  it('adds a trimmed player', () => {
    const result = addPlayer([], '  Ada ');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.players.map((player) => player.name)).toEqual(['Ada']);
  });

  it('refuses to add a duplicate', () => {
    const first = addPlayer([], 'Ada');
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(addPlayer(first.players, 'ADA')).toEqual({ ok: false, problem: 'duplicate' });
  });

  it('refuses to exceed the maximum roster size', () => {
    let players = makePlayers();
    for (let index = 0; index < MAX_PLAYERS; index += 1) {
      const result = addPlayer(players, `Player ${String(index)}`);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      players = [...result.players];
    }
    expect(addPlayer(players, 'One too many')).toEqual({ ok: false, problem: 'roster-full' });
  });

  it('renames without touching the rest of the roster', () => {
    const players = makePlayers('Ada', 'Grace');
    const result = renamePlayer(players, 'p1', ' Ada L ');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.players.map((player) => player.name)).toEqual(['Ada L', 'Grace']);
  });

  it('removes by id', () => {
    expect(removePlayer(makePlayers('Ada', 'Grace'), 'p1').map((p) => p.name)).toEqual(['Grace']);
  });

  it('reorders players and clamps at the ends', () => {
    const players = makePlayers('Ada', 'Grace', 'Alan');
    expect(movePlayer(players, 'p3', -1).map((p) => p.name)).toEqual(['Ada', 'Alan', 'Grace']);
    expect(movePlayer(players, 'p1', -1).map((p) => p.name)).toEqual(['Ada', 'Grace', 'Alan']);
    expect(movePlayer(players, 'p3', 1).map((p) => p.name)).toEqual(['Ada', 'Grace', 'Alan']);
  });

  it('needs at least two players to start', () => {
    expect(isRosterPlayable(makePlayers('Ada'))).toBe(false);
    expect(isRosterPlayable(makePlayers('Ada', 'Grace'))).toBe(true);
  });
});
