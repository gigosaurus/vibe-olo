/**
 * Single source of truth for product naming and branding.
 *
 * Change the values here to rename the app: the UI, the document title, the
 * web app manifest (read by `vite.config.ts`) and the storage namespace all
 * derive from this object.
 */
export interface AppConfig {
  /** Full product name, shown in headings and in the installed app. */
  readonly name: string;
  /** Short name used on a home screen where space is tight (<= 12 chars). */
  readonly shortName: string;
  /** One-line description used on the welcome screen and in the manifest. */
  readonly description: string;
  /** Tagline shown under the title on the welcome screen. */
  readonly tagline: string;
  /** Browser theme colour and manifest `theme_color`. */
  readonly themeColor: string;
  /** Manifest `background_color`, matching the app background. */
  readonly backgroundColor: string;
  /** Prefix for every localStorage key this app owns. */
  readonly storageNamespace: string;
  /** Minimum and maximum number of players a game accepts. */
  readonly minPlayers: number;
  readonly maxPlayers: number;
  /** Longest accepted player name, in characters. */
  readonly maxPlayerNameLength: number;
}

export const appConfig: AppConfig = {
  name: 'Party Deck',
  shortName: 'PartyDeck',
  description:
    'Pass one phone around the group and let the deck hand out challenges, questions and votes.',
  tagline: 'One phone. One deck. Everybody plays.',
  themeColor: '#12102a',
  backgroundColor: '#12102a',
  storageNamespace: 'party-deck',
  minPlayers: 2,
  maxPlayers: 12,
  maxPlayerNameLength: 16,
};
