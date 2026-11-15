import { useLanguage } from '../i18n/useLanguage';
import { t } from '../i18n';
import { Link } from 'react-router-dom';

interface DashboardStatusStripProps {
  totalZonesCount?: number;
  problemZonesCount: number;
  disconnectedCount: number;
  openAlertsCount: number;
}

export default function DashboardStatusStrip({
  totalZonesCount,
  problemZonesCount,
  disconnectedCount,
  openAlertsCount,
}: DashboardStatusStripProps) {
  useLanguage();
  const isAllGood = problemZonesCount === 0 && disconnectedCount === 0 && openAlertsCount === 0;

  return (
    <section
      data-testid="dashboard-status-strip"
      className="p-3 bg-surface rounded-xl border border-border flex flex-wrap items-center justify-between gap-3 shadow-xs"
    >
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {typeof totalZonesCount === 'number' && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-text">
            <span aria-hidden="true" className="material-symbols-outlined text-gray text-base">
              layers
            </span>
            <span>{t('{0} khu vực', [totalZonesCount])}</span>
          </div>
        )}

        {isAllGood ? (
          <div
            data-testid="status-pill-all-good"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-semibold text-xs"
          >
            <span className="material-symbols-outlined text-[16px] text-emerald-600 dark:text-emerald-400 font-bold">
              check_circle
            </span>
            <span>{t('Mọi khu vực bình thường')}</span>
          </div>
        ) : (
          <>
            {problemZonesCount > 0 && (
              <div
                data-testid="status-pill-attention"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-900 text-amber-800 dark:text-amber-300 font-medium text-xs"
              >
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>{t('{0} khu cần chú ý', [problemZonesCount])}</span>
              </div>
            )}

            {disconnectedCount > 0 && (
              <div
                data-testid="status-pill-disconnected"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg border border-border text-gray font-medium text-xs"
              >
                <span className="w-2 h-2 rounded-full bg-gray/60" />
                <span>{t('{0} khu mất kết nối', [disconnectedCount])}</span>
              </div>
            )}
          </>
        )}
      </div>

      {openAlertsCount > 0 && (
        <div className="flex items-center gap-2">
          <Link
            to="/alerts"
            data-testid="status-pill-alerts"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-semibold text-xs transition-colors"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-sm">
              warning
            </span>
            <span>{t('{0} cảnh báo đang mở', [openAlertsCount])}</span>
          </Link>
        </div>
      )}
    </section>
  );
}
