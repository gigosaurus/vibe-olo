import { appConfig } from '../../config/app-config.ts';
import type { AppActions, AppState } from '../app-state.ts';
import { button, el } from '../dom.ts';

export function renderWelcome(state: AppState, actions: AppActions): HTMLElement {
  const hasSavedGame = state.game !== null && !state.game.finished;

  const actionsList = el('div', { className: 'stack' });
  if (hasSavedGame) {
    actionsList.append(
      button('Resume game', {
        variant: 'btn-primary',
        onClick: () => actions.resumeGame(),
        attrs: { 'data-focus-id': 'resume' },
      }),
    );
  }
  actionsList.append(
    button(hasSavedGame ? 'Start a new game' : 'Start a game', {
      variant: hasSavedGame ? 'btn-secondary' : 'btn-primary',
      onClick: () => actions.goTo('players'),
      attrs: { 'data-focus-id': 'start' },
    }),
    button('How to play', { onClick: () => actions.openDialog('how-to') }),
  );

  if (state.installAvailable && !state.installed) {
    actionsList.append(
      button('Install app', {
        variant: 'btn-ghost',
        onClick: () => actions.install(),
        attrs: { 'data-focus-id': 'install' },
      }),
    );
  }

  return el('section', {
    className: 'screen screen-welcome',
    attrs: { 'aria-labelledby': 'welcome-title' },
    children: [
      el('div', {
        className: 'brand',
        children: [
          el('p', { className: 'brand-mark', text: '♦ ♣ ♥ ♠' }),
          el('h1', {
            className: 'title',
            text: appConfig.name,
            attrs: { id: 'welcome-title', tabindex: '-1' },
          }),
          el('p', { className: 'tagline', text: appConfig.tagline }),
        ],
      }),
      el('p', { className: 'lede', text: appConfig.description }),
      actionsList,
      el('aside', {
        className: 'notice',
        attrs: { 'aria-labelledby': 'adult-notice-title' },
        children: [
          el('h2', {
            className: 'notice-title',
            text: 'Before you start',
            attrs: { id: 'adult-notice-title' },
          }),
          el('p', {
            text: 'This game is written for adults. Play it with alcoholic or non-alcoholic drinks — there is an alcohol-free mode in the settings, and every card can be skipped without penalty.',
          }),
        ],
      }),
      el('p', {
        className: 'footnote',
        children: [
          'Everything stays on this device. ',
          button('Privacy and stored data', {
            variant: 'btn-link',
            onClick: () => actions.openDialog('privacy'),
          }),
        ],
      }),
    ],
  });
}
