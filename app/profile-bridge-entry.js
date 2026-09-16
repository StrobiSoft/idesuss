import { initWebappProfileBridge } from './profile-bridge.js';

function startBridge() {
  initWebappProfileBridge().catch((error) => {
    console.error('Webapp profile bridge startup failed', error);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startBridge, { once: true });
} else {
  startBridge();
}
