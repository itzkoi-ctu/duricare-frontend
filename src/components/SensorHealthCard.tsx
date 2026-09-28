import type { ZoneOverview } from '../types/overview';

interface SensorHealthCardProps {
  zones: ZoneOverview[];
}

export default function SensorHealthCard({ zones }: SensorHealthCardProps) {
  let total = 0;
  let normal = 0;
  let warning = 0;
  let error = 0;
  let noSignal = 0;

  for (const zone of zones) {
    const list = [
      zone.metrics.temperature,
      zone.metrics.humidity,
      zone.metrics.soilMoisture,
    ];
    for (const m of list) {
      total++;
      if (m.status === 'NORMAL') normal++;
      else if (m.status === 'LOW' || m.status === 'HIGH') warning++;
      else if (m.status === 'SENSOR_ERROR') error++;
      else if (m.status === 'NO_SIGNAL') noSignal++;
    }
  }

  const healthRate = total > 0 ? Math.round((normal / total) * 100) : 100;

  // Segment widths in percentages for the multi-colored bar
  const normalPct = total > 0 ? (normal / total) * 100 : 100;
  const warningPct = total > 0 ? (warning / total) * 100 : 0;
  const errorPct = total > 0 ? (error / total) * 100 : 0;
  const noSignalPct = total > 0 ? (noSignal / total) * 100 : 0;

  return (
    <div className="rounded-2xl bg-surface border border-border p-4 md:p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        {/* Top Header */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-teal">
              sensors
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-gray">
              Tình trạng cảm biến
            </span>
          </div>

          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal/15 text-teal">
            {normal}/{total} đạt chuẩn
          </span>
        </div>

        {/* Main Health Percentage */}
        <div className="mt-2">
          <div className="flex items-baseline justify-between">
            <span
              className={`text-2xl md:text-3xl font-extrabold tracking-tight ${
                healthRate >= 70
                  ? 'text-teal'
                  : healthRate >= 50
                    ? 'text-amber'
                    : 'text-coral'
              }`}
            >
              {healthRate}%
            </span>
            <span className="text-xs text-gray font-medium">Tỷ lệ ổn định</span>
          </div>

          {/* Segmented Progress Bar */}
          <div className="w-full h-2 rounded-full bg-border overflow-hidden flex mt-2.5">
            {normalPct > 0 && (
              <div
                style={{ width: `${normalPct}%` }}
                className="bg-teal h-full transition-all"
                title={`${normal} chỉ số bình thường`}
              />
            )}
            {warningPct > 0 && (
              <div
                style={{ width: `${warningPct}%` }}
                className="bg-amber h-full transition-all"
                title={`${warning} chỉ số lệch ngưỡng`}
              />
            )}
            {errorPct > 0 && (
              <div
                style={{ width: `${errorPct}%` }}
                className="bg-coral h-full transition-all"
                title={`${error} lỗi cảm biến`}
              />
            )}
            {noSignalPct > 0 && (
              <div
                style={{ width: `${noSignalPct}%` }}
                className="bg-gray/60 h-full transition-all"
                title={`${noSignal} mất tín hiệu`}
              />
            )}
          </div>
        </div>

        {/* Breakdown chips */}
        <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
          <span className="px-1.5 py-0.5 rounded bg-teal/10 text-teal font-semibold">
            {normal} chuẩn
          </span>
          {warning > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-amber/10 text-amber font-semibold">
              {warning} cảnh báo
            </span>
          )}
          {error > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-coral/10 text-coral font-semibold">
              {error} lỗi
            </span>
          )}
          {noSignal > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-border text-gray font-semibold">
              {noSignal} mất tín hiệu
            </span>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-[10px] text-gray">
        <span>{total} điểm đo đang kết nối</span>
        <span className="font-medium text-text">{zones.length} khu vực</span>
      </div>
    </div>
  );
}
