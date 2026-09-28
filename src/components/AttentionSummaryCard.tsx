import { Link } from 'react-router-dom';
import type { ZoneOverview } from '../types/overview';

interface AttentionSummaryCardProps {
  totalUnresolvedAlerts: number;
  zones: ZoneOverview[];
}

export default function AttentionSummaryCard({
  totalUnresolvedAlerts,
  zones,
}: AttentionSummaryCardProps) {
  const problemZones = zones.filter((z) => {
    const hasAlerts = z.alerts.hard + z.alerts.agentic > 0;
    const hasAbnormalMetric =
      z.metrics.temperature.status !== 'NORMAL' ||
      z.metrics.humidity.status !== 'NORMAL' ||
      z.metrics.soilMoisture.status !== 'NORMAL';
    return hasAlerts || hasAbnormalMetric;
  });

  const hasIssues = totalUnresolvedAlerts > 0 || problemZones.length > 0;

  return (
    <div
      className={`rounded-2xl bg-surface border p-4 md:p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
        hasIssues
          ? 'border-coral/40 dark:border-coral/30 bg-coral/[0.02]'
          : 'border-border'
      }`}
    >
      <div>
        {/* Top Header */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                hasIssues ? 'bg-coral animate-pulse' : 'bg-teal'
              }`}
            />
            <span className="text-xs font-bold uppercase tracking-wider text-gray">
              Khu vực cần chú ý
            </span>
          </div>

          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              hasIssues ? 'bg-coral/15 text-coral' : 'bg-teal/15 text-teal'
            }`}
          >
            {hasIssues ? `${totalUnresolvedAlerts} cảnh báo` : 'Tất cả ổn định'}
          </span>
        </div>

        {/* Main Content */}
        <div className="mt-2">
          <h3 className="text-lg md:text-xl font-extrabold text-text tracking-tight">
            {hasIssues
              ? `${problemZones.length} khu vực cần kiểm tra`
              : 'Nông trại hoạt động tốt'}
          </h3>

          <p className="text-xs text-gray mt-1 line-clamp-2 leading-relaxed">
            {hasIssues
              ? problemZones.map((z) => `${z.name} (${z.alerts.hard + z.alerts.agentic} sự kiện)`).join(' • ')
              : 'Các chỉ số nhiệt độ, độ ẩm không khí và độ ẩm đất đều nằm trong ngưỡng sinh trưởng tối ưu.'}
          </p>
        </div>
      </div>

      {/* Footer Action */}
      <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
        <span className="text-[11px] text-gray">
          {hasIssues ? 'Xử lý ngay các bất thường' : 'Giám sát liên tục'}
        </span>
        <Link
          to="/alerts"
          className={`inline-flex items-center gap-1 text-xs font-semibold hover:underline ${
            hasIssues ? 'text-coral' : 'text-teal'
          }`}
        >
          <span>Xem cảnh báo</span>
          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
        </Link>
      </div>
    </div>
  );
}
