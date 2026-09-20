/**
 * Thin key/value abstraction over `localStorage`.
 *
 * Browsers throw on `localStorage` access in a few real situations: Safari in
 * private mode, third-party iframes, and "block all cookies" settings. Every
 * call here is guarded, and the store silently degrades to an in-memory map so
 * that a blocked browser loses persistence but never loses the game.
 */
export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): boolean;
  remove(key: string): void;
  /** `false` when writes are not actually persisted between sessions. */
  readonly persistent: boolean;
}

export function createMemoryStore(): KeyValueStore {
  const map = new Map<string, string>();
  return {
    get: (key) => map.get(key) ?? null,
    set: (key, value) => {
      map.set(key, value);
      return true;
    },
    remove: (key) => {
      map.delete(key);
    },
    persistent: false,
  };
}

function probe(storage: Storage): boolean {
  const key = '__party_deck_probe__';
  try {
    storage.setItem(key, '1');
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns a persistent store when `localStorage` works, and an in-memory
 * fallback otherwise. Never throws.
 */
function readLocalStorage(): Storage | null {
  try {
    return globalThis.localStorage;
  } catch {
    // Accessing the property itself throws when cookies are fully blocked.
    return null;
  }
}

export function createLocalStore(): KeyValueStore {
  const backing = readLocalStorage();
  if (backing === null || !probe(backing)) return createMemoryStore();
  return {
    get: (key) => {
      try {
        return backing.getItem(key);
      } catch {
        return null;
      }
    },
    set: (key, value) => {
      try {
        backing.setItem(key, value);
        return true;
      } catch {
        // Quota exceeded or storage revoked mid-session.
        return false;
      }
    },
    remove: (key) => {
      try {
        backing.removeItem(key);
      } catch {
        // Nothing useful to do; the caller keeps its in-memory copy.
      }
    },
    persistent: true,
  };
}
