import type { Category, GameLength, Intensity } from '../../game/types.ts';
import {
  CATEGORIES,
  CATEGORY_HINTS,
  CATEGORY_LABELS,
  GAME_LENGTHS,
  INTENSITIES,
  INTENSITY_HINTS,
  INTENSITY_LABELS,
  LENGTH_HINTS,
  LENGTH_LABELS,
  isSettingsValid,
  toggleCategory,
} from '../../game/settings.ts';
import { countPlayableCards } from '../../game/engine.ts';
import type { AppActions, AppState } from '../app-state.ts';
import { button, el } from '../dom.ts';

function optionGroup<T extends string>(
  name: string,
  legend: string,
  values: readonly T[],
  labels: Readonly<Record<T, string>>,
  hints: Readonly<Record<T, string>>,
  selected: T,
  onSelect: (value: T) => void,
): HTMLFieldSetElement {
  const options = values.map((value) => {
    const id = `${name}-${value}`;
    const input = el('input', {
      className: 'option-input',
      attrs: {
        type: 'radio',
        name,
        id,
        value,
        'data-focus-id': id,
        ...(value === selected ? { checked: 'checked' } : {}),
      },
    });
    input.checked = value === selected;
    input.addEventListener('change', () => {
      if (input.checked) onSelect(value);
    });
    return el('div', {
      className: 'option',
      children: [
        input,
        el('label', {
          className: 'option-label',
          attrs: { for: id },
          children: [
            el('span', { className: 'option-name', text: labels[value] }),
            el('span', { className: 'option-hint', text: hints[value] }),
          ],
        }),
      ],
    });
  });

  return el('fieldset', {
    className: 'group',
    children: [el('legend', { className: 'group-legend', text: legend }), ...options],
  });
}

function categoryGroup(
  selected: readonly Category[],
  onToggle: (category: Category, enabled: boolean) => void,
): HTMLFieldSetElement {
  const options = CATEGORIES.map((category) => {
    const id = `category-${category}`;
    const input = el('input', {
      className: 'option-input',
      attrs: { type: 'checkbox', id, name: 'categories', value: category, 'data-focus-id': id },
    });
    input.checked = selected.includes(category);
    input.addEventListener('change', () => {
      onToggle(category, input.checked);
    });
    return el('div', {
      className: 'option',
      children: [
        input,
        el('label', {
          className: 'option-label',
          attrs: { for: id },
          children: [
            el('span', { className: 'option-name', text: CATEGORY_LABELS[category] }),
            el('span', { className: 'option-hint', text: CATEGORY_HINTS[category] }),
          ],
        }),
      ],
    });
  });

  return el('fieldset', {
    className: 'group',
    attrs: { 'aria-describedby': 'category-error' },
    children: [
      el('legend', { className: 'group-legend', text: 'Card types' }),
      ...options,
      el('p', {
        className: 'field-error',
        attrs: { id: 'category-error', role: 'alert' },
        text: selected.length === 0 ? 'Choose at least one card type.' : '',
      }),
    ],
  });
}

export function renderSettings(state: AppState, actions: AppActions): HTMLElement {
  const { settings } = state;
  const valid = isSettingsValid(settings);
  const playable = countPlayableCards(settings, state.players.length);
  const canStart = valid && playable > 0 && state.players.length > 0;

  const alcoholFreeInput = el('input', {
    className: 'switch-input',
    attrs: { type: 'checkbox', id: 'alcohol-free', 'data-focus-id': 'alcohol-free' },
  });
  alcoholFreeInput.checked = settings.alcoholFree;
  alcoholFreeInput.addEventListener('change', () => {
    actions.updateSettings({ alcoholFree: alcoholFreeInput.checked });
  });

  return el('section', {
    className: 'screen',
    attrs: { 'aria-labelledby': 'settings-title' },
    children: [
      el('header', {
        className: 'screen-header',
        children: [
          button('← Back', {
            variant: 'btn-ghost btn-compact',
            onClick: () => actions.goTo('players'),
          }),
          el('h1', {
            className: 'screen-title',
            text: 'Game settings',
            attrs: { id: 'settings-title', tabindex: '-1' },
          }),
        ],
      }),
      optionGroup<Intensity>(
        'intensity',
        'Intensity',
        INTENSITIES,
        INTENSITY_LABELS,
        INTENSITY_HINTS,
        settings.intensity,
        (intensity) => {
          actions.updateSettings({ intensity });
        },
      ),
      optionGroup<GameLength>(
        'length',
        'Game length',
        GAME_LENGTHS,
        LENGTH_LABELS,
        LENGTH_HINTS,
        settings.length,
        (length) => {
          actions.updateSettings({ length });
        },
      ),
      categoryGroup(settings.categories, (category, enabled) => {
        actions.updateSettings(toggleCategory(settings, category, enabled));
      }),
      el('div', {
        className: 'switch',
        children: [
          alcoholFreeInput,
          el('label', {
            className: 'switch-label',
            attrs: { for: 'alcohol-free' },
            children: [
              el('span', { className: 'option-name', text: 'Alcohol-free mode' }),
              el('span', {
                className: 'option-hint',
                text: 'Replaces every drink mention with a harmless alternative. Nothing else changes.',
              }),
            ],
          }),
        ],
      }),
      el('p', {
        className: 'field-hint',
        attrs: { 'aria-live': 'polite' },
        text: canStart
          ? `${String(playable)} cards match these settings.`
          : 'No cards match these settings yet. Turn on another card type.',
      }),
      el('div', {
        className: 'sticky-actions',
        children: [
          button('Deal the first card', {
            variant: 'btn-primary',
            onClick: () => actions.startGame(),
            attrs: { ...(canStart ? {} : { disabled: 'disabled' }), 'data-focus-id': 'start-game' },
          }),
        ],
      }),
    ],
  });
}
