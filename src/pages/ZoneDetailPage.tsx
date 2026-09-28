import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import useZoneDetail from '../hooks/useZoneDetail';
import { GROWTH_STAGE_LABELS } from '../types/zone';
import SensorChart from '../components/SensorChart';
import CareLogTimeline from '../components/CareLogTimeline';
import AlertBadge from '../components/AlertBadge';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';

export default function ZoneDetailPage() {
  const { zoneCode } = useParams<{ zoneCode: string }>();

  if (!zoneCode) {
    return <ErrorState message="Thiếu mã vùng canh tác trong URL" onRetry={() => window.location.reload()} />;
  }

  return <ZoneDetailContent zoneCode={zoneCode} />;
}

function ZoneDetailContent({ zoneCode }: { zoneCode: string }) {
  const { data, loading, error, from, to, setFrom, setTo, retry } = useZoneDetail(zoneCode);
  const [activeTab, setActiveTab] = useState<'CHARTS' | 'CARE_LOGS'>('CHARTS');

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={retry} />;
  if (!data.zone) return <ErrorState message="Không tìm thấy vùng canh tác" onRetry={retry} />;

  const { zone } = data;
  const stageLabel = GROWTH_STAGE_LABELS[zone.growthStage] ?? zone.growthStage;

  return (
    <div>
      {/* Back link + header */}
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray hover:text-navy transition-colors mb-3"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Về Dashboard
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-text">{zone.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className="text-sm text-gray">Mã: {zone.code}</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full
                               bg-teal/10 text-teal text-xs font-medium">
                🌱 {stageLabel}
              </span>
              <AlertBadge count={data.alertCount} dominantSource={data.dominantAlertSource} />
            </div>
          </div>

          {/* Current values summary */}
          <div className="flex items-center gap-3 text-sm">
            {data.latestTemp !== null && (
              <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface border border-border">
                🌡️ <span className="font-semibold text-text">{data.latestTemp.toFixed(1)}°C</span>
              </span>
            )}
            {data.latestHumidity !== null && (
              <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface border border-border">
                💧 <span className="font-semibold text-text">{data.latestHumidity.toFixed(1)}%</span>
              </span>
            )}
            {data.latestSoilMoisture !== null && (
              <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface border border-border">
                🌿 <span className="font-semibold text-text">{data.latestSoilMoisture.toFixed(1)}%</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-2 mb-6 border-b border-border">
        <button
          id="tab-charts"
          onClick={() => setActiveTab('CHARTS')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'CHARTS'
              ? 'border-navy text-navy'
              : 'border-transparent text-gray hover:text-text'
          }`}
        >
          <span>📊</span> Biểu đồ cảm biến
        </button>
        <button
          id="tab-care-logs"
          onClick={() => setActiveTab('CARE_LOGS')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'CARE_LOGS'
              ? 'border-navy text-navy'
              : 'border-transparent text-gray hover:text-text'
          }`}
        >
          <span>📝</span> Nhật ký chăm sóc
        </button>
      </div>

      {/* Tab 1: Sensor Charts */}
      {activeTab === 'CHARTS' && (
        <div className="space-y-6">
          {/* Date range picker */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3
                           p-4 bg-surface border border-border rounded-xl">
            <span className="text-sm font-medium text-text">Khoảng thời gian:</span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                max={to}
                className="px-3 py-1.5 text-sm rounded-lg border border-border bg-bg text-text
                           focus:outline-none focus:ring-2 focus:ring-navy/30"
              />
              <span className="text-gray text-sm">→</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                min={from}
                className="px-3 py-1.5 text-sm rounded-lg border border-border bg-bg text-text
                           focus:outline-none focus:ring-2 focus:ring-navy/30"
              />
            </div>
          </div>

          {/* Charts grid */}
          <div className="grid grid-cols-1 gap-4">
            <SensorChart
              title="Nhiệt độ"
              icon="🌡️"
              unit="°C"
              color="var(--color-coral)"
              chart={data.temperature}
            />
            <SensorChart
              title="Độ ẩm"
              icon="💧"
              unit="%"
              color="var(--color-blue)"
              chart={data.humidity}
            />
            <SensorChart
              title="Độ ẩm đất"
              icon="🌿"
              unit="%"
              color="var(--color-teal)"
              chart={data.soilMoisture}
            />
          </div>
        </div>
      )}

      {/* Tab 2: Care Logs Timeline */}
      {activeTab === 'CARE_LOGS' && <CareLogTimeline zoneCode={zoneCode} />}
    </div>
  );
}
