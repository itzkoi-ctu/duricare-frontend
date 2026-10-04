import { useLanguage } from '../i18n/useLanguage';
import { t } from '../i18n';
import type { MetricChipProps } from '../types/zoneDetail';
import { METRIC_NAMES, STATUS_STYLES, getStatusLabel, formatMetricValue, formatTargetHint, formatNoSignalHint } from '../utils/metricLabels';

export default function MetricChip({ metricKey, metric, variant = 'card' }: MetricChipProps) {
  useLanguage();
  const meta = METRIC_NAMES[metricKey];
  const style = STATUS_STYLES[metric.status];
  const detail = variant === 'detail';
  const target = formatTargetHint(metric.targetMin, metric.targetMax, metric.unit);
  return <div data-metric={metricKey} className={`flex min-w-0 flex-col ${detail ? 'items-start rounded-xl bg-bg p-2 md:p-4' : 'items-center text-center py-2 rounded-lg bg-surface'} border border-border/50 shadow-2xs`}>
    <span className={`${detail ? 'text-[11px] md:text-xs' : 'text-[11px]'} whitespace-nowrap font-medium text-gray flex items-center gap-0.5`}>
      <span aria-hidden="true" className={`material-symbols-outlined ${detail ? 'text-[18px]' : 'text-[13px]'} ${style.textColor}`}>{meta.icon}</span>{t(meta.label)}
    </span>
    <span className={`${detail ? 'text-xl md:text-2xl' : 'text-base'} font-bold my-0.5 ${metric.status === 'SENSOR_ERROR' || metric.status === 'HIGH' ? 'text-coral' : 'text-text'}`}>
      {formatMetricValue(metric.value, metric.unit, metric.status)}
    </span>
    <span data-status={metric.status} className={`w-fit whitespace-nowrap shrink-0 px-1 py-0.5 rounded ${detail ? 'text-[9px] md:text-[10px]' : 'text-[10px]'} font-bold leading-tight ${style.badgeBg} ${style.badgeText}`}>{getStatusLabel(metricKey, metric.status)}</span>
    <span className={`${detail ? 'text-[9px] md:text-xs' : 'text-[9px] line-clamp-1'} text-gray mt-1 leading-tight`}>
      {detail ? target || t('Chưa có khoảng mục tiêu') : metric.status === 'NO_SIGNAL' ? formatNoSignalHint(metric.recordedAt) : target || t('Theo dõi')}
    </span>
    {detail && metric.status === 'NO_SIGNAL' && <span className="mt-1 text-[10px] text-gray">{formatNoSignalHint(metric.recordedAt)}</span>}
  </div>;
}
