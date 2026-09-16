const BELARUSIAN_LOCALE = 'be';
const BELARUSIAN_LABEL = '🇧🇾 BY · Беларуская';
const WEBAPP_LANG_STORAGE_KEY = 'ides_lang';

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

  const saved = window.localStorage.getItem(WEBAPP_LANG_STORAGE_KEY);
  const browserLanguage = (window.navigator.language || '').toLowerCase();
  const shouldAutoSelectBelarusian = !saved && browserLanguage.startsWith('be');

  if (saved === BELARUSIAN_LOCALE || shouldAutoSelectBelarusian) {
    select.value = BELARUSIAN_LOCALE;
    if (typeof window.loadLanguage === 'function') {
      await window.loadLanguage(BELARUSIAN_LOCALE);
    }
  }
}
