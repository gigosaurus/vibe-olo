/**
 * jsdom does not implement `CSS.escape`, which the focus-restoration helper
 * uses. Polyfill just enough for the tests.
 */
if (typeof globalThis.CSS === 'undefined') {
  Object.defineProperty(globalThis, 'CSS', { value: {}, writable: true });
}
if (typeof globalThis.CSS.escape !== 'function') {
  globalThis.CSS.escape = (value: string): string => value.replace(/["\\]/g, '\\$&');
}
