import { Link } from 'react-router-dom';
import type { ZoneOverview } from '../types/overview';

interface OverviewBannerProps {
  zones: ZoneOverview[];
  totalUnresolvedAlerts: number;
}

function getZoneIssues(zone: ZoneOverview): string[] {
  const issues: string[] = [];
  const { temperature, humidity, soilMoisture } = zone.metrics;

  if (temperature.status === 'SENSOR_ERROR') {
    issues.push(`lỗi cảm biến nhiệt độ ${temperature.value !== null ? `(${temperature.value}°C)` : ''}`.trim());
  } else if (temperature.status === 'HIGH') {
    issues.push(`nhiệt độ cao ${temperature.value !== null ? `${temperature.value}°C` : ''}`.trim());
  } else if (temperature.status === 'LOW') {
    issues.push(`nhiệt độ thấp ${temperature.value !== null ? `${temperature.value}°C` : ''}`.trim());
  } else if (temperature.status === 'NO_SIGNAL') {
    issues.push('mất tín hiệu nhiệt độ');
  }

  if (humidity.status === 'HIGH') {
    issues.push(`độ ẩm KK cao ${humidity.value !== null ? `(${humidity.value}%)` : ''}`.trim());
  } else if (humidity.status === 'LOW') {
    issues.push(`độ ẩm KK hơi khô ${humidity.value !== null ? `(${humidity.value}%)` : ''}`.trim());
  } else if (humidity.status === 'SENSOR_ERROR') {
    issues.push('lỗi cảm biến ẩm KK');
  } else if (humidity.status === 'NO_SIGNAL') {
    issues.push('mất tín hiệu ẩm KK');
  }

  if (soilMoisture.status === 'HIGH') {
    issues.push(`độ ẩm đất vượt ngưỡng ${soilMoisture.value !== null ? `(${soilMoisture.value}%)` : ''}`.trim());
  } else if (soilMoisture.status === 'LOW') {
    issues.push(`độ ẩm đất dưới ngưỡng ${soilMoisture.value !== null ? `(${soilMoisture.value}%)` : ''}`.trim());
  } else if (soilMoisture.status === 'SENSOR_ERROR') {
    issues.push('lỗi cảm biến ẩm đất');
  } else if (soilMoisture.status === 'NO_SIGNAL') {
    issues.push('mất tín hiệu ẩm đất');
  }

  const alertSum = zone.alerts.hard + zone.alerts.agentic;
  if (alertSum > 0 && issues.length === 0) {
    issues.push(`${alertSum} cảnh báo chưa xử lý`);
  }

  return issues;
}

export default function OverviewBanner({ zones, totalUnresolvedAlerts }: OverviewBannerProps) {
  const problemZones = zones.filter((zone) => {
    const hasAlerts = zone.alerts.hard + zone.alerts.agentic > 0;
    const hasAbnormalMetric =
      zone.metrics.temperature.status !== 'NORMAL' ||
      zone.metrics.humidity.status !== 'NORMAL' ||
      zone.metrics.soilMoisture.status !== 'NORMAL';
    return hasAlerts || hasAbnormalMetric;
  });

  const hasProblems = problemZones.length > 0;

  // Compose banner text dynamically from actual data
  let bannerTitle = 'Tất cả các khu vực đang hoạt động ổn định';
  let bannerDescription =
    'Các chỉ số nhiệt độ, độ ẩm không khí và độ ẩm đất mô rễ đều nằm trong ngưỡng an toàn.';

  if (hasProblems) {
    bannerTitle = `${problemZones.length} khu vực cần kiểm tra khẩn cấp`;
    const details = problemZones
      .map((z) => {
        const issues = getZoneIssues(z);
        const reasonText = issues.length > 0 ? issues.join(', ') : 'có bất thường';
        return `${z.name} (${reasonText})`;
      })
      .join(' và ');
    bannerDescription = `Phát hiện bất thường tại ${details}.`;
  }

  return (
    <div
      className={`rounded-2xl p-5 md:p-6 shadow-sm border transition-all relative overflow-hidden flex flex-col justify-between ${
        hasProblems
          ? 'bg-surface border-coral/30 dark:border-coral/40'
          : 'bg-surface border-teal/30 dark:border-teal/40'
      }`}
    >
      {/* Decorative gradient blur background */}
      <div
        className={`absolute -right-8 -bottom-8 w-40 h-40 rounded-full pointer-events-none blur-2xl opacity-15 ${
          hasProblems ? 'bg-coral' : 'bg-teal'
        }`}
      />

      <div>
        {/* Banner sub-header with pulse and event count */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  hasProblems ? 'bg-coral' : 'bg-teal'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  hasProblems ? 'bg-coral' : 'bg-teal'
                }`}
              />
            </span>
            <span
              className={`text-xs md:text-sm font-bold uppercase tracking-wider ${
                hasProblems ? 'text-coral' : 'text-teal'
              }`}
            >
              {hasProblems ? 'Cảnh báo trạm đo vi khí hậu' : 'Trạng thái trạm đo'}
            </span>
          </div>

          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
              totalUnresolvedAlerts > 0
                ? 'bg-coral text-white'
                : 'bg-teal/15 text-teal'
            }`}
          >
            {totalUnresolvedAlerts} sự kiện
          </span>
        </div>

        {/* Dynamic Title */}
        <h2 className="text-lg md:text-xl font-bold text-text tracking-tight">
          {bannerTitle}
        </h2>

        {/* Dynamic Description */}
        <p className="text-sm text-gray mt-1 leading-relaxed max-w-4xl">
          {bannerDescription}
        </p>
      </div>

      {/* Primary Action Button */}
      <div className="flex flex-wrap items-center gap-3 mt-4 pt-2">
        <Link
          to="/alerts"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-navy text-white text-sm font-semibold hover:bg-navy/90 active:scale-98 transition-all shadow-sm cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">warning</span>
          <span>Xem cảnh báo</span>
        </Link>
      </div>
    </div>
  );
}
