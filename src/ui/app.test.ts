import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from './app.ts';
import type { App } from './app.ts';
import { createMemoryStore } from '../storage/storage.ts';
import type { KeyValueStore } from '../storage/storage.ts';
import { createSeededRandom } from '../game/random.ts';

function mount(store: KeyValueStore, seed = 17): { app: App; root: HTMLElement } {
  const root = document.createElement('div');
  document.body.append(root);
  const app = createApp({ root, store, random: createSeededRandom(seed) });
  return { app, root };
}

function buttonByText(root: ParentNode, text: string): HTMLButtonElement {
  const match = [...root.querySelectorAll('button')].find(
    (node) => node.textContent?.trim() === text,
  );
  if (match === undefined) throw new Error(`No button labelled "${text}"`);
  return match;
}

function addPlayer(root: HTMLElement, name: string): void {
  const input = root.querySelector<HTMLInputElement>('#new-player');
  if (input === null) throw new Error('Player input missing');
  input.value = name;
  const form = input.closest('form');
  form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

function setUpThreePlayers(root: HTMLElement): void {
  buttonByText(root, 'Start a game').click();
  addPlayer(root, 'Ada');
  addPlayer(root, 'Grace');
  addPlayer(root, 'Alan');
}

describe('welcome screen', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('shows the game name and the adult notice', () => {
    const { root } = mount(createMemoryStore());
    expect(root.querySelector('h1')?.textContent).toBe('Party Deck');
    expect(root.textContent).toContain('written for adults');
  });

  it('hides the install button until the browser offers one', () => {
    const { root } = mount(createMemoryStore());
    expect(() => buttonByText(root, 'Install app')).toThrow();
  });

  it('keeps Tab inside an open dialog and closes it with Escape', () => {
    const { root } = mount(createMemoryStore());
    buttonByText(root, 'How to play').click();
    const dialog = root.querySelector<HTMLElement>('[role="dialog"]');
    expect(document.activeElement).toBe(dialog?.querySelector('button'));

    // Only one focusable control in this dialog, so Tab must cycle back to it.
    dialog?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(document.activeElement).toBe(dialog?.querySelector('button'));
    dialog?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }),
    );
    expect(document.activeElement).toBe(dialog?.querySelector('button'));

    dialog?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(root.querySelector('[role="dialog"]')).toBeNull();
  });

  it('opens the how-to dialog and closes it again', () => {
    const { root } = mount(createMemoryStore());
    buttonByText(root, 'How to play').click();
    const dialog = root.querySelector('[role="dialog"]');
    expect(dialog?.textContent).toContain('How to play');
    buttonByText(root, 'Got it').click();
    expect(root.querySelector('[role="dialog"]')).toBeNull();
  });
});

describe('player setup', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('adds trimmed players and keeps the continue action disabled until valid', () => {
    const { root } = mount(createMemoryStore());
    buttonByText(root, 'Start a game').click();
    expect(buttonByText(root, 'Continue to settings').disabled).toBe(true);

    addPlayer(root, '  Ada  ');
    expect(root.querySelector<HTMLInputElement>('.player-name')?.value).toBe('Ada');
    expect(buttonByText(root, 'Continue to settings').disabled).toBe(true);

    addPlayer(root, 'Grace');
    expect(buttonByText(root, 'Continue to settings').disabled).toBe(false);
  });

  it('reports a duplicate name without adding it', () => {
    const { root } = mount(createMemoryStore());
    buttonByText(root, 'Start a game').click();
    addPlayer(root, 'Ada');
    addPlayer(root, 'ada');
    expect(root.querySelector('#player-error')?.textContent).toContain('already taken');
    expect(root.querySelectorAll('.player-row')).toHaveLength(1);
  });

  it('reorders and removes players', () => {
    const { root } = mount(createMemoryStore());
    setUpThreePlayers(root);
    const names = (): string[] =>
      [...root.querySelectorAll<HTMLInputElement>('.player-name')].map((input) => input.value);
    expect(names()).toEqual(['Ada', 'Grace', 'Alan']);

    buttonByText(root, '↓').click(); // first row's "move down"
    expect(names()).toEqual(['Grace', 'Ada', 'Alan']);

    const remove = root.querySelector<HTMLButtonElement>('[aria-label="Remove Grace"]');
    remove?.click();
    expect(names()).toEqual(['Ada', 'Alan']);
  });

  it('persists the roster', () => {
    const store = createMemoryStore();
    const first = mount(store);
    setUpThreePlayers(first.root);
    first.app.destroy();

    const second = mount(store);
    buttonByText(second.root, 'Start a game').click();
    expect(second.root.querySelectorAll('.player-row')).toHaveLength(3);
  });
});

describe('settings screen', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('requires at least one category', () => {
    const { root } = mount(createMemoryStore());
    setUpThreePlayers(root);
    buttonByText(root, 'Continue to settings').click();

    // Each change re-renders the screen, so the list has to be re-queried.
    const checked = (): HTMLInputElement[] =>
      [...root.querySelectorAll<HTMLInputElement>('input[name="categories"]')].filter(
        (box) => box.checked,
      );
    expect(checked().length).toBeGreaterThan(0);
    for (let guard = 0; guard < 10 && checked().length > 0; guard += 1) {
      const box = checked()[0]!;
      box.checked = false;
      box.dispatchEvent(new Event('change'));
    }
    expect(checked()).toHaveLength(0);
    expect(root.querySelector('#category-error')?.textContent).toContain('at least one');
    expect(buttonByText(root, 'Deal the first card').disabled).toBe(true);
  });

  it('keeps alcohol-free mode when it is switched on', () => {
    const store = createMemoryStore();
    const { root, app } = mount(store);
    setUpThreePlayers(root);
    buttonByText(root, 'Continue to settings').click();
    const toggle = root.querySelector<HTMLInputElement>('#alcohol-free');
    toggle!.checked = true;
    toggle!.dispatchEvent(new Event('change'));
    expect(app.getState().settings.alcoholFree).toBe(true);
  });

  it('keeps focus on a control after toggling it', () => {
    const { root } = mount(createMemoryStore());
    setUpThreePlayers(root);
    buttonByText(root, 'Continue to settings').click();
    const box = root.querySelector<HTMLInputElement>('#category-votes');
    box!.focus();
    box!.checked = false;
    box!.dispatchEvent(new Event('change'));
    expect(document.activeElement?.id).toBe('category-votes');
  });
});

describe('gameplay', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  function startGame(store: KeyValueStore): { app: App; root: HTMLElement } {
    const mounted = mount(store);
    setUpThreePlayers(mounted.root);
    buttonByText(mounted.root, 'Continue to settings').click();
    buttonByText(mounted.root, 'Deal the first card').click();
    return mounted;
  }

  it('shows a card with next and skip controls', () => {
    const { root } = startGame(createMemoryStore());
    expect(root.querySelector('.card-text')?.textContent?.length).toBeGreaterThan(5);
    expect(root.querySelector('.progress-label')?.textContent).toBe('Card 1 of 40');
    expect(buttonByText(root, 'Next')).toBeTruthy();
    expect(buttonByText(root, 'Skip')).toBeTruthy();
  });

  it('never leaves an unresolved placeholder on a card', () => {
    const { root } = startGame(createMemoryStore());
    for (let turn = 0; turn < 30; turn += 1) {
      const text = root.querySelector('.card-text')?.textContent ?? '';
      expect(text).not.toMatch(/\{\w+\}/);
      const next = [...root.querySelectorAll('button')].find(
        (node) => node.textContent?.trim() === 'Next',
      );
      if (next === undefined) break;
      next.click();
    }
  });

  it('advances progress on next but not on skip', () => {
    const { root } = startGame(createMemoryStore());
    buttonByText(root, 'Skip').click();
    expect(root.querySelector('.progress-label')?.textContent).toBe('Card 1 of 40');
    buttonByText(root, 'Next').click();
    expect(root.querySelector('.progress-label')?.textContent).toBe('Card 2 of 40');
  });

  it('announces each new card in the live region', () => {
    const { root } = startGame(createMemoryStore());
    const live = root.querySelector('[aria-live="polite"]');
    const first = live?.textContent;
    expect(first?.length).toBeGreaterThan(5);
    buttonByText(root, 'Next').click();
    expect(root.querySelector('[aria-live="polite"]')?.textContent).not.toBe(first);
  });

  it('confirms before abandoning a game', () => {
    const { root, app } = startGame(createMemoryStore());
    buttonByText(root, 'Exit').click();
    expect(root.querySelector('[role="dialog"]')?.textContent).toContain('Leave this game?');

    buttonByText(root, 'Keep playing').click();
    expect(app.getState().screen).toBe('game');

    buttonByText(root, 'Exit').click();
    buttonByText(root, 'Leave game').click();
    expect(app.getState().screen).toBe('welcome');
    expect(app.getState().game).toBeNull();
  });

  it('resumes the same card after an accidental refresh', () => {
    const store = createMemoryStore();
    const first = startGame(store);
    buttonByText(first.root, 'Next').click();
    const cardText = first.root.querySelector('.card-text')?.textContent;
    const progress = first.root.querySelector('.progress-label')?.textContent;
    first.app.destroy();

    const second = mount(store);
    buttonByText(second.root, 'Resume game').click();
    expect(second.root.querySelector('.card-text')?.textContent).toBe(cardText);
    expect(second.root.querySelector('.progress-label')?.textContent).toBe(progress);
  });

  it('reaches the end screen and can play again', () => {
    const store = createMemoryStore();
    const { root, app } = mount(store);
    setUpThreePlayers(root);
    buttonByText(root, 'Continue to settings').click();
    const shortLength = root.querySelector<HTMLInputElement>('#length-short');
    shortLength!.checked = true;
    shortLength!.dispatchEvent(new Event('change'));
    buttonByText(root, 'Deal the first card').click();

    for (let turn = 0; turn < 40 && app.getState().screen === 'game'; turn += 1) {
      buttonByText(root, 'Next').click();
    }
    expect(app.getState().screen).toBe('end');
    expect(root.textContent).toContain('Deck finished');

    buttonByText(root, 'Play again with the same group').click();
    expect(app.getState().screen).toBe('game');
    expect(app.getState().game?.turnCount).toBe(1);
  });
});

describe('service worker updates', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('offers an update and applies it when accepted', () => {
    let applied = 0;
    const root = document.createElement('div');
    document.body.append(root);
    const app = createApp({
      root,
      store: createMemoryStore(),
      random: createSeededRandom(1),
      onApplyUpdate: () => {
        applied += 1;
      },
    });

    expect(root.querySelector('.toast')).toBeNull();
    app.setUpdateReady();
    expect(root.querySelector('.toast')?.textContent).toContain('A new version is ready.');

    buttonByText(root, 'Update now').click();
    expect(applied).toBe(1);
    expect(root.querySelector('.toast')).toBeNull();
  });

  it('shows the install button only when the browser offers one', () => {
    const root = document.createElement('div');
    document.body.append(root);
    const controller = {
      isAvailable: () => true,
      isInstalled: () => false,
      promptInstall: () => Promise.resolve('accepted' as const),
      dispose: () => undefined,
    };
    createApp({
      root,
      store: createMemoryStore(),
      random: createSeededRandom(1),
      installController: controller,
    });
    expect(buttonByText(root, 'Install app')).toBeTruthy();
  });
});

describe('privacy controls', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('clears everything stored on the device', () => {
    const store = createMemoryStore();
    const { root, app } = mount(store);
    setUpThreePlayers(root);
    buttonByText(root, '← Back').click();

    buttonByText(root, 'Privacy and stored data').click();
    buttonByText(root, 'Clear all stored data').click();
    buttonByText(root, 'Delete everything').click();

    expect(app.getState().players).toEqual([]);
    expect(store.get('party-deck:state')).toBeNull();
    expect(app.getState().screen).toBe('welcome');
  });
});
