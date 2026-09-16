import { initWebappProfileBridge } from './profile-bridge.js';
import { initExtendedLanguageOptions } from './language-options.js';

function wireBrandHomeLink() {
  const brandLink = document.querySelector('.brand-home-link');
  if (!brandLink) return;

  const homeUrl = new URL('../', window.location.href).href;
  brandLink.setAttribute('href', homeUrl);
  brandLink.addEventListener('click', (event) => {
    event.preventDefault();
    window.location.assign(homeUrl);
  });
}

async function startBridge() {
  wireBrandHomeLink();

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
