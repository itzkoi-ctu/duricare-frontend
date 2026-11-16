import { useLanguage } from '../i18n/useLanguage';
import { t, getLocale } from '../i18n';
import type { SoilProfile, SoilMetricData } from '../types/overview';
import {
  formatProvenanceLabel,
  formatObservedCadence,
  formatMetricValue,
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

const CHEMISTRY_TITLES: Record<typeof CHEMISTRY_KEYS[number], { label: string }> = {
  ph: { label: 'pH' },
  ec: { label: 'EC (độ dẫn điện)' },
  n: { label: 'N (Đạm)' },
  p: { label: 'P (Lân)' },
  k: { label: 'K (Kali)' },
};

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

  // 1. Loading State
  if (loading) {
    return (
      <section
        data-testid="soil-profile-loading"
        className={`rounded-xl border border-border bg-surface p-5 shadow-sm space-y-3 ${className}`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-[#1F5CA9]/30 border-t-[#1F5CA9] rounded-full animate-spin" />
            <h2 className="text-[15px] font-bold text-text">{t('Hóa tính đất')}</h2>
            <span className="text-[13px] text-gray">· {t('Trắc diện S1 · Dữ liệu kỹ thuật thô')}</span>
          </div>
        </div>
        <p className="text-[12px] font-medium text-gray">
          {t('Chưa áp dụng ngưỡng nông vụ; không suy ra liều bón từ các chỉ số này.')}
        </p>
        <div className="rounded-lg border border-dashed border-border p-6 text-center bg-bg/50">
          <p className="text-xs text-gray font-medium">{t('Đang tải trắc diện đất S1...')}</p>
        </div>
      </section>
    );
  }

  // 2. Error State
  if (error && !profile) {
    return (
      <section
        data-testid="soil-profile-error"
        className={`rounded-xl border border-coral/30 bg-coral/5 p-5 shadow-sm space-y-3 ${className}`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="material-symbols-outlined text-coral text-lg">error</span>
            <h2 className="text-[15px] font-bold text-text">{t('Hóa tính đất')}</h2>
            <span className="text-[13px] text-gray">· {t('Trắc diện S1 · Dữ liệu kỹ thuật thô')}</span>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-border bg-surface text-xs font-semibold text-text hover:bg-bg cursor-pointer shadow-2xs transition-colors"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-sm">refresh</span>
              <span>{t('Thử lại')}</span>
            </button>
          )}
        </div>
        <p className="text-xs text-coral font-medium">
          {t('Không thể tải dữ liệu trắc diện đất S1: {0}', [error])}
        </p>
      </section>
    );
  }

  // Check if at least one metric has data
  const hasAnyMetric =
    profile &&
    CHEMISTRY_KEYS.some((key) => {
      const metric = profile[key];
      return metric !== null && metric !== undefined && metric.value !== null && metric.value !== undefined;
    });

  // 3. Empty State
  if (!profile || !hasAnyMetric) {
    return (
      <section
        data-testid="soil-profile-empty"
        className={`rounded-xl border border-border bg-surface p-5 shadow-sm space-y-3 ${className}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-bold text-text">{t('Hóa tính đất')}</h2>
              <span className="text-[13px] text-gray">· {t('Trắc diện S1 · Dữ liệu kỹ thuật thô')}</span>
            </div>
            <p className="text-[12px] font-medium mt-0.5 text-gray">
              {t('Chưa áp dụng ngưỡng nông vụ; không suy ra liều bón từ các chỉ số này.')}
            </p>
          </div>
          {cadenceLabel && (
            <span className="text-[11px] font-medium text-gray bg-bg px-2.5 py-1 rounded-full border border-border">
              {cadenceLabel}
            </span>
          )}
        </div>
        <div className="rounded-lg border border-dashed border-border p-4 text-center bg-bg/50">
          <p className="text-xs text-gray">
            {t('Chưa có dữ liệu trắc diện đất S1 cho khu vực này.')}
          </p>
        </div>
      </section>
    );
  }

  const formatRecordedTime = (recordedAt: string | null | undefined) => {
    if (!recordedAt) return null;
    const d = new Date(recordedAt);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleString(getLocale(), {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 4. Full Data State
  return (
    <section
      data-testid="soil-profile-card"
      data-zone={zoneCode}
      className={`bg-surface rounded-xl border border-border p-5 shadow-sm space-y-3 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-bold text-text">{t('Hóa tính đất')}</h2>
            <span className="text-[13px] text-gray">· {t('Trắc diện S1 · Dữ liệu kỹ thuật thô')}</span>
          </div>
          <p className="text-[12px] font-medium mt-0.5 text-gray">
            {t('Chưa áp dụng ngưỡng nông vụ; không suy ra liều bón từ các chỉ số này.')}
          </p>
        </div>
        {cadenceLabel && (
          <span
            title={t('Tần suất nhận dữ liệu quan sát được, không phải chu kỳ đo cố định của cảm biến')}
            className="text-[11px] font-medium text-gray bg-bg px-2.5 py-1 rounded-full border border-border inline-flex items-center gap-1"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[13px]">schedule</span>
            <span>{cadenceLabel}</span>
          </span>
        )}
      </div>

      {/* 5 Flat columns */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-1">
        {CHEMISTRY_KEYS.map((key) => {
          const info = CHEMISTRY_TITLES[key];
          const metric: SoilMetricData | null | undefined = profile[key];
          const hasValue = metric && metric.value !== null && metric.value !== undefined;
          const isNoSignal = metric?.status === 'NO_SIGNAL';

          // Case A: Missing metric or missing value (em-dash, not 0)
          if (!hasValue) {
            return (
              <div
                key={key}
                data-chemistry={key}
                className="p-3 rounded-lg bg-bg/50 border border-border/70 flex flex-col justify-between"
              >
                <div>
                  <div className="text-[12px] text-gray font-medium">{t(info.label)}</div>
                  <div className="text-[22px] font-bold text-gray/60 tabular-nums my-0.5">—</div>
                </div>
                <div className="text-[10px] text-gray mt-1.5 pt-1.5 border-t border-border/60 truncate" title={t('Chưa có dữ liệu · Chưa xác định nguồn')}>
                  {t('Chưa có dữ liệu · Chưa xác định nguồn')}
                </div>
              </div>
            );
          }

          // Case B: Sensor signal lost (NO_SIGNAL semantics)
          if (isNoSignal) {
            const provLabel = formatProvenanceLabel(metric?.source);
            return (
              <div
                key={key}
                data-chemistry={key}
                className="p-3 rounded-lg bg-bg/50 border border-border/70 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[12px] text-gray font-medium truncate">{t(info.label)}</span>
                    <span className="text-[10px] font-semibold text-gray bg-gray/15 px-1.5 py-0.5 rounded shrink-0">
                      {t('Mất tín hiệu')}
                    </span>
                  </div>
                  <div className="text-[22px] font-bold text-gray/60 tabular-nums my-0.5">--</div>
                </div>
                <div className="text-[10px] text-gray mt-1.5 pt-1.5 border-t border-border/60 truncate" title={`${provLabel} · ${t('Mất tín hiệu')}`}>
                  {provLabel} · {t('Mất tín hiệu')}
                </div>
              </div>
            );
          }

          // Case C: Active reading with server-provided unit (no invented units)
          const serverUnit = metric.unit || undefined;
          const numVal = typeof metric.value === 'number' ? metric.value : Number(metric.value);
          const displayVal = formatMetricValue(numVal, null, 'NORMAL');
          const timeText = formatRecordedTime(metric.recordedAt);
          const provLabel = formatProvenanceLabel(metric.source);
          const footerText = timeText ? `${provLabel} · ${timeText}` : provLabel;

          return (
            <div
              key={key}
              data-chemistry={key}
              className="p-3 rounded-lg bg-[#f8fafc] dark:bg-surface border border-[#f1f5f9] dark:border-border flex flex-col justify-between"
            >
              <div>
                <div className="text-[12px] text-gray font-medium">{t(info.label)}</div>
                <div className="text-[22px] font-bold text-text tabular-nums my-0.5">
                  {displayVal}
                  {serverUnit && <span className="text-[13px] font-normal text-gray ml-1">{serverUnit}</span>}
                </div>
              </div>
              <div className="text-[10px] text-gray mt-1.5 pt-1.5 border-t border-border/60 truncate" title={footerText}>
                {footerText}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
