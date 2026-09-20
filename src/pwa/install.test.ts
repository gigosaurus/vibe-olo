import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInstallController, detectStandalone } from './install.ts';

/** Stand-in for the Chromium-only `beforeinstallprompt` event. */
function fireBeforeInstallPrompt(outcome: 'accepted' | 'dismissed' = 'accepted'): {
  prompted: () => boolean;
} {
  let prompted = false;
  const event = new Event('beforeinstallprompt') as Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  };
  event.prompt = () => {
    prompted = true;
    return Promise.resolve();
  };
  event.userChoice = Promise.resolve({ outcome });
  globalThis.dispatchEvent(event);
  return { prompted: () => prompted };
}

describe('install controller', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('is unavailable until the browser offers a prompt', () => {
    const controller = createInstallController(() => undefined);
    expect(controller.isAvailable()).toBe(false);
    controller.dispose();
  });

  it('becomes available once the browser fires the event', () => {
    const onChange = vi.fn();
    const controller = createInstallController(onChange);
    fireBeforeInstallPrompt();
    expect(controller.isAvailable()).toBe(true);
    expect(onChange).toHaveBeenCalled();
    controller.dispose();
  });

  it('replays the stored prompt exactly once', async () => {
    const controller = createInstallController(() => undefined);
    const { prompted } = fireBeforeInstallPrompt('accepted');
    await expect(controller.promptInstall()).resolves.toBe('accepted');
    expect(prompted()).toBe(true);
    expect(controller.isAvailable()).toBe(false);
    await expect(controller.promptInstall()).resolves.toBe('unavailable');
    controller.dispose();
  });

  it('marks the app as installed when the browser says so', () => {
    const controller = createInstallController(() => undefined);
    fireBeforeInstallPrompt();
    globalThis.dispatchEvent(new Event('appinstalled'));
    expect(controller.isInstalled()).toBe(true);
    expect(controller.isAvailable()).toBe(false);
    controller.dispose();
  });

  it('stops listening after dispose', () => {
    const controller = createInstallController(() => undefined);
    controller.dispose();
    fireBeforeInstallPrompt();
    expect(controller.isAvailable()).toBe(false);
  });

  it('reports standalone mode without throwing when matchMedia is unavailable', () => {
    // jsdom does not provide matchMedia, which is exactly the case the guard
    // in detectStandalone() exists for.
    expect(detectStandalone()).toBe(false);
  });

  it('reports standalone mode when the browser says the app is installed', () => {
    const stub = vi.fn(() => ({ matches: true }) as MediaQueryList);
    Object.defineProperty(globalThis, 'matchMedia', { value: stub, configurable: true });
    try {
      expect(detectStandalone()).toBe(true);
      expect(stub).toHaveBeenCalledWith('(display-mode: standalone)');
    } finally {
      Reflect.deleteProperty(globalThis, 'matchMedia');
    }
  });
});
