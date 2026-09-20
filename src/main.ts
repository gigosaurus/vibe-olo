import './styles/index.css';
import { appConfig } from './config/app-config.ts';
import { createApp } from './ui/app.ts';
import { createInstallController } from './pwa/install.ts';
import { registerServiceWorker } from './pwa/service-worker.ts';
import type { ServiceWorkerHandle } from './pwa/service-worker.ts';

const root = document.querySelector<HTMLElement>('#app');
if (root === null) throw new Error('Missing #app mount point');

document.title = appConfig.name;
document
  .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  ?.setAttribute('content', appConfig.themeColor);

let swHandle: ServiceWorkerHandle | null = null;

const install = createInstallController(() => {
  app.refreshInstallState();
});

const app = createApp({
  root,
  installController: install,
  onApplyUpdate: () => {
    swHandle?.applyUpdate();
  },
});

swHandle = registerServiceWorker(() => {
  app.setUpdateReady();
});
