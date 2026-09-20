/**
 * Custom install button support.
 *
 * Chromium fires `beforeinstallprompt`, which we stash so the welcome screen
 * can offer a real install button. Browsers without that event (notably iOS
 * Safari) get written instructions instead — see the "How to play" dialog.
 */

/** The non-standard event Chromium fires; typed here because lib.dom omits it. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface InstallController {
  /** `true` when `promptInstall()` will show the browser's own dialog. */
  isAvailable(): boolean;
  /** `true` when the app is already running in standalone mode. */
  isInstalled(): boolean;
  promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'>;
  dispose(): void;
}

export function detectStandalone(): boolean {
  try {
    return globalThis.matchMedia('(display-mode: standalone)').matches;
  } catch {
    return false;
  }
}

export function createInstallController(onChange: () => void): InstallController {
  let deferred: BeforeInstallPromptEvent | null = null;
  let installed = detectStandalone();

  const onBeforeInstallPrompt = (event: Event): void => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    onChange();
  };
  const onInstalled = (): void => {
    deferred = null;
    installed = true;
    onChange();
  };

  globalThis.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  globalThis.addEventListener('appinstalled', onInstalled);

  return {
    isAvailable: () => deferred !== null,
    isInstalled: () => installed,
    promptInstall: async () => {
      const event = deferred;
      if (event === null) return 'unavailable';
      deferred = null;
      onChange();
      await event.prompt();
      const choice = await event.userChoice;
      return choice.outcome;
    },
    dispose: () => {
      globalThis.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      globalThis.removeEventListener('appinstalled', onInstalled);
    },
  };
}
