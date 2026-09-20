import type { GameSettings } from '../game/types.ts';
import * as engine from '../game/engine.ts';
import {
  addPlayer,
  describeNameProblem,
  movePlayer,
  removePlayer,
  renamePlayer,
} from '../game/players.ts';
import { defaultSettings } from '../game/settings.ts';
import type { RandomSource } from '../game/random.ts';
import type { KeyValueStore } from '../storage/storage.ts';
import { createLocalStore } from '../storage/storage.ts';
import {
  clearPersistedState,
  loadPersistedState,
  savePersistedState,
} from '../storage/persistence.ts';
import type { InstallController } from '../pwa/install.ts';
import type { AppActions, AppState, DialogKind, Screen } from './app-state.ts';
import { createStore } from './store.ts';
import { captureFocus, clear, el, restoreFocus, button } from './dom.ts';
import { renderWelcome } from './screens/welcome.ts';
import { renderPlayers } from './screens/players.ts';
import { renderSettings } from './screens/settings.ts';
import { renderGame } from './screens/game.ts';
import { renderEnd } from './screens/end.ts';
import { renderDialog, trapFocus } from './screens/dialogs.ts';

export interface AppOptions {
  readonly root: HTMLElement;
  /** Injected so tests can run against an in-memory store. */
  readonly store?: KeyValueStore;
  /** Injected so tests can drive a deterministic deck. */
  readonly random?: RandomSource;
  readonly installController?: InstallController;
  /** Called when the user accepts a waiting service worker update. */
  readonly onApplyUpdate?: () => void;
}

export interface App {
  readonly actions: AppActions;
  getState(): AppState;
  /** Marks a service worker update as ready, showing the update prompt. */
  setUpdateReady(): void;
  refreshInstallState(): void;
  destroy(): void;
}

export function createApp(options: AppOptions): App {
  const store = options.store ?? createLocalStore();
  const persisted = loadPersistedState(store);
  const install = options.installController;
  const deps = options.random === undefined ? {} : { random: options.random };

  const initial: AppState = {
    screen: 'welcome',
    players: persisted.players,
    settings: persisted.settings.categories.length > 0 ? persisted.settings : defaultSettings,
    game: persisted.game,
    nameError: null,
    storageBlocked: !store.persistent,
    dialog: null,
    installAvailable: install?.isAvailable() ?? false,
    installed: install?.isInstalled() ?? false,
    updateReady: false,
    announcement: '',
  };

  const state = createStore<AppState>(initial);

  function persist(): void {
    const current = state.getState();
    const saved = savePersistedState(store, {
      players: current.players,
      settings: current.settings,
      game: current.game,
    });
    if (!saved && !current.storageBlocked) state.setState({ storageBlocked: true });
  }

  function announceCard(): void {
    const game = state.getState().game;
    if (game === null || game.currentCard === null) return;
    const card = game.currentCard;
    const who = card.player === undefined ? '' : `${card.player.name}: `;
    state.setState({ announcement: `${who}${card.text}` });
  }

  const actions: AppActions = {
    goTo: (screen: Screen) => {
      state.setState({ screen, dialog: null, nameError: null });
    },
    addPlayer: (name: string) => {
      const result = addPlayer(state.getState().players, name);
      if (!result.ok) {
        state.setState({ nameError: describeNameProblem(result.problem) });
        return;
      }
      state.setState({ players: result.players, nameError: null });
      persist();
    },
    renamePlayer: (id: string, name: string) => {
      const result = renamePlayer(state.getState().players, id, name);
      if (!result.ok) {
        state.setState({ nameError: describeNameProblem(result.problem) });
        return;
      }
      state.setState({ players: result.players, nameError: null });
      persist();
    },
    removePlayer: (id: string) => {
      state.setState({ players: removePlayer(state.getState().players, id), nameError: null });
      persist();
    },
    movePlayer: (id: string, direction: -1 | 1) => {
      state.setState({ players: movePlayer(state.getState().players, id, direction) });
      persist();
    },
    updateSettings: (patch: Partial<GameSettings>) => {
      state.setState((current) => ({ settings: { ...current.settings, ...patch } }));
      persist();
    },
    startGame: () => {
      const current = state.getState();
      const game = engine.startGame(current.players, current.settings, deps);
      state.setState({ game, screen: game.finished ? 'end' : 'game', dialog: null });
      announceCard();
      persist();
    },
    nextCard: () => {
      const current = state.getState();
      if (current.game === null) return;
      const game = engine.nextCard(current.game, deps);
      state.setState({ game, screen: game.finished ? 'end' : 'game' });
      if (!game.finished) announceCard();
      persist();
    },
    skipCard: () => {
      const current = state.getState();
      if (current.game === null) return;
      const game = engine.skipCard(current.game, deps);
      state.setState({ game, screen: game.finished ? 'end' : 'game' });
      if (!game.finished) announceCard();
      persist();
    },
    dismissRule: (ruleId: string) => {
      const current = state.getState();
      if (current.game === null) return;
      state.setState({ game: engine.dismissRule(current.game, ruleId) });
      persist();
    },
    playAgain: () => {
      const current = state.getState();
      if (current.game === null) return;
      const game = engine.playAgain(current.game, deps);
      state.setState({ game, screen: game.finished ? 'end' : 'game' });
      announceCard();
      persist();
    },
    resumeGame: () => {
      const current = state.getState();
      if (current.game === null) return;
      const reconciled = engine.reconcileGameState(current.game, current.players);
      if (reconciled === null) {
        // Too many players were removed for this game to continue.
        state.setState({ game: null, screen: 'players' });
        persist();
        return;
      }
      // A stale card (its player left) is replaced without costing progress.
      const game = reconciled.currentCard === null ? engine.skipCard(reconciled, deps) : reconciled;
      state.setState({ game, screen: game.finished ? 'end' : 'game' });
      announceCard();
      persist();
    },
    abandonGame: () => {
      state.setState({ game: null, screen: 'welcome', dialog: null });
      persist();
    },
    openDialog: (dialog: NonNullable<DialogKind>) => {
      state.setState({ dialog });
    },
    closeDialog: () => {
      state.setState({ dialog: null });
    },
    clearAllData: () => {
      clearPersistedState(store);
      state.setState({
        players: [],
        settings: defaultSettings,
        game: null,
        screen: 'welcome',
        dialog: null,
        nameError: null,
        announcement: 'All stored data has been cleared.',
      });
    },
    install: () => {
      void install?.promptInstall().then(() => {
        state.setState({
          installAvailable: install.isAvailable(),
          installed: install.isInstalled(),
        });
      });
    },
    applyUpdate: () => {
      state.setState({ updateReady: false });
      options.onApplyUpdate?.();
    },
  };

  function renderScreen(current: AppState): HTMLElement {
    switch (current.screen) {
      case 'welcome':
        return renderWelcome(current, actions);
      case 'players':
        return renderPlayers(current, actions);
      case 'settings':
        return renderSettings(current, actions);
      case 'game':
        return renderGame(current, actions);
      case 'end':
        return renderEnd(current, actions);
    }
  }

  let lastScreen: Screen | null = null;
  let lastDialog: DialogKind = null;

  function render(): void {
    const current = state.getState();
    const snapshot = captureFocus(options.root);
    clear(options.root);

    const live = el('div', {
      className: 'visually-hidden',
      attrs: { role: 'status', 'aria-live': 'polite' },
      text: current.announcement,
    });

    const main = el('main', {
      className: 'app-main',
      attrs: { id: 'main' },
      children: [renderScreen(current)],
    });

    const shell = el('div', { className: 'app-shell', children: [live, main] });

    if (current.updateReady) {
      shell.append(
        el('div', {
          className: 'toast',
          attrs: { role: 'status' },
          children: [
            el('p', { className: 'toast-text', text: 'A new version is ready.' }),
            button('Update now', {
              variant: 'btn-primary btn-compact',
              onClick: () => actions.applyUpdate(),
            }),
          ],
        }),
      );
    }

    options.root.append(shell);

    const dialog = renderDialog(current, actions);
    if (dialog !== null) {
      options.root.append(dialog);
      trapFocus(dialog, () => {
        actions.closeDialog();
      });
    }

    const screenChanged = current.screen !== lastScreen;
    const dialogClosed = lastDialog !== null && current.dialog === null;
    if (dialog === null && (screenChanged || dialogClosed)) {
      // Send focus to the new screen's heading so keyboard and screen reader
      // users are not left at the top of the document.
      const heading = main.querySelector<HTMLElement>('[tabindex="-1"]');
      heading?.focus();
    } else {
      restoreFocus(options.root, snapshot);
    }
    lastScreen = current.screen;
    lastDialog = current.dialog;
  }

  const unsubscribe = state.subscribe(render);
  render();

  return {
    actions,
    getState: () => state.getState(),
    setUpdateReady: () => {
      state.setState({ updateReady: true });
    },
    refreshInstallState: () => {
      state.setState({
        installAvailable: install?.isAvailable() ?? false,
        installed: install?.isInstalled() ?? false,
      });
    },
    destroy: () => {
      unsubscribe();
      clear(options.root);
    },
  };
}
