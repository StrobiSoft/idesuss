import { initWebappProfileBridge } from './profile-bridge.js';
import { initExtendedLanguageOptions } from './language-options.js';

async function startBridge() {
  try {
    await initExtendedLanguageOptions();
  } catch (error) {
    console.error('Webapp language extension startup failed', error);
  }

  initWebappProfileBridge().catch((error) => {
    console.error('Webapp profile bridge startup failed', error);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startBridge, { once: true });
} else {
  startBridge();
}
