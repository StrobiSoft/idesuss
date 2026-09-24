import {
  getIdesussLanguage,
  normalizeIdesussLanguage,
  setIdesussLanguage
} from '../js/shared/language-preference.js';

const BELARUSIAN_LOCALE = 'be';
const BELARUSIAN_LABEL = '🇧🇾 BY · Беларуская';

function ensureBelarusianOption(select) {
  if (!select || select.querySelector(`option[value="${BELARUSIAN_LOCALE}"]`)) return;

  const option = document.createElement('option');
  option.value = BELARUSIAN_LOCALE;
  option.textContent = BELARUSIAN_LABEL;
  select.appendChild(option);
}

export async function initExtendedLanguageOptions() {
  const select = document.getElementById('langSelect');
  if (!select) return;

  ensureBelarusianOption(select);

  const saved = getIdesussLanguage();
  const browserLanguage = normalizeIdesussLanguage(window.navigator.language || '', '');
  const shouldAutoSelectBelarusian =
    saved === 'en' &&
    !window.localStorage.getItem('idesuss_lang') &&
    browserLanguage === BELARUSIAN_LOCALE;

  const language = shouldAutoSelectBelarusian ? BELARUSIAN_LOCALE : saved;
  select.value = language;
  setIdesussLanguage(language, { notify: false });

  if (typeof window.loadLanguage === 'function') {
    await window.loadLanguage(language);
  }
}
