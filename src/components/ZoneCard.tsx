import { useLanguage } from '../i18n/useLanguage';
import { t } from '../i18n';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { ZoneOverview, MetricData } from '../types/overview';
import { GROWTH_STAGE_LABELS, type GrowthStage } from '../types/zone';
import SoilMoistureSparkline from './SoilMoistureSparkline';
import {
  SOIL_METRIC_META,
  STATUS_STYLES,
  formatMetricValue,
  getStatusLabel,
  formatProvenanceLabel,
  formatTimeHHmm,
} from '../utils/metricLabels';

interface ZoneCardProps {
  zone: ZoneOverview;
  isSimulatedDisconnected?: boolean;
}

const CHEMISTRY_PREVIEW_KEYS = ['ph', 'ec', 'n', 'p', 'k'] as const;

function getQualitativeStatus(
  metricKey: 'temperature' | 'humidity' | 'soilMoisture',
  metric: MetricData
): { text: string; colorClass: string; isAbnormal: boolean } {
  const { status } = metric;
  if (status === 'NORMAL') {
    if (metricKey === 'temperature') {
      return { text: t('Lý tưởng'), colorClass: 'text-emerald-700 dark:text-emerald-400', isAbnormal: false };
    }
    if (metricKey === 'humidity') {
      return { text: t('Ổn định'), colorClass: 'text-emerald-700 dark:text-emerald-400', isAbnormal: false };
    }
    return { text: t('Đủ ẩm rễ'), colorClass: 'text-emerald-700 dark:text-emerald-400', isAbnormal: false };
  }

  if (status === 'LOW') {
    return { text: t('Thấp hơn ngưỡng'), colorClass: 'text-amber-800 dark:text-amber-300 font-semibold', isAbnormal: true };
  }
  if (status === 'HIGH') {
    return { text: t('Cao hơn ngưỡng'), colorClass: 'text-coral dark:text-coral font-semibold', isAbnormal: true };
  }
  if (status === 'SENSOR_ERROR') {
    return { text: t('Lỗi cảm biến'), colorClass: 'text-coral dark:text-coral font-semibold', isAbnormal: true };
  }
  if (status === 'NO_SIGNAL') {
    return { text: t('Mất tín hiệu'), colorClass: 'text-gray', isAbnormal: false };
  }
  return { text: t('Chưa có ngưỡng'), colorClass: 'text-gray', isAbnormal: false };
}

function normalizeUnit(unit: string | undefined): string {
  if (!unit) return '';
  if (unit === 'C' || unit === '°C') return '°C';
  return unit;
}

function formatTargetBenchmark(metric: MetricData): string {
  const unit = normalizeUnit(metric.unit);
  if (metric.targetMin != null && metric.targetMax != null) {
    return t('Mục tiêu {0}–{1}{2}', [metric.targetMin, metric.targetMax, unit]);
  }
  if (metric.targetMin != null) {
    return t('Mục tiêu ≥{0}{1}', [metric.targetMin, unit]);
  }
  if (metric.targetMax != null) {
    return t('Mục tiêu ≤{0}{1}', [metric.targetMax, unit]);
  }
  return t('Chưa thiết lập ngưỡng');
}

function formatMetricDisplay(
  metric: MetricData,
  defaultUnit: string,
  isDisconnectedZone: boolean
): string {
  if (isDisconnectedZone || metric.status === 'NO_SIGNAL' || metric.status === 'SENSOR_ERROR') {
    return '--';
  }
  if (metric.value == null) {
    return '--';
  }
  const unit = normalizeUnit(metric.unit) || defaultUnit;
  return `${metric.value}${unit}`;
}

export default function ZoneCard({ zone, isSimulatedDisconnected = false }: ZoneCardProps) {
  useLanguage();
  const { search } = useLocation();
  const { user } = useAuth();
  const farmId = Number(new URLSearchParams(search).get('farmId'));
  const scope = user?.role === 'ADMIN' && Number.isSafeInteger(farmId) && farmId > 0 ? `?farmId=${farmId}` : '';
  const totalAlerts = zone.alerts.hard + zone.alerts.agentic;

  const stageLabel =
    zone.growthStage && zone.growthStage in GROWTH_STAGE_LABELS
      ? t(GROWTH_STAGE_LABELS[zone.growthStage as GrowthStage])
      : zone.growthStage || t('Chưa cập nhật');

  const { temperature, humidity, soilMoisture } = zone.metrics;

  const isDisconnected =
    isSimulatedDisconnected ||
    (temperature.status === 'NO_SIGNAL' &&
      humidity.status === 'NO_SIGNAL' &&
      soilMoisture.status === 'NO_SIGNAL') ||
    (temperature.value == null && humidity.value == null && soilMoisture.value == null);

  const lastRecordedTime =
    soilMoisture.recordedAt || temperature.recordedAt || humidity.recordedAt;

  const hasAbnormalMetric =
    temperature.status === 'LOW' || temperature.status === 'HIGH' ||
    humidity.status === 'LOW' || humidity.status === 'HIGH' ||
    soilMoisture.status === 'LOW' || soilMoisture.status === 'HIGH';

  // Check if any soil S1 metric exists in profile
  const presentSoilMetrics = zone.soilProfile
    ? CHEMISTRY_PREVIEW_KEYS.filter((key) => {
        const m = zone.soilProfile?.[key];
        return m !== null && m !== undefined;
      })
    : [];
  const hasSoilMetrics = presentSoilMetrics.length > 0;
  const firstProvenance = zone.soilProfile
    ? presentSoilMetrics.map((k) => zone.soilProfile?.[k]?.source).find(Boolean)
    : null;

  const tempStatus = getQualitativeStatus('temperature', temperature);
  const humStatus = getQualitativeStatus('humidity', humidity);
  const soilStatus = getQualitativeStatus('soilMoisture', soilMoisture);

  // Status badge styling
  let badgeBorder = 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
  let badgeLabel = t('Bình thường');
  let badgeDot = 'bg-emerald-500';

  if (isDisconnected) {
    badgeBorder = 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
    badgeLabel = t('Mất kết nối');
    badgeDot = 'bg-slate-400';
  } else if (totalAlerts > 0 || hasAbnormalMetric) {
    badgeBorder = 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300';
    badgeLabel = t('Cần chú ý');
    badgeDot = 'bg-amber-500';
  } else {
    badgeBorder = 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300';
    badgeLabel = t('Bình thường');
    badgeDot = 'bg-emerald-500';
  }

  return (
    <article
      data-zone={zone.code}
      className={`p-4 sm:p-5 bg-surface rounded-xl border shadow-xs transition-colors hover:border-slate-300 dark:hover:border-slate-600 flex flex-col justify-between gap-4 ${
        totalAlerts > 0
          ? 'border-amber-300 dark:border-amber-800/80 ring-1 ring-amber-100 dark:ring-amber-950/40'
          : 'border-border'
      }`}
    >
      <div className="space-y-3">
        {/* Header: Name · Code, Status Badge, Variety · Stage */}
        <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-border/70 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to={`/zones/${encodeURIComponent(zone.code)}${scope}`}
                className="text-base font-bold text-text hover:text-[#1F5CA9] dark:hover:text-[#60A5FA] tracking-tight transition-colors"
              >
                {zone.name} {zone.name.includes(zone.code) ? '' : `· ${zone.code}`}
              </Link>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 shrink-0 ${badgeBorder}`}>
                {isDisconnected ? (
                  <span aria-hidden="true" className="material-symbols-outlined text-xs">wifi_off</span>
                ) : (
                  <span className={`w-1.5 h-1.5 rounded-full ${badgeDot}`} />
                )}
                <span>{badgeLabel}</span>
              </span>
            </div>
            <p className="text-xs text-gray mt-0.5">
              {zone.variety ? `${zone.variety} · ` : ''}{stageLabel}
            </p>
          </div>

          {totalAlerts > 0 && (
            <div className="text-right shrink-0">
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900 block">
                {t('{0} cảnh báo đang mở', [totalAlerts])}
              </span>
            </div>
          )}
        </div>

        {/* Warning / Disconnected Callout Banners if applicable */}
        {totalAlerts > 0 && !isDisconnected && (
          <div className="p-2.5 rounded-lg bg-amber-50/90 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 flex items-center gap-2 text-xs">
            <span aria-hidden="true" className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-base shrink-0">warning</span>
            <span className="font-semibold">
              {hasAbnormalMetric
                ? t('Thông số nông vụ vượt ngưỡng cấu hình')
                : t('Có {0} cảnh báo nông vụ cần xử lý', [totalAlerts])}
            </span>
          </div>
        )}

        {isDisconnected && (
          <div className="p-3 rounded-lg bg-bg border border-border/80 flex items-center justify-between text-xs text-gray">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="material-symbols-outlined text-gray text-base">wifi_off</span>
              <span className="font-medium">
                {lastRecordedTime
                  ? t('Mất tín hiệu từ {0}', [formatTimeHHmm(lastRecordedTime)])
                  : t('Mất tín hiệu cảm biến')}
              </span>
            </div>
            <span className="text-[11px] text-gray/80">{t('Chưa có dữ liệu mới')}</span>
          </div>
        )}

        {/* 3 Metric Tiles (Spacious Flat Row in Wide Card) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 my-1 pt-0.5">
          {/* Tile 1: Độ ẩm đất */}
          <div className={`p-3 rounded-lg border flex flex-col justify-between ${
            soilStatus.isAbnormal && !isDisconnected
              ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-900/60'
              : 'bg-bg border-border/80'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray">{t('Độ ẩm đất')}</span>
                <span className={`text-[11px] font-medium ${soilStatus.colorClass}`}>{soilStatus.text}</span>
              </div>
              <div className={`text-2xl font-bold tabular-nums leading-tight ${
                isDisconnected || soilMoisture.status === 'NO_SIGNAL' ? 'text-gray/60' : soilStatus.isAbnormal ? soilStatus.colorClass : 'text-text'
              }`}>
                {formatMetricDisplay(soilMoisture, '%', isDisconnected)}
              </div>
            </div>
            <span className="text-[11px] text-gray pt-1 truncate">
              {formatTargetBenchmark(soilMoisture)}
            </span>
          </div>

          {/* Tile 2: Nhiệt độ không khí */}
          <div className={`p-3 rounded-lg border flex flex-col justify-between ${
            tempStatus.isAbnormal && !isDisconnected
              ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-900/60'
              : 'bg-bg border-border/80'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray">{t('Nhiệt độ')}</span>
                <span className={`text-[11px] font-medium ${tempStatus.colorClass}`}>{tempStatus.text}</span>
              </div>
              <div className={`text-2xl font-bold tabular-nums leading-tight ${
                isDisconnected || temperature.status === 'NO_SIGNAL' ? 'text-gray/60' : tempStatus.isAbnormal ? tempStatus.colorClass : 'text-text'
              }`}>
                {formatMetricDisplay(temperature, '°C', isDisconnected)}
              </div>
            </div>
            <span className="text-[11px] text-gray pt-1 truncate">
              {formatTargetBenchmark(temperature)}
            </span>
          </div>

          {/* Tile 3: Độ ẩm không khí */}
          <div className={`p-3 rounded-lg border flex flex-col justify-between ${
            humStatus.isAbnormal && !isDisconnected
              ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-900/60'
              : 'bg-bg border-border/80'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray">{t('Độ ẩm KK')}</span>
                <span className={`text-[11px] font-medium ${humStatus.colorClass}`}>{humStatus.text}</span>
              </div>
              <div className={`text-2xl font-bold tabular-nums leading-tight ${
                isDisconnected || humidity.status === 'NO_SIGNAL' ? 'text-gray/60' : humStatus.isAbnormal ? humStatus.colorClass : 'text-text'
              }`}>
                {formatMetricDisplay(humidity, '%', isDisconnected)}
              </div>
            </div>
            <span className="text-[11px] text-gray pt-1 truncate">
              {formatTargetBenchmark(humidity)}
            </span>
          </div>
        </div>

        {/* Soil S1 Chemistry Preview (preserved for contract compliance) */}
        {hasSoilMetrics && (
          <div
            data-testid="soil-s1-preview"
            className="px-3 py-2 rounded-lg bg-bg/80 border border-border/70"
          >
            <div className="flex items-center justify-between text-[11px] mb-1.5 text-gray font-medium">
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="material-symbols-outlined text-[15px] text-[#0072A8] dark:text-[#38BDF8]">
                  science
                </span>
                <span className="font-semibold text-text">{t('Hóa tính S1')}</span>
                <span className="text-[10px] text-gray bg-surface px-1 py-0.2 rounded border border-border/60">
                  {t('Dữ liệu thô')}
                </span>
              </span>
              {firstProvenance && (
                <span className="text-[10px] text-gray truncate" title={formatProvenanceLabel(firstProvenance)}>
                  {formatProvenanceLabel(firstProvenance)}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              {presentSoilMetrics.map((key) => {
                const metric = zone.soilProfile?.[key];
                if (!metric) return null;
                const meta = SOIL_METRIC_META[key];
                const status = metric.status;
                const isError = status === 'SENSOR_ERROR';
                const isNoSignal = status === 'NO_SIGNAL';
                const style = STATUS_STYLES[status] ?? STATUS_STYLES.NO_TARGET;

                let displayVal: string;
                if (isError) {
                  displayVal = t('Lỗi');
                } else if (isNoSignal || metric.value == null) {
                  displayVal = '--';
                } else {
                  displayVal = formatMetricValue(metric.value, metric.unit, status);
                }

                return (
                  <span
                    key={key}
                    data-testid={`soil-preview-${key}`}
                    data-status={status}
                    title={`${t(meta.label)}: ${getStatusLabel(key, status)}`}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-medium border ${style.badgeBg} ${style.borderColor} ${
                      isError ? 'text-coral' : isNoSignal ? 'text-gray' : 'text-text'
                    }`}
                  >
                    <span className="font-bold text-[#0072A8] dark:text-[#38BDF8]">
                      {meta.symbol}
                    </span>
                    <span>{displayVal}</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Soil Moisture Sparkline (if trend exists) */}
        {zone.soilMoistureTrend && (
          <SoilMoistureSparkline
            data={zone.soilMoistureTrend}
            targetMin={soilMoisture.targetMin}
            targetMax={soilMoisture.targetMax}
            status={soilMoisture.status}
            unit={soilMoisture.unit}
          />
        )}
      </div>

      {/* Card Footer: Timestamp on left, Actions on right */}
      <div className="flex items-center justify-between pt-2.5 border-t border-border/70 text-xs text-gray flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <span aria-hidden="true" className="material-symbols-outlined text-sm text-gray">schedule</span>
          <span>
            {lastRecordedTime
              ? `${formatTimeHHmm(lastRecordedTime)} · ${t('Đồng bộ cảm biến')}`
              : t('Chưa có dữ liệu')}
          </span>
        </div>

        {/* Dual Actions */}
        <div className="flex items-center gap-2.5">
          {totalAlerts > 0 && (
            <Link
              to={`/alerts?zone=${encodeURIComponent(zone.code)}${scope ? `&farmId=${farmId}` : ''}`}
              className="font-semibold text-amber-700 dark:text-amber-400 hover:underline inline-flex items-center gap-1"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-xs">warning</span>
              <span>{t('Xem {0} cảnh báo', [totalAlerts])}</span>
            </Link>
          )}

          <Link
            to={`/zones/${encodeURIComponent(zone.code)}${scope}`}
            className="px-3.5 py-1.5 bg-[#0072A8] hover:bg-[#005F8C] text-white rounded-lg font-semibold transition-colors inline-flex items-center gap-1.5 shadow-2xs"
          >
            <span>{t('Xem chi tiết')}</span>
            <span aria-hidden="true" className="material-symbols-outlined text-xs">arrow_forward</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
