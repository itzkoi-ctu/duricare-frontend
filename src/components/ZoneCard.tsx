import { useLanguage } from '../i18n/useLanguage';
import { t } from '../i18n';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { ZoneOverview } from '../types/overview';
import { GROWTH_STAGE_LABELS, type GrowthStage } from '../types/zone';
import MetricChip from './MetricChip';
import SoilMoistureSparkline from './SoilMoistureSparkline';
import { alertSourceClasses } from '../utils/alertStyles';

interface ZoneCardProps {
  zone: ZoneOverview;
}

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
        <div className="grid grid-cols-3 gap-1 p-1.5 sm:gap-2 sm:p-2.5 rounded-xl bg-bg border border-border/70 mb-4">
          {metricsList.map(({ key, data }) => <MetricChip key={key} metricKey={key} metric={data} />)}
        </div>

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
          className="w-full mt-1 inline-flex items-center justify-between px-4 py-2.5 rounded-xl bg-coral text-white font-semibold text-xs md:text-sm hover:bg-coral/90 shadow-sm transition-all cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[17px]">warning</span>
            Xem {totalAlerts} {t("cảnh báo")} </span>
          <span className="material-symbols-outlined text-[17px]">arrow_forward</span>
        </Link>
      ) : (
        <Link
          to={`/zones/${encodeURIComponent(zone.code)}${scope}`}
          className="w-full mt-1 inline-flex items-center justify-between px-4 py-2.5 rounded-xl bg-bg hover:bg-surface border border-border text-text font-semibold text-xs md:text-sm hover:border-navy/30 transition-all cursor-pointer"
        >
          <span>{t("Xem chi tiết")}</span>
          <span className="material-symbols-outlined text-[17px]">chevron_right</span>
        </Link>
      )}
    </div>
  );
}
