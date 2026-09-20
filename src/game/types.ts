/** Domain types shared by the game engine, the card data and the UI. */

/** Content grouping a player can switch on or off in settings. */
export type Category = 'icebreakers' | 'questions' | 'votes' | 'challenges' | 'rules';

/** How bold the deck gets. Cards are tagged with exactly one level. */
export type Intensity = 'relaxed' | 'standard' | 'chaotic';

/** How long a game runs before the end screen appears. */
export type GameLength = 'short' | 'standard' | 'endless';

/**
 * Who a card is aimed at. This drives placeholder resolution and the turn
 * indicator, not the rendering style.
 *
 * - `individual` - one player acts; `{player}` is required.
 * - `pair` - two distinct players; `{player}` and `{otherPlayer}` are required.
 * - `vote` - the group votes about someone; `{playerList}` is usually present.
 * - `group` - everybody acts at once; no turn indicator.
 * - `rule` - creates a temporary rule that stays on screen until removed.
 */
export type Audience = 'individual' | 'pair' | 'vote' | 'group' | 'rule';

/** A single card as authored in `src/game/cards/`. */
export interface Card {
  /** Stable unique id. Never reuse an id for different text. */
  readonly id: string;
  readonly category: Category;
  readonly intensity: Intensity;
  readonly audience: Audience;
  /** Prompt text, possibly containing `{player}`, `{otherPlayer}`, `{playerList}`. */
  readonly text: string;
  /** Optional countdown in seconds, for cards that describe a timed bit. */
  readonly duration?: number;
  /** Required for `rule` cards: the short line pinned to the rules strip. */
  readonly rule?: string;
  /**
   * `true` when the card works unchanged without alcohol. `false` means the
   * card mentions drinking and needs `alcoholFreeText` when the group plays
   * alcohol-free.
   */
  readonly alcoholFree: boolean;
  /** Replacement text used in alcohol-free mode when `alcoholFree` is false. */
  readonly alcoholFreeText?: string;
  /** Replacement rule line used in alcohol-free mode, for rule cards. */
  readonly alcoholFreeRule?: string;
}

/** A player as stored and displayed. */
export interface Player {
  readonly id: string;
  readonly name: string;
}

/** Everything the deck filter needs to know about a group's choices. */
export interface GameSettings {
  readonly intensity: Intensity;
  readonly length: GameLength;
  readonly categories: readonly Category[];
  readonly alcoholFree: boolean;
}

/** A rule card that is currently in force. */
export interface ActiveRule {
  readonly id: string;
  /** Card id that created the rule, used to avoid duplicates. */
  readonly cardId: string;
  readonly text: string;
  /** Name of the player who was on turn when the rule appeared, if any. */
  readonly owner?: string;
}

/** A card after placeholders are resolved and alcohol-free text is applied. */
export interface ResolvedCard {
  readonly cardId: string;
  readonly category: Category;
  readonly audience: Audience;
  readonly intensity: Intensity;
  /** Final, display-ready prompt. */
  readonly text: string;
  readonly duration?: number;
  /** Final rule line for rule cards. */
  readonly rule?: string;
  /** Player on turn, when the card concerns a specific player. */
  readonly player?: Player;
  /** Second player, for pair cards. */
  readonly otherPlayer?: Player;
}

/** Serialisable game state. This is what gets written to localStorage. */
export interface GameState {
  readonly players: readonly Player[];
  readonly settings: GameSettings;
  /** Card currently on screen, or `null` before the first draw. */
  readonly currentCard: ResolvedCard | null;
  /** Card ids already shown in this game, newest last. */
  readonly usedCardIds: readonly string[];
  /** Rules currently pinned. */
  readonly activeRules: readonly ActiveRule[];
  /** Number of cards revealed so far, including the current one. */
  readonly turnCount: number;
  /** Total cards this game will show, or `null` for endless games. */
  readonly targetTurns: number | null;
  /** Index into `players` of whoever most recently had a turn. */
  readonly lastPlayerIndex: number;
  /** `true` once the group has reached the end of the game. */
  readonly finished: boolean;
  /** Reason the game ended, used for the end screen copy. */
  readonly endReason: EndReason | null;
}

export type EndReason = 'completed' | 'deck-exhausted';
