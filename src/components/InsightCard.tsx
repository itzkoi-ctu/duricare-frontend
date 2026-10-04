import { useLanguage } from '../i18n/useLanguage';
import { t } from '../i18n';
import ChatPanel from './ChatPanel';

export default function InsightCard() {
  useLanguage();
  return <div className="rounded-2xl bg-surface border border-border p-5 md:p-6 shadow-sm relative overflow-hidden">
    <div className="flex items-center gap-2.5 pb-3 mb-4 border-b border-border/50">
      <div className="w-10 h-10 shrink-0 rounded-xl bg-navy/10 text-navy dark:text-blue flex items-center justify-center">
        <span aria-hidden="true" className="material-symbols-outlined text-[22px]">smart_toy</span>
      </div>
      <div><h3 className="text-sm font-bold text-text">{t('Trợ lý AI Nông vụ DuriCare')}</h3>
        <p className="text-xs text-gray">{t('Mô hình Chuyên gia Sinh lý Sầu riêng')}</p></div>
      <span className="ml-auto shrink-0 rounded bg-teal/15 px-1.5 py-0.5 text-[10px] font-bold text-teal">CTU Agent</span>
    </div>
    <ChatPanel variant="compact" />
  </div>;
}
