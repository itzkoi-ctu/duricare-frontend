import { useLanguage } from '../i18n/useLanguage';
import { t, getLocale } from '../i18n';
import type { SoilProfile, SoilMetricData } from '../types/overview';
import {
  SOIL_METRIC_META,
  STATUS_STYLES,
  getStatusIcon,
  getStatusLabel,
  formatMetricValue,
  formatProvenanceLabel,
  getProvenanceBadgeStyle,
  formatObservedCadence,
} from '../utils/metricLabels';

interface SoilProfileCardProps {
  profile?: SoilProfile | null;
  observedCadenceSeconds?: number | null;
  zoneCode?: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  className?: string;
}

const CHEMISTRY_KEYS = ['ph', 'ec', 'n', 'p', 'k'] as const;

export default function SoilProfileCard({
  profile,
  observedCadenceSeconds,
  zoneCode,
  loading = false,
  error = null,
  onRetry,
  className = '',
}: SoilProfileCardProps) {
  useLanguage();

  const cadenceLabel = formatObservedCadence(observedCadenceSeconds);

  // 1. Loading State (F4)
  if (loading) {
    return (
      <div
        data-testid="soil-profile-loading"
        className={`rounded-2xl border border-border/80 bg-surface p-4 md:p-6 shadow-sm ${className}`}
      >
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="material-symbols-outlined text-navy dark:text-blue text-xl animate-spin">
              progress_activity
            </span>
            <h3 className="text-base font-bold text-text">{t('Trắc diện hóa tính đất S1')}</h3>
          </div>
        </div>
        <p className="text-xs text-gray mb-3">
          {t('Chỉ số hóa tính đất S1 là dữ liệu thô phục vụ nghiên cứu và giám sát kỹ thuật, chưa áp dụng ngưỡng nông vụ.')}
        </p>
        <div className="rounded-xl border border-dashed border-border p-6 text-center bg-bg/50">
          <p className="text-xs text-gray font-medium">{t('Đang tải trắc diện đất S1...')}</p>
        </div>
      </div>
    );
  }

  // 2. Error / Unavailable State (F4)
  if (error && !profile) {
    return (
      <div
        data-testid="soil-profile-error"
        className={`rounded-2xl border border-coral/30 bg-coral/5 p-4 md:p-6 shadow-sm ${className}`}
      >
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="material-symbols-outlined text-coral text-xl">
              error
            </span>
            <h3 className="text-base font-bold text-text">{t('Trắc diện hóa tính đất S1')}</h3>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-surface text-xs font-semibold text-text hover:bg-bg cursor-pointer shadow-2xs transition-colors"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-sm">
                refresh
              </span>
              <span>{t('Thử lại')}</span>
            </button>
          )}
        </div>
        <p className="text-xs text-coral font-medium">
          {t('Không thể tải dữ liệu trắc diện đất S1: {0}', [error])}
        </p>
      </div>
    );
  }

  // Check if at least one metric has data
  const hasAnyMetric =
    profile &&
    CHEMISTRY_KEYS.some((key) => {
      const metric = profile[key];
      return metric !== null && metric !== undefined;
    });

  // 3. Genuine Empty State (F4)
  if (!profile || !hasAnyMetric) {
    return (
      <div
        data-testid="soil-profile-empty"
        className={`rounded-2xl border border-border/80 bg-surface p-4 md:p-6 shadow-sm ${className}`}
      >
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="material-symbols-outlined text-navy dark:text-blue text-xl">
              science
            </span>
            <h3 className="text-base font-bold text-text">{t('Trắc diện hóa tính đất S1')}</h3>
          </div>
          {cadenceLabel && (
            <span className="text-[11px] font-medium text-gray bg-bg px-2.5 py-1 rounded-full border border-border">
              {cadenceLabel}
            </span>
          )}
        </div>
        <p className="text-xs text-gray mb-3">
          {t('Chỉ số hóa tính đất S1 là dữ liệu thô phục vụ nghiên cứu và giám sát kỹ thuật, chưa áp dụng ngưỡng nông vụ.')}
        </p>
        <div className="rounded-xl border border-dashed border-border p-4 text-center bg-bg/50">
          <p className="text-xs text-gray">
            {t('Chưa có dữ liệu trắc diện đất S1 cho khu vực này.')}
          </p>
        </div>
      </div>
    );
  }

  const formatRecordedTime = (recordedAt: string | null) => {
    if (!recordedAt) return null;
    const d = new Date(recordedAt);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleString(getLocale(), {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 4. Full Data State (F1)
  return (
    <div
      data-testid="soil-profile-card"
      data-zone={zoneCode}
      className={`rounded-2xl border border-border bg-surface p-4 md:p-6 shadow-sm ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="material-symbols-outlined text-navy dark:text-blue text-xl">
            science
          </span>
          <h3 className="text-base font-bold text-text">{t('Trắc diện hóa tính đất S1')}</h3>
          <span className="text-[11px] font-semibold text-gray bg-bg px-2 py-0.5 rounded border border-border">
            {t('Dữ liệu kỹ thuật thô')}
          </span>
        </div>
        {cadenceLabel && (
          <span
            title={t('Tần suất nhận dữ liệu quan sát được, không phải chu kỳ đo cố định của cảm biến')}
            className="text-[11px] font-medium text-gray bg-bg px-2.5 py-1 rounded-full border border-border w-fit inline-flex items-center gap-1"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[13px] text-gray">
              schedule
            </span>
            <span>{cadenceLabel}</span>
          </span>
        )}
      </div>

      {/* Agronomic Boundary Disclaimer */}
      <div className="rounded-xl bg-bg/80 border border-border/80 px-3 py-2 text-xs text-gray mb-4 flex items-start gap-2">
        <span aria-hidden="true" className="material-symbols-outlined text-sm text-gray mt-0.5 shrink-0">
          info
        </span>
        <span>
          {t('Chỉ số hóa tính đất S1 là dữ liệu thô phục vụ nghiên cứu và giám sát kỹ thuật, chưa áp dụng ngưỡng nông vụ.')}
        </span>
      </div>

      {/* Grid of 5 Chemistry Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {CHEMISTRY_KEYS.map((key) => {
          const meta = SOIL_METRIC_META[key];
          const metric: SoilMetricData | null | undefined = profile[key];

          if (!metric) {
            return (
              <div
                key={key}
                data-chemistry={key}
                className="rounded-xl border border-border/60 bg-bg/40 p-3 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-navy dark:text-blue">{meta.symbol}</span>
                  <span className="text-[10px] text-gray">{t('Không có')}</span>
                </div>
                <div className="text-sm font-semibold text-gray/70">--</div>
                <div className="text-[10px] text-gray mt-1 truncate">{t(meta.label)}</div>
              </div>
            );
          }

          const style = STATUS_STYLES[metric.status] ?? STATUS_STYLES.NO_TARGET;
          const statusIcon = getStatusIcon(metric.status);
          const statusText = getStatusLabel(key, metric.status);
          // F1 Fix: Preserve explicit null without inventing fallback unit; display verbatim non-null unit
          const formattedValue = formatMetricValue(metric.value, metric.unit, metric.status);
          const timeText = formatRecordedTime(metric.recordedAt);
          const provStyle = getProvenanceBadgeStyle(metric.source);
          const provLabel = formatProvenanceLabel(metric.source);

          return (
            <div
              key={key}
              data-chemistry={key}
              className="rounded-xl border border-border/70 bg-bg p-3 flex flex-col justify-between shadow-2xs hover:border-border transition-colors"
            >
              <div>
                {/* Metric Symbol & Status Badge (kept separate from unit suffixes) */}
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-bold text-xs px-1.5 py-0.5 rounded bg-surface border border-border text-navy dark:text-blue shrink-0">
                      {meta.symbol}
                    </span>
                    <span className="text-[11px] font-semibold text-text truncate" title={t(meta.description)}>
                      {t(meta.label)}
                    </span>
                  </div>
                </div>

                {/* Value Display */}
                <div className="my-1">
                  <span className="text-xl font-bold text-text tracking-tight">
                    {formattedValue}
                  </span>
                </div>

                {/* Status Indicator (Icon + Text, not relying only on color) */}
                <div className="mt-1">
                  <span
                    data-status={metric.status}
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold leading-tight ${style.badgeBg} ${style.badgeText} border ${style.borderColor}`}
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[12px]">
                      {statusIcon}
                    </span>
                    <span>{statusText}</span>
                  </span>
                </div>
              </div>

              {/* Provenance and Timestamp */}
              <div className="mt-3 pt-2 border-t border-border/40 text-[10px] text-gray space-y-1">
                {/* Provenance */}
                <div
                  className="flex items-center gap-1 truncate"
                  title={`${t('Nguồn:')} ${provLabel}`}
                >
                  <span
                    aria-hidden="true"
                    className={`material-symbols-outlined text-[12px] ${provStyle.text}`}
                  >
                    {provStyle.icon}
                  </span>
                  <span className="truncate">{provLabel}</span>
                </div>

                {/* Timestamp */}
                {timeText && (
                  <div className="flex items-center gap-1 text-gray/80 truncate" title={timeText}>
                    <span aria-hidden="true" className="material-symbols-outlined text-[12px]">
                      schedule
                    </span>
                    <span className="truncate">{timeText}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
