import { setLanguage } from '../../i18n';
import { useLanguage } from '../../i18n/useLanguage';

export default function LanguageSelect() {
  const language = useLanguage();
  return (
    <select
      aria-label={language === 'vi' ? 'Ngôn ngữ' : 'Language'}
      value={language}
      onChange={event => setLanguage(event.target.value === 'en' ? 'en' : 'vi')}
      className="h-10 max-w-28 rounded-lg bg-surface border border-border px-2 text-xs font-semibold text-text cursor-pointer focus-visible:outline-2 focus-visible:outline-navy"
    >
      <option value="vi" lang="vi">Tiếng Việt</option>
      <option value="en" lang="en">English</option>
    </select>
  );
}
