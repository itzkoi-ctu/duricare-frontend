import { useLanguage } from '../i18n/useLanguage';
import { t, getLocale } from '../i18n';
import type { Alert } from '../types/alert';
import { alertSeverityClasses, alertSourceClasses } from '../utils/alertStyles';
import { formatRelativeTime } from '../utils/formatTime';

interface AlertCardProps {
  alert: Alert;
  zoneName: string;
  onResolve: (id: number) => void;
}

export default function AlertCard({ alert, zoneName, onResolve }: AlertCardProps) {
  useLanguage();
  return (
    <article data-alert-id={alert.id} data-source={alert.source} className="rounded-2xl border border-border bg-surface p-4 md:p-5 shadow-sm flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="px-2.5 py-1 rounded-lg bg-navy/10 text-navy text-xs font-semibold">{zoneName}</span>
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${alertSourceClasses(alert.source)}`}>
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{alert.source === 'AGENTIC' ? 'psychology' : 'warning'}</span>
          {alert.source === 'AGENTIC' ? t("Cảnh báo AI") : t("Cảnh báo cứng")}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xs font-semibold text-text break-all">{alert.type}</h2>
        <span className={`w-fit whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-bold ${alertSeverityClasses(alert.severity)}`}>{alert.severity}</span>
      </div>
      <p className="text-sm leading-relaxed text-text whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{alert.message}</p>
      <div className="mt-auto pt-3 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <time dateTime={alert.createdAt} title={new Date(alert.createdAt).toLocaleString(getLocale())} className="text-xs text-gray">{formatRelativeTime(alert.createdAt)}</time>
        <button onClick={() => onResolve(alert.id)} className="w-full sm:w-auto inline-flex justify-center items-center gap-1.5 px-3 py-2 rounded-xl border border-teal/30 bg-teal/10 text-teal text-xs font-semibold hover:bg-teal/20 cursor-pointer">
          <span className="material-symbols-outlined text-[17px]" aria-hidden="true">check_circle</span> {t("Đánh dấu đã xử lý")} </button>
      </div>
    </article>
  );
}
