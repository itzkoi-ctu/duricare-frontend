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
import { formatTargetHint } from '../utils/metricLabels';
import { getChartDomain } from '../utils/chartDomain';

interface SensorChartProps {
  title: string;
  icon: string;
  unit: string;
  color: string;
  chart: SensorChartData;
  metric?: MetricData;
  onRetry?: () => void;
}

export default function SensorChart({ title, icon, unit, color, chart, metric, onRetry }: SensorChartProps) {
  useLanguage();
  const localizedData = chart.data.map(point => ({
    ...point,
    label: new Date(point.time).toLocaleString(getLocale(), {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    }),
  }));
  const hasTarget = metric?.targetMin != null && metric.targetMax != null;
  const domain = getChartDomain(chart.data.map(point => point.value), metric?.targetMin, metric?.targetMax);
  return (
    <div data-chart={title} data-chart-points={chart.data.length} data-first-reading={chart.data[0]?.time} data-last-reading={chart.data.at(-1)?.time} className="bg-surface border border-border rounded-2xl p-4 md:p-6 shadow-sm">
      {/* Chart header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <span aria-hidden="true" className="material-symbols-outlined rounded-lg bg-navy/10 p-2 text-navy dark:text-blue">{icon}</span>
          <div><h3 className="text-sm font-semibold text-text">{title} ({unit})</h3>
            <p className="mt-1 text-xs text-gray">{metric ? formatTargetHint(metric.targetMin, metric.targetMax, unit) || t('Chưa có khoảng mục tiêu') : t('Đang tải khoảng mục tiêu...')}</p></div>
        </div>
        {hasTarget && <span className="inline-flex items-center gap-1.5 text-[11px] text-gray"><span className="h-2.5 w-4 rounded-sm bg-teal/20 border border-teal/30" />{t('Khoảng mục tiêu')}</span>}
      </div>

      {/* Chart body */}
      {chart.loading ? (
        <div className="h-52 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />
            <span className="text-xs text-gray">{t("Đang tải biểu đồ...")}</span>
          </div>
        </div>
      ) : chart.error ? (
        <div className="h-52 flex items-center justify-center">
          <div className="text-center space-y-3"><p className="text-sm text-coral">{t('Không thể tải biểu đồ. Vui lòng thử lại.')}</p>
            {onRetry && <button onClick={onRetry} className="min-h-11 rounded-lg border border-border px-4 text-sm text-text cursor-pointer">{t('Thử lại')}</button>}</div>
        </div>
      ) : chart.data.length === 0 ? (
        <div className="h-52 flex items-center justify-center">
          <p className="text-sm text-gray italic">{t("Không có dữ liệu trong khoảng thời gian này")}</p>
        </div>
      ) : (
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={localizedData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
                opacity={0.6}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: 'var(--color-gray)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--color-border)' }}
                interval="preserveStartEnd"
                minTickGap={40}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--color-gray)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--color-border)' }}
                width={45}
                domain={domain}
              />
              {hasTarget && <ReferenceArea y1={metric.targetMin!} y2={metric.targetMax!} fill="var(--color-teal)" fillOpacity={0.18} strokeOpacity={0} ifOverflow="extendDomain" />}
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '12px',
                  fontSize: '13px',
                  color: 'var(--color-text)',
                }}
                labelStyle={{ color: 'var(--color-gray)', marginBottom: '4px' }}
                formatter={(value) => [
                  value !== undefined && value !== null ? `${Number(value).toFixed(1)} ${unit}` : '',
                  title,
                ]}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
