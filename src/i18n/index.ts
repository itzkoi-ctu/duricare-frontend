import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import vi from './locales/vi/translation.json';
import en from './locales/en/translation.json';

export type Language = 'vi' | 'en';
const STORAGE_KEY = 'duricare-language';
function readPreference(): Language {
  try { return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'vi'; }
  catch { return 'vi'; }
}
void i18n.use(initReactI18next).init({
  resources: { vi: { translation: vi }, en: { translation: en } },
  lng: readPreference(),
  fallbackLng: 'vi',
  supportedLngs: ['vi', 'en'],
  initAsync: false,
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export const getLanguage = (): Language => i18n.resolvedLanguage === 'en' ? 'en' : 'vi';
export const getLocale = () => getLanguage() === 'vi' ? 'vi-VN' : 'en-US';
function applyLanguage() {
  document.documentElement.lang = getLanguage();
}
i18n.on('languageChanged', applyLanguage);
applyLanguage();
export function setLanguage(next: Language) {
  if (next !== 'vi' && next !== 'en') return;
  try { localStorage.setItem(STORAGE_KEY, next); } catch { /* Preference still works in memory. */ }
  void i18n.changeLanguage(next);
}
window.addEventListener('storage', event => {
  if (event.key === STORAGE_KEY || event.key === null) {
    void i18n.changeLanguage(readPreference());
  }
});

/** Vietnamese source strings are stable catalog keys; unknown server content stays intact. */
export function t(source: string, values: readonly (string | number | null)[] = []): string {
  const count = source === '{0} ({1} sự kiện)' ? values[1] : values[0];
  const interpolation = Object.fromEntries(values.map((value, index) => [String(index), value ?? `{${index}}`]));
  return i18n.t(source, {
    ...interpolation,
    defaultValue: source.replace(/\{(\d+)\}/g, '{{$1}}'),
    ...(typeof count === 'number' ? { count } : {}),
  });
}

export default i18n;
