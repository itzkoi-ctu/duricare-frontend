import { useLanguage } from '../i18n/useLanguage';
import { getLocale, t } from '../i18n';
import { useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import useZoneDetail from '../hooks/useZoneDetail';
import useGrowthStage from '../hooks/useGrowthStage';
import { useOverviewContext } from '../context/OverviewContext';
import type { ReadingPeriod } from '../types/zoneDetail';
import { getReadingRange } from '../utils/readingRange';
import SensorChart from '../components/SensorChart';
import MetricChip from '../components/MetricChip';
import CareLogTimeline from '../components/CareLogTimeline';
import AlertBadge from '../components/AlertBadge';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import GrowthStageControl from '../components/GrowthStageControl';

const PERIODS: { value: ReadingPeriod; label: string }[] = [
  { value: 'TODAY', label: 'Hôm nay' },
  { value: 'LAST_24_HOURS', label: '24 giờ qua' },
  { value: 'LAST_7_DAYS', label: '7 ngày qua' },
];

export default function ZoneDetailPage() {
  useLanguage();
  const { zoneCode } = useParams<{ zoneCode: string }>();
  if (!zoneCode) return <ErrorState message={t('Thiếu mã vùng canh tác trong URL')} onRetry={() => window.location.reload()} />;
  return <ZoneDetailContent key={zoneCode} zoneCode={zoneCode} />;
}

function ZoneDetailContent({ zoneCode }: { zoneCode: string }) {
  useLanguage();
  const { data, loading, error, from, to, setFrom, setTo, retry, applyGrowthStage } = useZoneDetail(zoneCode);
  const overview = useOverviewContext();
  const growthStage = useGrowthStage(data.zone, async stage => {
    applyGrowthStage(stage);
    await overview.refresh();
    retry();
  });
  const location = useLocation();
  const farmId = new URLSearchParams(location.search).get('farmId');
  const saved = (location.state as { zoneSaved?: string } | null)?.zoneSaved;
  const [activeTab, setActiveTab] = useState<'CHARTS' | 'CARE_LOGS'>('CHARTS');
  const [period, setPeriod] = useState<ReadingPeriod>('LAST_24_HOURS');
  const overviewZone = overview.data?.zones.find(zone => zone.code === zoneCode);
  // Never show thresholds for the previous stage if the overview refresh fails or is still pending.
  const metrics = overviewZone?.growthStage === data.zone?.growthStage ? overviewZone?.metrics : undefined;
  const selectPeriod = (selected: ReadingPeriod) => {
    const range = getReadingRange(selected);
    setPeriod(selected);
    setFrom(range.from);
    setTo(range.to);
  };
  const formatDate = (date: string) => new Date(date).toLocaleString(getLocale(), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={retry} />;
  if (!data.zone) return <ErrorState message={t('Không tìm thấy vùng canh tác')} onRetry={retry} />;
  const { zone } = data;

  return <div className="space-y-5">
    {saved && <p role="status" className="rounded-xl border border-teal/30 bg-teal/10 p-3 text-sm text-text">{t(saved === 'created'
      ? 'Đã tạo khu vực. Cây đại diện và 3 cảm biến đã được khởi tạo.' : 'Đã lưu thay đổi khu vực.')}</p>}
    <header className="rounded-2xl border border-border bg-surface p-4 md:p-6 shadow-sm">
      <Link to={farmId ? `/?farmId=${encodeURIComponent(farmId)}` : '/'} className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-navy dark:text-blue">
        <span aria-hidden="true" className="material-symbols-outlined text-lg">arrow_back</span>{t('Quay lại tổng quan')}
      </Link>
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-text">{zone.name}</h1>
          <span className="rounded-lg border border-border bg-bg px-2 py-1 text-[11px] font-semibold text-gray">{zone.code}</span>
        </div><GrowthStageControl stage={zone.growthStage} treeId={zone.representativeTreeId} isSaving={growthStage.isSaving}
          error={growthStage.error} saved={growthStage.saved} onSave={growthStage.save} onOpen={growthStage.clearFeedback} />
        <div className="mt-3"><AlertBadge count={data.alertCount} dominantSource={data.dominantAlertSource} /></div></div>
        {metrics ? <div aria-label={t('Thông số hiện tại')} className="grid grid-cols-3 gap-2 xl:min-w-[480px]">
          <MetricChip metricKey="temperature" metric={metrics.temperature} variant="detail" />
          <MetricChip metricKey="humidity" metric={metrics.humidity} variant="detail" />
          <MetricChip metricKey="soilMoisture" metric={metrics.soilMoisture} variant="detail" />
        </div> : overview.loading || overview.refreshing ? <p role="status" className="text-sm text-gray">{t('Đang tải thông số hiện tại...')}</p>
          : <div role="alert" className="text-xs text-coral"><p>{t('Không thể tải thông số và khoảng mục tiêu.')}</p>
            <button onClick={() => void overview.refresh()} className="mt-2 min-h-11 rounded-lg border border-border px-3 cursor-pointer">{t('Thử lại')}</button></div>}
      </div>
    </header>
    <div className="rounded-xl border border-border bg-surface px-3 md:px-5 shadow-sm">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
        <div role="tablist" aria-label={t('Chi tiết khu vực')} className="grid grid-cols-2 gap-2">
          {(['CHARTS', 'CARE_LOGS'] as const).map(tab => <button key={tab} id={tab === 'CHARTS' ? 'tab-charts' : 'tab-care-logs'}
            role="tab" aria-selected={activeTab === tab} aria-controls="zone-tab-content" onClick={() => setActiveTab(tab)}
            className={`flex min-h-14 items-center justify-center gap-1.5 border-b-2 py-3 text-xs md:text-sm font-semibold cursor-pointer ${activeTab === tab ? 'border-navy text-navy dark:text-blue' : 'border-transparent text-gray'}`}>
            <span aria-hidden="true" className="material-symbols-outlined text-lg">{tab === 'CHARTS' ? 'analytics' : 'edit_note'}</span>{t(tab === 'CHARTS' ? 'Biểu đồ cảm biến' : 'Nhật ký chăm sóc')}
          </button>)}
        </div>
        {activeTab === 'CHARTS' && <div aria-label={t('Khoảng thời gian')} className="mb-3 xl:mb-0 grid grid-cols-3 gap-1 rounded-xl bg-bg p-1">
          {PERIODS.map(option => <button key={option.value} aria-pressed={period === option.value} onClick={() => selectPeriod(option.value)}
            className={`min-h-11 whitespace-nowrap rounded-lg px-2 md:px-4 text-xs font-semibold cursor-pointer ${period === option.value ? 'bg-navy text-surface dark:text-bg shadow-sm' : 'text-gray hover:text-text'}`}>{t(option.label)}</button>)}
        </div>}
      </div>
    </div>
    <section id="zone-tab-content" role="tabpanel" aria-labelledby={activeTab === 'CHARTS' ? 'tab-charts' : 'tab-care-logs'}>
      {activeTab === 'CHARTS' ? <div className="space-y-4 md:space-y-5">
        <p data-reading-from={from} data-reading-to={to} className="text-xs text-gray">{t('Dữ liệu từ {0} đến {1}', [formatDate(from), formatDate(to)])}</p>
        <SensorChart title={t('Nhiệt độ không khí')} icon="device_thermostat" unit="°C" color="var(--color-blue)" chart={data.temperature} metric={metrics?.temperature} onRetry={retry} />
        <SensorChart title={t('Độ ẩm không khí')} icon="water_drop" unit="%" color="var(--color-amber)" chart={data.humidity} metric={metrics?.humidity} onRetry={retry} />
        <SensorChart title={t('Độ ẩm đất')} icon="water_drop" unit="%" color="var(--color-coral)" chart={data.soilMoisture} metric={metrics?.soilMoisture} onRetry={retry} />
      </div> : <CareLogTimeline zoneCode={zoneCode} zoneId={zone.id} />}
    </section>
  </div>;
}
