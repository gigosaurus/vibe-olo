import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLocalStore, createMemoryStore } from './storage.ts';

describe('memory store', () => {
  it('reads back what it wrote and reports itself as non-persistent', () => {
    const store = createMemoryStore();
    expect(store.persistent).toBe(false);
    expect(store.get('missing')).toBeNull();
    store.set('key', 'value');
    expect(store.get('key')).toBe('value');
    store.remove('key');
    expect(store.get('key')).toBeNull();
  });
});

describe('local store', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.localStorage.clear();
  });

  it('persists through localStorage when it works', () => {
    const store = createLocalStore();
    expect(store.persistent).toBe(true);
    store.set('party-deck:test', 'hello');
    expect(globalThis.localStorage.getItem('party-deck:test')).toBe('hello');
    expect(store.get('party-deck:test')).toBe('hello');
  });

  it('falls back to memory when the browser blocks storage', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    const store = createLocalStore();
    expect(store.persistent).toBe(false);
    expect(store.set('key', 'value')).toBe(true);
    expect(store.get('key')).toBe('value');
  });

  it('reports a failed write when the quota is exceeded mid-session', () => {
    const store = createLocalStore();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    expect(store.set('key', 'value')).toBe(false);
  });

  it('survives a getItem that throws', () => {
    const store = createLocalStore();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    expect(store.get('key')).toBeNull();
  });
});
