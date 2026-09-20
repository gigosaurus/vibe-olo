/** Minimal observable state container. No dependencies, no magic. */
export interface Store<T> {
  getState(): T;
  /** Applies a shallow patch and notifies subscribers if anything changed. */
  setState(patch: Partial<T> | ((state: T) => Partial<T>)): void;
  subscribe(listener: (state: T) => void): () => void;
}

export function createStore<T extends object>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<(state: T) => void>();
  return {
    getState: () => state,
    setState: (patch) => {
      const resolved = typeof patch === 'function' ? patch(state) : patch;
      const next = { ...state, ...resolved };
      const changed = (Object.keys(resolved) as (keyof T)[]).some(
        (key) => state[key] !== next[key],
      );
      if (!changed) return;
      state = next;
      for (const listener of listeners) listener(state);
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
