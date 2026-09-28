import { Link } from 'react-router-dom';
import type { ZoneOverview } from '../types/overview';
import { GROWTH_STAGE_LABELS, type GrowthStage } from '../types/zone';
import {
  METRIC_NAMES,
  STATUS_STYLES,
  getStatusLabel,
  formatMetricValue,
  formatTargetHint,
  formatNoSignalHint,
} from '../utils/metricLabels';
import SoilMoistureSparkline from './SoilMoistureSparkline';

interface ZoneCardProps {
  zone: ZoneOverview;
}

export default function ZoneCard({ zone }: ZoneCardProps) {
  const totalAlerts = zone.alerts.hard + zone.alerts.agentic;
  const hasAgenticAlerts = zone.alerts.agentic > 0;

  const stageLabel =
    zone.growthStage && zone.growthStage in GROWTH_STAGE_LABELS
      ? GROWTH_STAGE_LABELS[zone.growthStage as GrowthStage]
      : zone.growthStage || 'Chưa cập nhật';

  const { temperature, humidity, soilMoisture } = zone.metrics;

  const metricsList = [
    { key: 'temperature' as const, data: temperature },
    { key: 'humidity' as const, data: humidity },
    { key: 'soilMoisture' as const, data: soilMoisture },
  ];

  return (
    <div className="rounded-2xl bg-surface border border-border p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
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
                  <span>Giống {zone.variety}</span>
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Zone badge: styled differently if agentic > 0 */}
            {totalAlerts > 0 ? (
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-2xs ${
                  hasAgenticAlerts
                    ? 'bg-gradient-to-r from-coral to-amber text-white ring-1 ring-amber/50'
                    : 'bg-coral text-white'
                }`}
                title={
                  hasAgenticAlerts
                    ? `${zone.alerts.hard} cảnh báo cứng, ${zone.alerts.agentic} từ AI Agent`
                    : `${totalAlerts} cảnh báo`
                }
              >
                <span className="material-symbols-outlined text-[13px]">
                  {hasAgenticAlerts ? 'psychology' : 'warning'}
                </span>
                {totalAlerts} cảnh báo
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-teal/15 text-teal flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">check_circle</span>
                Ổn định
              </span>
            )}

            {/* Chevron linking to /zones/:code */}
            <Link
              to={`/zones/${zone.code}`}
              className="p-1 rounded-lg text-gray hover:text-text hover:bg-bg transition-colors"
              title="Xem trang chi tiết vùng"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </Link>
          </div>
        </div>

        {/* 3 Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-bg border border-border/70 mb-4">
          {metricsList.map(({ key, data }) => {
            const meta = METRIC_NAMES[key];
            const statusLabel = getStatusLabel(key, data.status);
            const style = STATUS_STYLES[data.status];
            const targetHint = formatTargetHint(data.targetMin, data.targetMax, data.unit);
            const noSignalHint = formatNoSignalHint(data.recordedAt);
            const displayValue = formatMetricValue(data.value, data.unit, data.status);

            return (
              <div
                key={key}
                className="flex flex-col items-center text-center p-2 rounded-lg bg-surface border border-border/50 shadow-2xs min-w-0"
              >
                {/* Metric label & icon */}
                <span className="text-[11px] font-medium text-gray flex items-center gap-0.5 truncate">
                  <span className={`material-symbols-outlined text-[13px] ${style.textColor}`}>
                    {meta.icon}
                  </span>
                  {meta.label}
                </span>

                {/* Metric Value */}
                <span className={`text-base font-bold my-0.5 truncate ${data.status === 'SENSOR_ERROR' || data.status === 'HIGH' ? 'text-coral' : 'text-text'}`}>
                  {displayValue}
                </span>

                {/* Status word badge */}
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold leading-tight ${style.badgeBg} ${style.badgeText} truncate max-w-full`}
                >
                  {statusLabel}
                </span>

                {/* Subtitle: Muted target range or NO_SIGNAL time */}
                <span className="text-[9px] text-gray mt-1 leading-tight line-clamp-1">
                  {data.status === 'NO_SIGNAL' ? noSignalHint : targetHint || 'Theo dõi'}
                </span>
              </div>
            );
          })}
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
          to={`/alerts?zone=${zone.code}`}
          className="w-full mt-1 inline-flex items-center justify-between px-4 py-2.5 rounded-xl bg-coral text-white font-semibold text-xs md:text-sm hover:bg-coral/90 shadow-sm transition-all cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[17px]">warning</span>
            Xem {totalAlerts} cảnh báo
          </span>
          <span className="material-symbols-outlined text-[17px]">arrow_forward</span>
        </Link>
      ) : (
        <Link
          to={`/zones/${zone.code}`}
          className="w-full mt-1 inline-flex items-center justify-between px-4 py-2.5 rounded-xl bg-bg hover:bg-surface border border-border text-text font-semibold text-xs md:text-sm hover:border-navy/30 transition-all cursor-pointer"
        >
          <span>Xem chi tiết</span>
          <span className="material-symbols-outlined text-[17px]">chevron_right</span>
        </Link>
      )}
    </div>
  );
}
