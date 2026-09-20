import type { Audience, GameState, ResolvedCard } from '../../game/types.ts';
import { remainingCardCount } from '../../game/engine.ts';
import type { AppActions, AppState } from '../app-state.ts';
import { button, el } from '../dom.ts';

const AUDIENCE_LABELS: Readonly<Record<Audience, string>> = {
  individual: 'Solo card',
  pair: 'Two players',
  vote: 'Group vote',
  group: 'Everyone',
  rule: 'New rule',
};

/** "Card 4 of 20" for finite games, or a running count for endless ones. */
export function progressLabel(game: GameState): string {
  if (game.targetTurns === null) return `Card ${String(game.turnCount)}`;
  return `Card ${String(game.turnCount)} of ${String(game.targetTurns)}`;
}

function renderTurn(card: ResolvedCard): HTMLElement | null {
  if (card.player === undefined) return null;
  const who =
    card.otherPlayer === undefined
      ? `${card.player.name}’s turn`
      : `${card.player.name} & ${card.otherPlayer.name}`;
  return el('p', { className: 'card-turn', text: who });
}

function renderCard(card: ResolvedCard | null): HTMLElement {
  if (card === null) {
    return el('article', {
      className: 'card',
      children: [el('p', { className: 'card-text', text: 'Shuffling…' })],
    });
  }
  return el('article', {
    className: `card card-${card.category}`,
    attrs: { 'aria-labelledby': 'card-text' },
    children: [
      el('p', { className: 'card-kind', text: AUDIENCE_LABELS[card.audience] }),
      renderTurn(card),
      el('p', { className: 'card-text', text: card.text, attrs: { id: 'card-text' } }),
      card.duration === undefined
        ? null
        : el('p', {
            className: 'card-duration',
            text: `Suggested time: ${String(card.duration)} seconds`,
          }),
    ],
  });
}

function renderRules(state: AppState, actions: AppActions): HTMLElement | null {
  const rules = state.game?.activeRules ?? [];
  if (rules.length === 0) return null;
  return el('section', {
    className: 'rules',
    attrs: { 'aria-labelledby': 'rules-title' },
    children: [
      el('h2', { className: 'rules-title', text: 'Rules in play', attrs: { id: 'rules-title' } }),
      el('ul', {
        className: 'rules-list',
        children: rules.map((rule) =>
          el('li', {
            className: 'rule',
            children: [
              el('span', { className: 'rule-text', text: rule.text }),
              button('✕', {
                variant: 'btn-icon',
                onClick: () => actions.dismissRule(rule.id),
                attrs: { 'aria-label': `Remove rule: ${rule.text}` },
              }),
            ],
          }),
        ),
      }),
    ],
  });
}

export function renderGame(state: AppState, actions: AppActions): HTMLElement {
  const game = state.game;
  if (game === null) {
    return el('section', {
      className: 'screen',
      children: [
        el('h1', {
          className: 'screen-title',
          text: 'No game in progress',
          attrs: { tabindex: '-1' },
        }),
        button('Back to start', { variant: 'btn-primary', onClick: () => actions.goTo('welcome') }),
      ],
    });
  }

  const remaining = remainingCardCount(game);
  const progressBar =
    game.targetTurns === null
      ? null
      : el('div', {
          className: 'progress-track',
          attrs: { 'aria-hidden': 'true' },
          children: [
            el('div', {
              className: 'progress-fill',
              attrs: {
                style: `width: ${String(Math.min(100, Math.round((game.turnCount / game.targetTurns) * 100)))}%`,
              },
            }),
          ],
        });

  return el('section', {
    className: 'screen screen-game',
    attrs: { 'aria-labelledby': 'game-title' },
    children: [
      el('header', {
        className: 'game-header',
        children: [
          el('h1', {
            className: 'visually-hidden',
            text: 'Game in progress',
            attrs: { id: 'game-title', tabindex: '-1' },
          }),
          button('Exit', {
            variant: 'btn-ghost btn-compact',
            onClick: () => actions.openDialog('exit'),
            attrs: { 'aria-label': 'Exit the game' },
          }),
          el('p', { className: 'progress-label', text: progressLabel(game) }),
        ],
      }),
      progressBar,
      renderRules(state, actions),
      el('div', {
        className: 'card-area',
        attrs: { role: 'group', 'aria-label': 'Current card' },
        children: [renderCard(game.currentCard)],
      }),
      el('div', {
        className: 'game-actions',
        children: [
          button('Skip', {
            variant: 'btn-secondary',
            onClick: () => actions.skipCard(),
            attrs: {
              'aria-label': 'Skip this card without penalty',
              ...(remaining === 0 ? { disabled: 'disabled' } : {}),
            },
          }),
          button('Next', {
            variant: 'btn-primary btn-wide',
            onClick: () => actions.nextCard(),
            attrs: { 'data-focus-id': 'next-card' },
          }),
        ],
      }),
      el('p', {
        className: 'footnote centered',
        text:
          remaining <= 5
            ? `${String(remaining)} cards left in this deck.`
            : 'Pass the phone to whoever is up next.',
      }),
    ],
  });
}
