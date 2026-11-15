import { useLanguage } from '../i18n/useLanguage';
import { t } from '../i18n';
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useOverviewContext } from '../context/OverviewContext';
import { useAuth } from '../hooks/useAuth';
import DashboardStatusStrip from '../components/DashboardStatusStrip';
import ZoneCard from '../components/ZoneCard';
import WeatherCard from '../components/WeatherCard';
import InsightCard from '../components/InsightCard';
import OverviewSkeleton from '../components/OverviewSkeleton';
import ErrorState from '../components/ErrorState';
import { formatTimeHHmm } from '../utils/metricLabels';
import type { ZoneOverview } from '../types/overview';

function isProblemZone(zone: ZoneOverview): boolean {
  const hasAlerts = zone.alerts.hard + zone.alerts.agentic > 0;
  const hasAbnormalMetric =
    zone.metrics.temperature.status !== 'NORMAL' ||
    zone.metrics.humidity.status !== 'NORMAL' ||
    zone.metrics.soilMoisture.status !== 'NORMAL';
  return hasAlerts || hasAbnormalMetric;
}

function isDisconnectedZone(zone: ZoneOverview): boolean {
  const { temperature, humidity, soilMoisture } = zone.metrics;
  return (
    (temperature.status === 'NO_SIGNAL' &&
      humidity.status === 'NO_SIGNAL' &&
      soilMoisture.status === 'NO_SIGNAL') ||
    (temperature.value == null && humidity.value == null && soilMoisture.value == null)
  );
}

export default function DashboardPage() {
  useLanguage();
  const { user } = useAuth();
  const {
    data,
    loading,
    refreshing,
    error,
    lastUpdated,
    refresh,
    noFarmsAvailable,
  } = useOverviewContext();

  const [isSpinning, setIsSpinning] = useState(false);

  const zones = data?.zones;
  // Sort zones: problem zones first
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

  const problemZonesCount = useMemo(() => {
    if (!zones) return 0;
    return zones.filter(isProblemZone).length;
  }, [zones]);

  const disconnectedCount = useMemo(() => {
    if (!zones) return 0;
    return zones.filter(isDisconnectedZone).length;
  }, [zones]);

  const handleRefreshClick = async () => {
    setIsSpinning(true);
    try {
      await refresh();
    } finally {
      setTimeout(() => setIsSpinning(false), 500);
    }
  };

  if (user?.role === 'ADMIN' && noFarmsAvailable) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] p-6">
        <div className="max-w-md w-full text-center bg-surface border border-border rounded-2xl p-8 shadow-sm">
          <div className="text-5xl mb-3" role="img" aria-label={t('Nông trại')}>
            🏡
          </div>
          <h2 className="text-lg font-bold text-text mb-2">{t('Chưa có nông trại nào')}</h2>
          <p className="text-sm text-gray leading-relaxed mb-4">
            {t('Hệ thống chưa có nông trại nào. Hãy tạo nông trại đầu tiên để bắt đầu theo dõi.')}
          </p>
          <Link
            to="/settings/farm"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal text-white text-xs font-semibold hover:bg-teal/90 transition-all cursor-pointer shadow-2xs"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            {t('Tạo nông trại')}
          </Link>
        </div>
      </div>
    );
  }

  if (loading && !data) {
    return <OverviewSkeleton />;
  }

  if (error && !data) {
    return <ErrorState message={error} onRetry={refresh} />;
  }

  if (!data || data.zones.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] p-6">
        <div className="max-w-md w-full text-center bg-surface border border-border rounded-2xl p-8 shadow-sm">
          <div className="text-5xl mb-3" role="img" aria-label={t('Cây con')}>
            🌱
          </div>
          <h2 className="text-lg font-bold text-text mb-2">{t('Chưa có vùng canh tác')}</h2>
          <p className="text-sm text-gray leading-relaxed mb-4">
            {t(
              'Hệ thống chưa ghi nhận vùng canh tác nào trong cơ sở dữ liệu. Vui lòng thêm vùng và thiết bị cảm biến để bắt đầu theo dõi.'
            )}
          </p>
          <button
            type="button"
            onClick={() => refresh()}
            className="px-4 py-2 rounded-xl bg-teal text-white text-xs font-semibold hover:bg-teal/90 transition-all cursor-pointer shadow-2xs"
          >
            {t('Kiểm tra lại')}
          </button>
        </div>
      </div>
    );
  }

  const timeDisplay = lastUpdated ? formatTimeHHmm(lastUpdated) : '--:--';
  const openAlertsCount = data.totalUnresolvedAlerts;
  const hasWeather = Boolean(data.weather);

  return (
    <div className="space-y-6">
      {/* ─── Page Header ─── */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-text">
          {t('Tổng quan')}
        </h1>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray">
            {t('Cập nhật lúc')} {timeDisplay}
          </span>
          <button
            type="button"
            onClick={handleRefreshClick}
            disabled={refreshing || isSpinning}
            aria-label={t('Làm mới')}
            className="w-9 h-9 rounded-lg flex items-center justify-center bg-surface border border-border hover:bg-bg text-gray hover:text-text transition-colors shadow-2xs cursor-pointer"
          >
            <span
              className={`material-symbols-outlined text-[18px] ${
                refreshing || isSpinning ? 'animate-spin text-teal' : ''
              }`}
            >
              refresh
            </span>
          </button>
        </div>
      </section>

      {/* ─── Status Strip ─── */}
      <DashboardStatusStrip
        totalZonesCount={zones?.length}
        problemZonesCount={problemZonesCount}
        disconnectedCount={disconnectedCount}
        openAlertsCount={openAlertsCount}
      />

      {/* ─── Main Two-Column Layout ─── */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        {/* Left Column: Zone Cards Grid (flex-1) */}
        <div className="flex-1 w-full space-y-4">
          <h2 className="text-lg font-semibold text-text">{t('Khu vực theo dõi')}</h2>
          <div className="grid grid-cols-1 gap-4">
            {sortedZones.map((zone) => (
              <ZoneCard key={zone.code} zone={zone} />
            ))}
          </div>
        </div>

        {/* Right Rail Column: Weather & AI Assistant (Exactly 340px Sticky) */}
        <aside
          data-testid="dashboard-right-rail"
          className="w-full lg:w-[340px] shrink-0 space-y-5 lg:sticky lg:top-24"
        >
          {/* 1. Weather Widget */}
          {hasWeather && <WeatherCard weather={data.weather} />}

          {/* 2. AI Assistant Widget */}
          <InsightCard insight={data.latestInsight} />
        </aside>
      </div>

      {/* ─── Minimalist Centered Footer ─── */}
      <footer className="pt-8 pb-4 text-center">
        <span className="text-xs text-gray font-medium">
          © DuriCare · {t('Nông nghiệp chính xác thông minh')}
        </span>
      </footer>
    </div>
  );
}
