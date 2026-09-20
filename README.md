# Party Deck

A mobile-first party game for a group sharing one phone, built as an installable
Progressive Web App. Everyone adds their name, then the phone gets passed around
while the deck hands out challenges, questions, votes, group instructions and
temporary house rules.

Party Deck is written for adults. It plays exactly the same with alcoholic or
non-alcoholic drinks — there is an alcohol-free mode, nobody is ever told how
much to drink, and every card can be skipped without penalty.

The product name is a placeholder and lives in one file:
[`src/config/app-config.ts`](src/config/app-config.ts). Change it there and the
UI, the document title, the web app manifest and the storage namespace all
follow.

## Technology

| Choice                                                                                  | Why                                                                                       |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [Vite](https://vite.dev)                                                                | Fast dev server, small production output, no framework baggage.                           |
| TypeScript (`strict`, plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`) | The game engine is the interesting part; the compiler keeps its state transitions honest. |
| Vanilla DOM + semantic HTML                                                             | No framework. Screens are plain functions returning elements.                             |
| Vanilla CSS with custom properties                                                      | Design tokens in one file, no build-time CSS tooling.                                     |
| [vite-plugin-pwa](https://vite-pwa-org.netlify.app)                                     | Manifest, Workbox service worker, offline support, update prompt.                         |
| [Vitest](https://vitest.dev) + jsdom                                                    | Unit tests for the engine, DOM tests for the whole flow.                                  |
| ESLint (type-aware) + Prettier                                                          | Consistent style, no `any`.                                                               |

There is no backend, no authentication, no analytics and no external API. No
fonts, images or scripts are fetched from the network at runtime.

## Local setup

```bash
npm install
npm run dev
```

Then open the printed URL. The service worker is disabled in development; to
exercise installability and offline behaviour, use a production build:

```bash
npm run build
npm run preview
```

## Commands

| Command                 | What it does                                                    |
| ----------------------- | --------------------------------------------------------------- |
| `npm run dev`           | Start the dev server with hot module replacement.               |
| `npm run build`         | Type-check, then build to `dist/` including the service worker. |
| `npm run preview`       | Serve the production build locally (service worker active).     |
| `npm run test`          | Run the test suite once.                                        |
| `npm run test:watch`    | Re-run tests on change.                                         |
| `npm run test:coverage` | Run tests with a V8 coverage report in `coverage/`.             |
| `npm run lint`          | ESLint over the whole project.                                  |
| `npm run format`        | Rewrite files with Prettier (`format:check` to verify only).    |
| `npm run typecheck`     | `tsc --noEmit`.                                                 |
| `npm run icons`         | Regenerate the PNG icon set in `public/icons/`.                 |

## Project structure

```
src/
  config/app-config.ts      Product name, colours, limits. The one file to rename in.
  game/                     Pure game logic. No DOM access anywhere in here.
    types.ts                Card, Player, GameSettings, GameState.
    cards/                  Card content, one module per category, plus index.ts.
    random.ts               Seeded PRNG, Fisher-Yates shuffle, randomInt.
    players.ts              Name validation, add/rename/remove/reorder.
    settings.ts             Categories, intensities, lengths and their labels.
    template.ts             {player} / {otherPlayer} / {playerList} substitution.
    deck.ts                 Filtering, drawing, alcohol-free text, card resolution.
    turns.ts                Round-robin rotation and partner selection.
    active-rules.ts         Rules pinned by rule cards.
    engine.ts               The state machine that ties the above together.
  storage/
    storage.ts              localStorage wrapper that survives blocked storage.
    persistence.ts          Schema version, validation, migration, save/load/clear.
  ui/
    app.ts                  Controller: state, actions, rendering, focus management.
    app-state.ts            AppState and the AppActions interface screens call.
    store.ts                Tiny observable store.
    dom.ts                  Element helpers and focus capture/restore.
    screens/                welcome, players, settings, game, end, dialogs.
  pwa/
    install.ts              beforeinstallprompt handling for the install button.
    service-worker.ts       Registration and the update prompt.
  styles/                   tokens.css, base.css, components.css, screens.css.
  test/                     Test setup and factories.
public/
  icons/                    Generated PNG icons and an SVG favicon.
  offline.html              Fallback page for a first visit with no network.
scripts/generate-icons.mjs  Writes the PNGs from a pixel buffer, no dependencies.
```

Game logic never touches the DOM, and rendering never mutates game state: screens
receive a read-only `AppState` plus an `AppActions` object and call actions. Every
source of randomness is injectable, which is how the tests stay deterministic.

## How cards and placeholders work

A card is typed data (see `src/game/types.ts`):

```ts
{
  id: 'cha-14',                 // stable and unique; never reuse for new text
  category: 'challenges',       // icebreakers | questions | votes | challenges | rules
  intensity: 'standard',        // relaxed | standard | chaotic
  audience: 'pair',             // individual | pair | vote | group | rule
  text: '{player} and {otherPlayer} have a conversation in gibberish.',
  duration: 30,                 // optional, seconds, shown as a suggestion
  rule: '{player} is the timekeeper.',   // required for audience: 'rule'
  alcoholFree: true,            // false => an alcoholFreeText must be provided
  alcoholFreeText: '…',         // used instead of `text` in alcohol-free mode
  alcoholFreeRule: '…',         // used instead of `rule` in alcohol-free mode
}
```

Three placeholders are supported and are resolved in one place,
`substitute()` in `src/game/template.ts`:

| Placeholder     | Resolves to                           |
| --------------- | ------------------------------------- |
| `{player}`      | The player whose turn it is.          |
| `{otherPlayer}` | A randomly chosen different player.   |
| `{playerList}`  | Everyone, as `"Ada, Grace and Alan"`. |

If a value is missing, neutral wording is substituted rather than leaving a raw
`{player}` on screen. The engine decides whether a card needs a turn holder or a
partner by looking at its `audience` _and_ at the placeholders it actually uses,
so a `group` card that names one person still gets a name.

Other engine behaviour worth knowing:

- Intensity is cumulative. Chaotic includes relaxed and standard cards.
- Turn order is a round-robin starting from a random player, so nobody is
  skipped and nobody gets two cards in a row.
- A card is never repeated until the filtered deck is exhausted. Skipping marks
  a card as used, so skipped cards do not come straight back.
- Pair cards are filtered out entirely when fewer than two players remain.
- When the deck runs out, the game ends instead of repeating itself.

### Adding cards safely

1. Add the card to the right module in `src/game/cards/`. Use the next free id in
   that file's prefix (`ice-`, `que-`, `vot-`, `cha-`, `rul-`).
2. Match the placeholders to the audience: `individual` and `pair` cards need
   `{player}`, `pair` also needs `{otherPlayer}`, `vote` cards need `{playerList}`.
3. `rule` cards need a short `rule` line — it has to stay readable pinned to the
   top of a phone screen.
4. If the card mentions a drink, set `alcoholFree: false` and write an
   `alcoholFreeText` (and `alcoholFreeRule` if it pins a rule).
5. Read [`CONTENT_GUIDE.md`](CONTENT_GUIDE.md) before writing the wording.
6. Run `npm run test`. `src/game/cards/content.test.ts` enforces all of the above
   mechanically, including the safety constraints.

## PWA installation and offline behaviour

- The manifest is generated from `appConfig`, in standalone display mode, with
  192px, 512px and maskable 512px icons.
- Where the browser supports `beforeinstallprompt` (Chromium), the welcome
  screen shows an **Install app** button that replays the browser's own prompt.
  The button is not rendered at all when installation is not available.
- Browsers that do not expose that event (notably iOS Safari) get written
  instructions in the **How to play** dialog instead.
- After one successful load, the whole game — code, styles, icons and all card
  content — is precached and works with no network. The service worker claims
  the page on first load, so a second visit is not needed. Offline navigations
  are served the precached app shell; `public/offline.html` is precached as a
  last-resort page for a host or browser that cannot serve the shell.
- Updates use `registerType: 'prompt'`. A new version never takes over mid-game:
  a small toast appears and the user chooses when to apply it.

## Local storage and privacy

Party Deck has no accounts and no servers. Player names, settings and the game
currently in progress are written to `localStorage` under a single key,
`party-deck:state`, and never leave the device.

- The stored record carries a schema version. Malformed, truncated or outdated
  data is validated field by field and discarded rather than half-read, and a
  migration path upgrades older records where that is possible.
- If the browser blocks storage (private mode, blocked cookies, an exhausted
  quota), the app falls back to an in-memory store: the game still works for the
  session, and the privacy dialog says so.
- **Privacy and stored data** on the welcome screen explains this in the app and
  offers a confirmed **Clear all stored data** action that removes everything
  immediately.

## Testing

```bash
npm run test           # once
npm run test:coverage  # with a coverage report
```

The suite covers player validation and duplicate names, deck filtering, shuffle
integrity and distribution, placeholder substitution, fair rotation, pair
selection without repeats, duplicate-card prevention, exhausted decks,
alcohol-free transformation, storage parsing and migration, resuming an
interrupted game, the install prompt, and the whole screen flow in jsdom.

The card content itself is tested too: ids are unique, placeholders match the
audience, every drink card has an alcohol-free alternative, and a list of banned
patterns (quantities, pressure, forfeits, drink-and-drive wording) is asserted
against every card.

## Deploying to static hosting

The build is a folder of static files with no server requirements, so any
static host works:

```bash
npm run build
# upload the contents of dist/
```

Two things matter wherever it lands:

- **HTTPS is required** for the service worker (`localhost` is exempt). Without
  it the app still runs, but it cannot be installed and will not work offline.
- The build uses relative URLs (`base: './'`), so it works from a subdirectory
  such as `https://example.com/party-deck/` as well as from a domain root. No
  configuration change is needed either way.

There is no client-side routing, so no SPA rewrite rule is needed. If your host
asks for one anyway, point the fallback at `index.html`.

### GitHub Pages

`.github/workflows/deploy.yml` builds and publishes on every push to the
default branch, and can also be run manually from any branch via **Actions →
Deploy to GitHub Pages → Run workflow**. It runs lint, formatting, tests and
the type-checked build first, so a broken commit is never published.

One-time setup, once per repository: **Settings → Pages → Build and deployment
→ Source: GitHub Actions**. Until that is done, the build succeeds and the
deploy step fails with `Get Pages site failed ... Not Found`. The workflow
cannot do this for you — creating a Pages site needs repository admin rights,
which the workflow's `GITHUB_TOKEN` does not have.

> **Note:** GitHub Pages is free for public repositories. On a _private_
> repository it requires a paid GitHub plan (Pro, Team or Enterprise), and the
> published site is reachable by anyone with the URL regardless. The hosts
> below deploy private repositories on their free tiers.

The site is published at `https://<owner>.github.io/<repo>/`.

### Cloudflare Pages, Netlify or Vercel

Connect the repository and use:

| Setting          | Value           |
| ---------------- | --------------- |
| Build command    | `npm run build` |
| Output directory | `dist`          |
| Node version     | 22              |

No other configuration is needed, and all three serve the site from a domain
root over HTTPS.

### Anything else

`dist/` can be copied straight to S3 + CloudFront, nginx, Caddy, or a USB stick
and opened through any static file server. The only requirement is HTTPS for
the installable and offline behaviour.

## Known MVP limitations

- Card durations are shown as a suggestion; there is no built-in countdown
  timer, so the group times itself.
- Turn order is a round-robin from a random start. It is fair, but it does not
  weight players who have been passed over or who skip often.
- There is a single language (English) and no localisation layer.
- Player names are the only thing that carries between games: there is no
  history, no statistics and deliberately no scoring.
- The 132 cards are plenty for one evening, but a long Endless session with
  every category enabled will eventually exhaust the deck and end the game.
- Reordering players uses up and down buttons rather than drag and drop, which
  is slower but works with a keyboard and a screen reader.
- The service worker precaches everything up front; there is no runtime caching
  strategy because there are no runtime network requests to cache.
