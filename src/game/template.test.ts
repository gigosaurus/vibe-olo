import { describe, expect, it } from 'vitest';
import {
  cardNeedsPartner,
  cardNeedsPlayer,
  formatPlayerList,
  placeholdersIn,
  substitute,
} from './template.ts';
import { makeCard, makePlayers } from '../test/factories.ts';

const players = makePlayers('Ada', 'Grace', 'Alan');

describe('formatPlayerList', () => {
  it('formats one, two and many names', () => {
    expect(formatPlayerList(players.slice(0, 1))).toBe('Ada');
    expect(formatPlayerList(players.slice(0, 2))).toBe('Ada and Grace');
    expect(formatPlayerList(players)).toBe('Ada, Grace and Alan');
  });

  it('falls back when there is nobody', () => {
    expect(formatPlayerList([])).toBe('the group');
  });
});

describe('substitute', () => {
  it('replaces every supported placeholder', () => {
    const text = substitute('{player} and {otherPlayer} face {playerList}.', {
      players,
      player: players[0]!,
      otherPlayer: players[1]!,
    });
    expect(text).toBe('Ada and Grace face Ada, Grace and Alan.');
  });

  it('replaces repeated placeholders', () => {
    expect(substitute('{player}, really, {player}?', { players, player: players[2]! })).toBe(
      'Alan, really, Alan?',
    );
  });

  it('never leaves a raw placeholder on screen when a value is missing', () => {
    const text = substitute('{player} nudges {otherPlayer}.', { players });
    expect(text).not.toContain('{');
    expect(text).toBe('whoever is holding the phone nudges someone else.');
  });

  it('leaves unknown braces alone', () => {
    expect(substitute('Save {50} of these', { players })).toBe('Save {50} of these');
  });

  it('lists the placeholders in a template', () => {
    expect(placeholdersIn('{player} vs {otherPlayer} vs {player}')).toEqual([
      'player',
      'otherPlayer',
      'player',
    ]);
  });
});

describe('card audience detection', () => {
  it('treats individual and pair cards as needing a turn holder', () => {
    expect(
      cardNeedsPlayer(makeCard({ id: 'a', audience: 'individual', text: '{player} go' })),
    ).toBe(true);
    expect(
      cardNeedsPlayer(makeCard({ id: 'b', audience: 'pair', text: '{player} {otherPlayer}' })),
    ).toBe(true);
  });

  it('detects a group card that still names one player', () => {
    const card = makeCard({ id: 'c', audience: 'group', text: 'Everyone points at {player}.' });
    expect(cardNeedsPlayer(card)).toBe(true);
    expect(cardNeedsPartner(card)).toBe(false);
  });

  it('detects a rule card whose pinned rule names a player', () => {
    const card = makeCard({
      id: 'd',
      audience: 'rule',
      text: 'New rule.',
      rule: '{player} decides.',
    });
    expect(cardNeedsPlayer(card)).toBe(true);
  });

  it('ignores plain group cards', () => {
    expect(
      cardNeedsPlayer(makeCard({ id: 'e', audience: 'group', text: 'Everyone stands up.' })),
    ).toBe(false);
  });
});
