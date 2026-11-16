import { useLanguage } from '../i18n/useLanguage';
import { t } from '../i18n';
import type { Alert } from '../types/alert';
import {
  alertSeverityClasses,
  alertSourceClasses,
  alertSourceIcon,
  alertSourceLabel,
  alertCardBorderClass,
} from '../utils/alertStyles';
import { formatAlertDateTime, formatRelativeTime } from '../utils/formatTime';

interface AlertCardProps {
  alert: Alert;
  zoneName: string;
  onResolve: (id: number) => void;
  isPending?: boolean;
}

export default function AlertCard({ alert, zoneName, onResolve, isPending = false }: AlertCardProps) {
  useLanguage();
  const timeFormatted = formatAlertDateTime(alert.createdAt);
  const timeRelative = formatRelativeTime(alert.createdAt);
  const borderLeftClass = alertCardBorderClass(alert.severity);

  return (
    <article
      data-alert-id={alert.id}
      data-source={alert.source}
      data-severity={alert.severity}
      className={`bg-surface rounded-xl border border-border/80 p-4 sm:p-5 shadow-xs ${borderLeftClass} hover:border-slate-300 dark:hover:border-border transition-all flex flex-col justify-between max-w-full min-w-0`}
    >
      <div className="max-w-full min-w-0">
        {/* Top Row: Zone info, Source & Severity Badges, ID and Timestamp */}
        <div className="flex items-start sm:items-center justify-between flex-wrap gap-2 max-w-full min-w-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <span className="font-semibold text-text text-base">{zoneName}</span>
            <span className="bg-bg text-gray text-xs px-2 py-0.5 rounded font-mono font-medium border border-border/40">
              {alert.zoneCode}
            </span>
            {/* Source badge */}
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 font-medium ${alertSourceClasses(
                alert.source
              )}`}
            >
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                {alertSourceIcon(alert.source)}
              </span>
              <span>{alertSourceLabel(alert.source)}</span>
            </span>
            {/* Severity badge */}
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${alertSeverityClasses(alert.severity)}`}
            >
              {alert.severity === 'CRITICAL' ? t('Nghiêm trọng') : t(alert.severity)}
            </span>
          </div>

          {/* ID & Timestamp */}
          <div className="flex items-center gap-2 sm:gap-3 text-right shrink-0">
            <span className="font-mono text-xs text-gray/80">#{alert.id}</span>
            <time
              dateTime={alert.createdAt}
              title={timeRelative}
              className="text-xs text-gray font-mono sm:font-sans"
            >
              {timeFormatted}
            </time>
          </div>
        </div>

        {/* Technical code type tag */}
        <div className="mt-2 sm:mt-2.5 max-w-full min-w-0">
          <span className="font-mono text-[11px] text-gray bg-bg px-2 py-0.5 rounded inline-block border border-border/40 max-w-full break-all [overflow-wrap:anywhere]">
            {alert.type}
          </span>
        </div>

        {/* Alert Message */}
        <p className="text-sm leading-relaxed text-text mt-2 sm:mt-2.5 mb-4 whitespace-pre-wrap break-words [overflow-wrap:anywhere] max-w-full min-w-0">
          {alert.message}
        </p>
      </div>

      {/* Footer action */}
      <div className="pt-1 border-t border-border/40 sm:border-0 sm:pt-0">
        <button
          type="button"
          disabled={isPending}
          onClick={() => onResolve(alert.id)}
          className="h-11 px-4 w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg font-medium text-sm text-[#0072a8] dark:text-[#38bdf8] bg-sky-50 hover:bg-sky-100 border border-sky-200 dark:bg-sky-950/30 dark:hover:bg-sky-900/40 dark:border-sky-800 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {isPending ? (
            <>
              <div className="w-4 h-4 border-2 border-[#0072a8] border-t-transparent rounded-full animate-spin" />
              <span>{t('Đang xử lý…')}</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                check_circle
              </span>
              <span>{t('Đánh dấu đã xử lý')}</span>
            </>
          )}
        </button>
      </div>
    </article>
  );
}
