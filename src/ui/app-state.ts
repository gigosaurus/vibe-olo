import type { GameSettings, GameState, Player } from '../game/types.ts';

export type Screen = 'welcome' | 'players' | 'settings' | 'game' | 'end';
export type DialogKind = 'how-to' | 'privacy' | 'exit' | 'clear-data' | null;

export interface AppState {
  readonly screen: Screen;
  readonly players: readonly Player[];
  readonly settings: GameSettings;
  readonly game: GameState | null;
  /** Validation message under the "add player" field, if any. */
  readonly nameError: string | null;
  /** `true` when the browser refuses to persist anything. */
  readonly storageBlocked: boolean;
  readonly dialog: DialogKind;
  /** `true` once the browser has offered an install prompt we can replay. */
  readonly installAvailable: boolean;
  /** `true` once the app is running from the home screen. */
  readonly installed: boolean;
  /** `true` when a new service worker is waiting to take over. */
  readonly updateReady: boolean;
  /** Text pushed to the polite live region. */
  readonly announcement: string;
}

/** Actions screens may call. Screens never touch the store directly. */
export interface AppActions {
  goTo(screen: Screen): void;
  addPlayer(name: string): void;
  renamePlayer(id: string, name: string): void;
  removePlayer(id: string): void;
  movePlayer(id: string, direction: -1 | 1): void;
  updateSettings(patch: Partial<GameSettings>): void;
  startGame(): void;
  nextCard(): void;
  skipCard(): void;
  dismissRule(ruleId: string): void;
  playAgain(): void;
  resumeGame(): void;
  abandonGame(): void;
  openDialog(dialog: NonNullable<DialogKind>): void;
  closeDialog(): void;
  clearAllData(): void;
  install(): void;
  applyUpdate(): void;
}
