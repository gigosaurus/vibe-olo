import { appConfig } from '../../config/app-config.ts';
import type { AppActions, AppState } from '../app-state.ts';
import { button, el } from '../dom.ts';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/** Keeps Tab inside an open dialog and sends Escape to the close action. */
export function trapFocus(container: HTMLElement, onEscape: () => void): void {
  const focusables = [...container.querySelectorAll<HTMLElement>(FOCUSABLE)];
  const first = focusables[0];
  first?.focus();
  container.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onEscape();
      return;
    }
    if (event.key !== 'Tab' || focusables.length === 0) return;
    const last = focusables[focusables.length - 1] as HTMLElement;
    const start = focusables[0] as HTMLElement;
    if (event.shiftKey && document.activeElement === start) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      start.focus();
    }
  });
}

function shell(
  titleId: string,
  title: string,
  body: readonly Node[],
  footer: readonly Node[],
  actions: AppActions,
): HTMLElement {
  const panel = el('div', {
    className: 'dialog',
    attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId },
    children: [
      el('h2', { className: 'dialog-title', text: title, attrs: { id: titleId } }),
      el('div', { className: 'dialog-body', children: body }),
      el('div', { className: 'dialog-actions', children: footer }),
    ],
  });
  const overlay = el('div', { className: 'overlay', children: [panel] });
  overlay.addEventListener('click', (event: MouseEvent) => {
    if (event.target === overlay) actions.closeDialog();
  });
  return overlay;
}

function howToPlay(state: AppState, actions: AppActions): HTMLElement {
  return shell(
    'how-to-title',
    'How to play',
    (
      [
        el('ol', {
          className: 'steps',
          children: [
            el('li', { text: 'Add everyone who is playing, then choose your settings.' }),
            el('li', { text: 'Put the phone in the middle. Whoever is named on the card acts.' }),
            el('li', {
              text: 'Tap Next for the following card, or Skip — skipping costs nothing.',
            }),
            el('li', { text: 'Rule cards stay pinned at the top until someone removes them.' }),
          ],
        }),
        el('h3', { className: 'dialog-subtitle', text: 'House rules' }),
        el('ul', {
          className: 'bullets',
          children: [
            el('li', { text: 'Anyone can pass on any card, at any time, for any reason.' }),
            el('li', { text: 'Nobody is ever told how much to drink. Sips are always optional.' }),
            el('li', { text: 'Switch on alcohol-free mode and the deck plays exactly the same.' }),
          ],
        }),
        state.installAvailable || state.installed
          ? null
          : el('div', {
              children: [
                el('h3', { className: 'dialog-subtitle', text: `Install ${appConfig.name}` }),
                el('ul', {
                  className: 'bullets',
                  children: [
                    el('li', { text: 'iPhone or iPad: tap Share, then "Add to Home Screen".' }),
                    el('li', { text: 'Android: open the browser menu, then "Install app".' }),
                    el('li', { text: 'Desktop: use the install icon in the address bar.' }),
                  ],
                }),
              ],
            }),
      ] as (HTMLElement | null)[]
    ).filter((node): node is HTMLElement => node !== null),
    [button('Got it', { variant: 'btn-primary', onClick: () => actions.closeDialog() })],
    actions,
  );
}

function privacy(state: AppState, actions: AppActions): HTMLElement {
  return shell(
    'privacy-title',
    'Privacy and stored data',
    [
      el('p', {
        text: `${appConfig.name} has no accounts, no servers and no analytics. Player names, your settings and the game you are in the middle of are stored in this browser only.`,
      }),
      el('p', {
        text: state.storageBlocked
          ? 'This browser is blocking storage, so nothing is being saved. The game still works until you close the tab.'
          : 'Clearing the data below removes all of it immediately and cannot be undone.',
      }),
    ],
    [
      button('Clear all stored data', {
        variant: 'btn-danger',
        onClick: () => actions.openDialog('clear-data'),
      }),
      button('Close', { onClick: () => actions.closeDialog() }),
    ],
    actions,
  );
}

function confirmExit(actions: AppActions): HTMLElement {
  return shell(
    'exit-title',
    'Leave this game?',
    [el('p', { text: 'The current game will be discarded. Your players and settings are kept.' })],
    [
      button('Leave game', { variant: 'btn-danger', onClick: () => actions.abandonGame() }),
      button('Keep playing', { variant: 'btn-primary', onClick: () => actions.closeDialog() }),
    ],
    actions,
  );
}

function confirmClear(actions: AppActions): HTMLElement {
  return shell(
    'clear-title',
    'Clear all stored data?',
    [el('p', { text: 'Players, settings and any saved game will be removed from this device.' })],
    [
      button('Delete everything', { variant: 'btn-danger', onClick: () => actions.clearAllData() }),
      button('Cancel', { variant: 'btn-primary', onClick: () => actions.closeDialog() }),
    ],
    actions,
  );
}

export function renderDialog(state: AppState, actions: AppActions): HTMLElement | null {
  switch (state.dialog) {
    case 'how-to':
      return howToPlay(state, actions);
    case 'privacy':
      return privacy(state, actions);
    case 'exit':
      return confirmExit(actions);
    case 'clear-data':
      return confirmClear(actions);
    case null:
      return null;
  }
}
