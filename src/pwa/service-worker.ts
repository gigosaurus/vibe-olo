import { registerSW } from 'virtual:pwa-register';

/**
 * Registers the generated service worker.
 *
 * `registerType: 'prompt'` means a new version waits until the user agrees, so
 * a refresh never interrupts a game in progress.
 */
export interface ServiceWorkerHandle {
  /** Activates the waiting worker and reloads the page. */
  applyUpdate(): void;
}

/** How long to wait for the new worker to take over before reloading anyway. */
const CONTROLLER_TIMEOUT_MS = 3000;

export function registerServiceWorker(onUpdateReady: () => void): ServiceWorkerHandle {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh: onUpdateReady,
    onRegisterError: (error: unknown) => {
      // Offline support is a progressive enhancement: log and carry on.
      console.warn('Service worker registration failed', error);
    },
  });

  // The page reload is driven here rather than left to the plugin. With a
  // relative `base`, the registered script URL does not match the controlling
  // worker's absolute URL, so the plugin's own "controlling" listener does not
  // recognise the swap as an update and never reloads.
  let updateRequested = false;
  let reloading = false;

  const reloadOnce = (): void => {
    if (reloading) return;
    reloading = true;
    globalThis.location.reload();
  };

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Ignore the first-load handover, where the worker simply claims a page
      // that was not controlled yet.
      if (!updateRequested) return;
      reloadOnce();
    });
  }

  return {
    applyUpdate: () => {
      updateRequested = true;
      void updateSW(true);
      // Safety net for a worker that activates without a controller change.
      globalThis.setTimeout(reloadOnce, CONTROLLER_TIMEOUT_MS);
    },
  };
}
