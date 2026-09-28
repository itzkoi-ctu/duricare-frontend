import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { SensorChartData } from '../hooks/useZoneDetail';

interface SensorChartProps {
  title: string;
  icon: string;
  unit: string;
  color: string;
  chart: SensorChartData;
}

export default function SensorChart({ title, icon, unit, color, chart }: SensorChartProps) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-5">
      {/* Chart header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">{icon}</span>
        <h3 className="text-sm font-semibold text-text">{title}</h3>
        <span className="text-xs text-gray">({unit})</span>
      </div>

      {/* Chart body */}
      {chart.loading ? (
        <div className="h-52 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />
            <span className="text-xs text-gray">Đang tải biểu đồ...</span>
          </div>
        </div>
      ) : chart.error ? (
        <div className="h-52 flex items-center justify-center">
          <p className="text-sm text-coral">{chart.error}</p>
        </div>
      ) : chart.data.length === 0 ? (
        <div className="h-52 flex items-center justify-center">
          <p className="text-sm text-gray italic">Không có dữ liệu trong khoảng thời gian này</p>
        </div>
      ) : (
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart.data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
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
                domain={['auto', 'auto']}
              />
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
