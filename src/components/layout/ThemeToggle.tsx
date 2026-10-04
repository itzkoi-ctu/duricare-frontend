import { useLanguage } from '../../i18n/useLanguage';
import { t } from '../../i18n';
import { useSyncExternalStore } from 'react';

function getTheme(): 'light' | 'dark' {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}

export default function ThemeToggle() {
  useLanguage();
  // Both responsive controls observe the same active theme, initialized in index.html.
  const theme = useSyncExternalStore(subscribe, getTheme);
  const toggle = () => {
    const next = getTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', next === 'dark');
    localStorage.setItem('theme', next);
  };

  return (
    <button
      onClick={toggle}
      data-theme={theme}
      title={t(theme === 'dark' ? 'Chế độ tối' : 'Chế độ sáng')}
      aria-label={t(theme === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối')}
      className="flex items-center justify-center w-10 h-10 rounded-lg
                 bg-surface border border-border
                 hover:bg-border
                 cursor-pointer transition-all duration-200"
    >
      {theme === 'light' ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m8.66-13.66l-.71.71M4.05 19.95l-.71.71M21 12h-1M4 12H3m16.66 7.66l-.71-.71M4.05 4.05l-.71-.71M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.005 9.005 0 0012 21a9.005 9.005 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}
