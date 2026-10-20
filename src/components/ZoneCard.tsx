import { useLanguage } from '../i18n/useLanguage';
import { t } from '../i18n';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { ZoneOverview } from '../types/overview';
import { GROWTH_STAGE_LABELS, type GrowthStage } from '../types/zone';
import MetricChip from './MetricChip';
import SoilMoistureSparkline from './SoilMoistureSparkline';
import { alertSourceClasses } from '../utils/alertStyles';
import {
  formatObservedCadence,
  SOIL_METRIC_META,
  STATUS_STYLES,
  formatMetricValue,
  getStatusLabel,
  formatProvenanceLabel,
} from '../utils/metricLabels';

interface ZoneCardProps {
  zone: ZoneOverview;
}

const CHEMISTRY_PREVIEW_KEYS = ['ph', 'ec', 'n', 'p', 'k'] as const;

export default function ZoneCard({ zone }: ZoneCardProps) {
  useLanguage();
  const { search } = useLocation();
  const { user } = useAuth();
  const farmId = Number(new URLSearchParams(search).get('farmId'));
  const scope = user?.role === 'ADMIN' && Number.isSafeInteger(farmId) && farmId > 0 ? `?farmId=${farmId}` : '';
  const totalAlerts = zone.alerts.hard + zone.alerts.agentic;
  const hasAgenticAlerts = zone.alerts.agentic > 0;

  const stageLabel =
    zone.growthStage && zone.growthStage in GROWTH_STAGE_LABELS
      ? t(GROWTH_STAGE_LABELS[zone.growthStage as GrowthStage])
      : zone.growthStage || t("Chưa cập nhật");

  const { temperature, humidity, soilMoisture } = zone.metrics;

  const metricsList = [
    { key: 'temperature' as const, data: temperature },
    { key: 'humidity' as const, data: humidity },
    { key: 'soilMoisture' as const, data: soilMoisture },
  ];

  const cadenceLabel = formatObservedCadence(zone.observedCadenceSeconds);

  // F2 Fix: Check if any soil metric exists in profile
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

  return (
    <div data-zone={zone.code} className="rounded-2xl bg-surface border border-border p-3 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        {/* Header: Name, Code, Stage, Badge & Chevron */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-text truncate">
                {zone.name}
              </h3>
              <span className="px-1.5 py-0.5 rounded bg-bg border border-border/80 text-[11px] font-semibold text-gray">
                {zone.code}
              </span>
              {cadenceLabel && (
                <span
                  title={t('Tần suất nhận dữ liệu quan sát được, không phải chu kỳ đo cố định của cảm biến')}
                  className="px-1.5 py-0.5 rounded bg-bg border border-border/60 text-[10px] font-medium text-gray truncate"
                >
                  {cadenceLabel}
                </span>
              )}
            </div>
            <p className="text-xs text-gray mt-1 flex items-center gap-1.5 truncate">
              <span>🌱 {stageLabel}</span>
              {zone.variety && (
                <>
                  <span>•</span>
                  <span>{t("Giống")} {zone.variety}</span>
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Zone badge: styled differently if agentic > 0 */}
            {totalAlerts > 0 ? (
              <span
                aria-label={t("{0} cảnh báo", [totalAlerts])}
                className={`min-w-7 h-7 px-1.5 rounded-full text-xs font-bold inline-flex items-center justify-center shadow-2xs ${
                  alertSourceClasses(hasAgenticAlerts ? 'AGENTIC' : 'HARD')
                }`}
                title={
                  hasAgenticAlerts
                    ? t("{0} cảnh báo cứng, {1} từ AI Agent", [zone.alerts.hard, zone.alerts.agentic])
                    : t("{0} cảnh báo", [totalAlerts])
                }
              >
                {totalAlerts}
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-teal/15 text-teal flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">check_circle</span> {t("Ổn định")} </span>
            )}

            {/* Chevron linking to /zones/:code */}
            <Link
              to={`/zones/${encodeURIComponent(zone.code)}${scope}`}
              className="p-1 rounded-lg text-gray hover:text-text hover:bg-bg transition-colors"
              title={t("Xem trang chi tiết vùng")}
            >
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </Link>
          </div>
        </div>

        {/* 3 Metrics Grid */}
        <div className="grid grid-cols-3 gap-1 p-1.5 sm:gap-2 sm:p-2.5 rounded-xl bg-bg border border-border/70 mb-3">
          {metricsList.map(({ key, data }) => <MetricChip key={key} metricKey={key} metric={data} />)}
        </div>

        {/* F2 Fix: Status-aware Soil S1 Chemistry Preview */}
        {hasSoilMetrics && (
          <div data-testid="soil-s1-preview" className="mb-3 px-2.5 py-2 rounded-xl bg-bg/60 border border-border/60">
            <div className="flex items-center justify-between text-[11px] mb-1.5 text-gray font-medium">
              <span className="flex items-center gap-1">
                <span aria-hidden="true" className="material-symbols-outlined text-[14px] text-navy dark:text-blue">
                  science
                </span>
                <span>{t('Hóa tính S1')}</span>
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
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-semibold border ${style.badgeBg} ${style.borderColor} ${
                      isError ? 'text-coral' : isNoSignal ? 'text-gray' : 'text-text'
                    }`}
                  >
                    <span className="font-bold text-navy dark:text-blue">{meta.symbol}</span>
                    <span>{displayVal}</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Soil Moisture Sparkline (only rendered if soilMoistureTrend is present - no fake data) */}
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

      {/* ONE Primary Action Button */}
      {totalAlerts > 0 ? (
        <Link
          to={`/alerts?zone=${encodeURIComponent(zone.code)}${scope ? `&farmId=${farmId}` : ''}`}
          className="w-full mt-3 inline-flex items-center justify-between px-4 py-2.5 rounded-xl bg-coral text-white font-semibold text-xs md:text-sm hover:bg-coral/90 shadow-sm transition-all cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[17px]">warning</span>
            Xem {totalAlerts} {t("cảnh báo")} </span>
          <span className="material-symbols-outlined text-[17px]">arrow_forward</span>
        </Link>
      ) : (
        <Link
          to={`/zones/${encodeURIComponent(zone.code)}${scope}`}
          className="w-full mt-3 inline-flex items-center justify-between px-4 py-2.5 rounded-xl bg-bg hover:bg-surface border border-border text-text font-semibold text-xs md:text-sm hover:border-navy/30 transition-all cursor-pointer"
        >
          <span>{t("Xem chi tiết")}</span>
          <span className="material-symbols-outlined text-[17px]">chevron_right</span>
        </Link>
      )}
    </div>
  );
}
