import { useLanguage } from '../i18n/useLanguage';
import { t, getLocale } from '../i18n';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
} from 'recharts';
import type { SensorChartData } from '../hooks/useZoneDetail';
import type { MetricData } from '../types/overview';
import { formatTargetHint, formatMetricValue } from '../utils/metricLabels';
import { getChartDomain } from '../utils/chartDomain';

interface SensorChartProps {
  title: string;
  icon?: string;
  unit: string;
  color: string;
  chart: SensorChartData;
  metric?: MetricData;
  onRetry?: () => void;
  isMain?: boolean;
}

export default function SensorChart({
  title,
  unit,
  color,
  chart,
  metric,
  onRetry,
  isMain = false,
}: SensorChartProps) {
  useLanguage();
  const localizedData = chart.data.map(point => ({
    ...point,
    label: new Date(point.time).toLocaleString(getLocale(), {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    }),
  }));

  const hasTarget = metric?.targetMin != null && metric.targetMax != null;
  const domain = getChartDomain(chart.data.map(point => point.value), metric?.targetMin, metric?.targetMax);
  const lastPoint = chart.data.at(-1);
  const formattedLastTime = lastPoint?.time
    ? new Date(lastPoint.time).toLocaleString(getLocale(), {
        timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div
      data-chart={title}
      data-chart-points={chart.data.length}
      data-first-reading={chart.data[0]?.time}
      data-last-reading={lastPoint?.time}
      className="bg-surface rounded-xl border border-border p-5 shadow-sm space-y-3"
    >
      {/* Chart header matching Stitch */}
      {isMain ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <h3 className="text-[15px] font-bold text-text">{title} ({unit})</h3>
            {lastPoint && (
              <span className="text-[12px] font-medium text-[#b45309] dark:text-amber-400 bg-[#fffbeb] dark:bg-amber-950/40 px-2 py-0.5 rounded border border-[#fde68a] dark:border-amber-800/40">
                {t('Điểm cuối: {0} ({1})', [
                  formatMetricValue(lastPoint.value, unit, 'NORMAL'),
                  formattedLastTime ?? '',
                ])}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-[12px]">
            {hasTarget && (
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-2.5 bg-[#fef3c7] dark:bg-amber-900/40 border border-[#fde68a] dark:border-amber-800/40 rounded-xs" />
                <span className="text-[#92400e] dark:text-amber-300 font-medium">
                  {t('Khoảng mục tiêu cấu hình {0}–{1}%', [metric.targetMin, metric.targetMax])}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 rounded-xs" style={{ backgroundColor: color }} />
              <span className="text-gray font-medium">{t('Số đo cảm biến')}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <h3 className="text-[14px] font-bold text-text">{title} ({unit})</h3>
            {lastPoint && (
              <span className="text-[11px] text-gray bg-[#f1f5f9] dark:bg-bg px-2 py-0.5 rounded">
                {t('Cuối: {0}', [formatMetricValue(lastPoint.value, unit, 'NORMAL')])}
              </span>
            )}
          </div>
          <div className="text-[11px] text-gray italic">
            {hasTarget
              ? formatTargetHint(metric.targetMin, metric.targetMax, unit)
              : t('Chưa có khoảng mục tiêu')}
          </div>
        </div>
      )}

      {/* Chart body */}
      {chart.loading ? (
        <div className={isMain ? "h-[220px] flex items-center justify-center" : "h-[180px] flex items-center justify-center"}>
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-[#1F5CA9]/30 border-t-[#1F5CA9] rounded-full animate-spin" />
            <span className="text-xs text-gray">{t("Đang tải biểu đồ...")}</span>
          </div>
        </div>
      ) : chart.error ? (
        <div className={isMain ? "h-[220px] flex items-center justify-center" : "h-[180px] flex items-center justify-center"}>
          <div className="text-center space-y-3">
            <p className="text-sm text-coral">{t('Không thể tải biểu đồ. Vui lòng thử lại.')}</p>
            {onRetry && (
              <button onClick={onRetry} className="min-h-11 rounded-lg border border-border px-4 text-xs font-semibold text-text hover:bg-bg cursor-pointer">
                {t('Thử lại')}
              </button>
            )}
          </div>
        </div>
      ) : chart.data.length === 0 ? (
        <div className={isMain ? "h-[220px] flex items-center justify-center" : "h-[180px] flex items-center justify-center"}>
          <p className="text-sm text-gray italic">{t("Không có dữ liệu trong khoảng thời gian này")}</p>
        </div>
      ) : (
        <div className={isMain ? "h-[220px]" : "h-[180px]"}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={localizedData} margin={{ top: 8, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
                opacity={0.6}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: 'var(--color-gray)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--color-border)' }}
                interval="preserveStartEnd"
                minTickGap={35}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--color-gray)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--color-border)' }}
                width={42}
                domain={domain}
              />
              {hasTarget && (
                <ReferenceArea
                  y1={metric.targetMin!}
                  y2={metric.targetMax!}
                  fill="#fef3c7"
                  fillOpacity={0.5}
                  strokeOpacity={0}
                  ifOverflow="extendDomain"
                />
              )}
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '10px',
                  fontSize: '12px',
                  color: 'var(--color-text)',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
                labelStyle={{ color: 'var(--color-gray)', marginBottom: '4px', fontSize: '11px' }}
                formatter={(value) => [
                  value !== undefined && value !== null ? `${Number(value).toFixed(1)} ${unit}` : '',
                  title,
                ]}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={isMain ? 2.5 : 2}
                dot={{ r: isMain ? 3.5 : 3, fill: color, stroke: '#ffffff', strokeWidth: 1.5 }}
                activeDot={{ r: isMain ? 5 : 4.5, fill: color, stroke: '#ffffff', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
