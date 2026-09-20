import type { Player } from '../../game/types.ts';
import { MAX_PLAYERS, MIN_PLAYERS, isRosterPlayable } from '../../game/players.ts';
import { appConfig } from '../../config/app-config.ts';
import type { AppActions, AppState } from '../app-state.ts';
import { button, el } from '../dom.ts';

function renderPlayerRow(
  player: Player,
  index: number,
  total: number,
  actions: AppActions,
): HTMLLIElement {
  const label = el('label', {
    className: 'visually-hidden',
    text: `Player ${String(index + 1)} name`,
    attrs: { for: `player-name-${player.id}` },
  });

  const input = el('input', {
    className: 'player-name',
    attrs: {
      id: `player-name-${player.id}`,
      type: 'text',
      value: player.name,
      maxlength: String(appConfig.maxPlayerNameLength),
      autocomplete: 'off',
      'data-focus-id': `player-${player.id}`,
    },
  });
  input.value = player.name;
  input.addEventListener('change', () => {
    actions.renamePlayer(player.id, input.value);
  });
  input.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      input.blur();
    }
  });

  const controls = el('div', {
    className: 'player-controls',
    children: [
      button('↑', {
        variant: 'btn-icon',
        onClick: () => actions.movePlayer(player.id, -1),
        attrs: {
          'aria-label': `Move ${player.name} up`,
          ...(index === 0 ? { disabled: 'disabled' } : {}),
        },
      }),
      button('↓', {
        variant: 'btn-icon',
        onClick: () => actions.movePlayer(player.id, 1),
        attrs: {
          'aria-label': `Move ${player.name} down`,
          ...(index === total - 1 ? { disabled: 'disabled' } : {}),
        },
      }),
      button('✕', {
        variant: 'btn-icon btn-danger',
        onClick: () => actions.removePlayer(player.id),
        attrs: { 'aria-label': `Remove ${player.name}` },
      }),
    ],
  });

  return el('li', {
    className: 'player-row',
    children: [
      el('span', {
        className: 'player-index',
        text: String(index + 1),
        attrs: { 'aria-hidden': 'true' },
      }),
      label,
      input,
      controls,
    ],
  });
}

export function renderPlayers(state: AppState, actions: AppActions): HTMLElement {
  const full = state.players.length >= MAX_PLAYERS;

  const input = el('input', {
    className: 'field',
    attrs: {
      id: 'new-player',
      type: 'text',
      name: 'new-player',
      maxlength: String(appConfig.maxPlayerNameLength),
      autocomplete: 'off',
      enterkeyhint: 'done',
      placeholder: 'e.g. Robin',
      'data-focus-id': 'new-player',
      'aria-describedby': 'player-hint player-error',
      ...(full ? { disabled: 'disabled' } : {}),
    },
  });

  const form = el('form', {
    className: 'add-player',
    attrs: { novalidate: 'novalidate' },
    children: [
      el('label', { className: 'field-label', text: 'Add a player', attrs: { for: 'new-player' } }),
      el('div', {
        className: 'field-row',
        children: [
          input,
          button('Add', {
            type: 'submit',
            variant: 'btn-primary btn-compact',
            ...(full ? { attrs: { disabled: 'disabled' } } : {}),
          }),
        ],
      }),
      el('p', {
        className: 'field-hint',
        attrs: { id: 'player-hint' },
        text: `${String(MIN_PLAYERS)} to ${String(MAX_PLAYERS)} players. Names must be unique.`,
      }),
      el('p', {
        className: 'field-error',
        attrs: { id: 'player-error', role: 'alert' },
        text: state.nameError ?? '',
      }),
    ],
  });
  form.addEventListener('submit', (event: SubmitEvent) => {
    event.preventDefault();
    actions.addPlayer(input.value);
    input.value = '';
  });

  const list =
    state.players.length === 0
      ? el('p', { className: 'empty-state', text: 'No players yet. Add the first one above.' })
      : el('ol', {
          className: 'player-list',
          children: state.players.map((player, index) =>
            renderPlayerRow(player, index, state.players.length, actions),
          ),
        });

  const canContinue = isRosterPlayable(state.players);

  return el('section', {
    className: 'screen',
    attrs: { 'aria-labelledby': 'players-title' },
    children: [
      el('header', {
        className: 'screen-header',
        children: [
          button('← Back', {
            variant: 'btn-ghost btn-compact',
            onClick: () => actions.goTo('welcome'),
          }),
          el('h1', {
            className: 'screen-title',
            text: "Who's playing?",
            attrs: { id: 'players-title', tabindex: '-1' },
          }),
        ],
      }),
      form,
      el('h2', {
        className: 'section-title',
        text: `Players (${String(state.players.length)} of ${String(MAX_PLAYERS)})`,
      }),
      list,
      el('div', {
        className: 'sticky-actions',
        children: [
          button('Continue to settings', {
            variant: 'btn-primary',
            onClick: () => actions.goTo('settings'),
            attrs: {
              ...(canContinue ? {} : { disabled: 'disabled' }),
              'aria-describedby': 'continue-hint',
            },
          }),
          el('p', {
            className: 'field-hint',
            attrs: { id: 'continue-hint' },
            text: canContinue
              ? 'Pass the phone around once everyone is in the list.'
              : `Add at least ${String(MIN_PLAYERS)} players to continue.`,
          }),
        ],
      }),
    ],
  });
}
