import { initWebappProfileBridge } from './profile-bridge.js';
import { initExtendedLanguageOptions } from './language-options.js';

function initHomeNavigation() {
  const homeLink = document.querySelector('.brand-home-link');
  if (!homeLink) return;

  homeLink.addEventListener('click', (event) => {
    event.preventDefault();
    const homeUrl = new URL('../', window.location.href);
    window.location.assign(homeUrl.href);
  });
}

async function startBridge() {
  initHomeNavigation();

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
