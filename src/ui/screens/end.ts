import type { AppActions, AppState } from '../app-state.ts';
import { button, el } from '../dom.ts';

export function renderEnd(state: AppState, actions: AppActions): HTMLElement {
  const reason = state.game?.endReason ?? 'completed';
  const cardsPlayed = state.game?.turnCount ?? 0;
  const message =
    reason === 'deck-exhausted'
      ? 'You have played every card that matched your settings. Change the mix to keep going.'
      : 'That is the end of the deck for tonight. Hope somebody got it on video.';

  return el('section', {
    className: 'screen screen-end',
    attrs: { 'aria-labelledby': 'end-title' },
    children: [
      el('p', { className: 'brand-mark', text: '♦ ♣ ♥ ♠' }),
      el('h1', {
        className: 'title',
        text: 'Deck finished',
        attrs: { id: 'end-title', tabindex: '-1' },
      }),
      el('p', { className: 'lede', text: message }),
      el('p', {
        className: 'footnote centered',
        text: `${String(cardsPlayed)} cards played. No scores, no winners — that was the point.`,
      }),
      el('div', {
        className: 'stack',
        children: [
          button('Play again with the same group', {
            variant: 'btn-primary',
            onClick: () => actions.playAgain(),
            attrs: { 'data-focus-id': 'play-again' },
          }),
          button('Change settings', { onClick: () => actions.goTo('settings') }),
          button('Back to start', {
            variant: 'btn-ghost',
            onClick: () => actions.goTo('welcome'),
          }),
        ],
      }),
    ],
  });
}
