import { useLanguage } from '../i18n/useLanguage';
import { t } from '../i18n';
import { useMemo } from 'react';
import { useOverviewContext } from '../context/OverviewContext';
import DashboardHeader from '../components/DashboardHeader';
import AttentionSummaryCard from '../components/AttentionSummaryCard';
import WeatherCard from '../components/WeatherCard';
import SensorHealthCard from '../components/SensorHealthCard';
import TopInsightCard from '../components/TopInsightCard';
import ZoneCard from '../components/ZoneCard';
import ForecastPanel from '../components/ForecastPanel';
import InsightCard from '../components/InsightCard';
import OverviewSkeleton from '../components/OverviewSkeleton';
import ErrorState from '../components/ErrorState';
import type { ZoneOverview } from '../types/overview';

function isProblemZone(zone: ZoneOverview): boolean {
  const hasAlerts = zone.alerts.hard + zone.alerts.agentic > 0;
  const hasAbnormalMetric =
    zone.metrics.temperature.status !== 'NORMAL' ||
    zone.metrics.humidity.status !== 'NORMAL' ||
    zone.metrics.soilMoisture.status !== 'NORMAL';
  return hasAlerts || hasAbnormalMetric;
}

export default function DashboardPage() {
  useLanguage();
  const { data, loading, refreshing, error, lastUpdated, refresh } = useOverviewContext();

  const zones = data?.zones;
  // Sort zones: zones with problems first
  const sortedZones = useMemo(() => {
    if (!zones) return [];
    return [...zones].sort((a, b) => {
      const aProb = isProblemZone(a) ? 1 : 0;
      const bProb = isProblemZone(b) ? 1 : 0;
      if (aProb !== bProb) {
        return bProb - aProb; // Problem zones first
      }
      return a.code.localeCompare(b.code);
    });
  }, [zones]);

  if (loading && !data) {
    return <OverviewSkeleton />;
  }

  if (error && !data) {
    return <ErrorState message={error} onRetry={refresh} />;
  }

  if (!data || data.zones.length === 0) {
    return (
      <div className="space-y-6">
        <DashboardHeader
          farmName={data?.farmName ?? null}
          lastUpdated={lastUpdated}
          refreshing={refreshing}
          onRefresh={refresh}
        />
        <div className="flex items-center justify-center min-h-[40vh] p-6">
          <div className="max-w-md w-full text-center bg-surface border border-border rounded-2xl p-8 shadow-sm">
            <div className="text-5xl mb-3" role="img" aria-label={t('Cây con')}>
              🌱
            </div>
            <h2 className="text-lg font-bold text-text mb-2"> {t("Chưa có vùng canh tác")} </h2>
            <p className="text-sm text-gray leading-relaxed mb-4"> {t("Hệ thống chưa ghi nhận vùng canh tác nào trong cơ sở dữ liệu. Vui lòng thêm vùng và thiết bị cảm biến để bắt đầu theo dõi.")} </p>
            <button
              onClick={() => refresh()}
              className="px-4 py-2 rounded-xl bg-teal text-white text-xs font-semibold hover:bg-teal/90 transition-all cursor-pointer shadow-2xs"
            > {t("Kiểm tra lại")} </button>
          </div>
        </div>
      </div>
    );
  }

  const hasWeather = Boolean(data.weather);

  return (
    <div className="space-y-6">
      {/* 1. Header controls */}
      <DashboardHeader
        farmName={data.farmName}
        lastUpdated={lastUpdated}
        refreshing={refreshing}
        onRefresh={refresh}
      />

      {/* 2. Top Row 4 KPI Cards (Attention summary, Weather, Sensor health, Latest insight) */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 ${
          hasWeather ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
        } gap-4 md:gap-5`}
      >
        <AttentionSummaryCard
          totalUnresolvedAlerts={data.totalUnresolvedAlerts}
          zones={data.zones}
        />

        {/* Weather card (gracefully hidden if weather is null) */}
        {hasWeather && <WeatherCard weather={data.weather} />}

        <SensorHealthCard zones={data.zones} />

        <TopInsightCard insight={data.latestInsight} />
      </div>

      {/* 3. Main Zone Cards Grid (3 columns on desktop, 1 on mobile) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-teal">
              yard
            </span>
            <h2 className="text-lg md:text-xl font-bold text-text"> {t("Trạng thái cảm biến các vùng canh tác")} </h2>
          </div>
          <p className="text-xs text-gray"> {t("Giám sát 3 thông số: Nhiệt độ • Độ ẩm không khí • Độ ẩm đất")} </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {sortedZones.map((zone) => (
            <ZoneCard key={zone.code} zone={zone} />
          ))}
        </div>
      </div>

      {/* 4. Forecast and the reusable compact chat, keeping the insight card frame. */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-5">
        {hasWeather && (
          <div className="lg:col-span-7">
            <ForecastPanel weather={data.weather} />
          </div>
        )}
        <div className={hasWeather ? 'lg:col-span-5' : 'lg:col-span-12'}>
          <InsightCard />
        </div>
      </div>
    </div>
  );
}
