import { useLanguage } from '../i18n/useLanguage';
import { getLocale, t } from '../i18n';
import { useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import useZoneDetail from '../hooks/useZoneDetail';
import useGrowthStage from '../hooks/useGrowthStage';
import { useOverviewContext } from '../context/OverviewContext';
import type { ReadingPeriod } from '../types/zoneDetail';
import type { MetricData } from '../types/overview';
import { getReadingRange } from '../utils/readingRange';
import {
  formatObservedCadence,
  formatProvenanceLabel,
  formatTargetHint,
  formatMetricValue,
  formatTimeHHmm,
  formatNoSignalHint,
} from '../utils/metricLabels';
import SensorChart from '../components/SensorChart';
import CareLogTimeline from '../components/CareLogTimeline';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import GrowthStageControl from '../components/GrowthStageControl';
import SoilProfileCard from '../components/SoilProfileCard';

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
  const metrics = overviewZone?.growthStage === data.zone?.growthStage ? overviewZone?.metrics : undefined;
  const cadenceLabel = formatObservedCadence(overviewZone?.observedCadenceSeconds);

  const selectPeriod = (selected: ReadingPeriod) => {
    const range = getReadingRange(selected);
    setPeriod(selected);
    setFrom(range.from);
    setTo(range.to);
  };

  const formatDateRange = (dFrom: string, dTo: string) => {
    const f1 = new Date(dFrom).toLocaleString(getLocale(), {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const f2 = new Date(dTo).toLocaleString(getLocale(), {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${f1} – ${f2} · UTC+7`;
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={retry} />;
  if (!data.zone) return <ErrorState message={t('Không tìm thấy vùng canh tác')} onRetry={retry} />;
  const { zone } = data;

  // Check common provenance across available active metrics
  const activeMetrics = [metrics?.soilMoisture, metrics?.temperature, metrics?.humidity].filter(Boolean);
  const activeSources = activeMetrics.map(m => m?.source).filter(Boolean);
  const allSameSource =
    activeSources.length > 0 &&
    activeMetrics.length === activeSources.length &&
    activeSources.every(s => s === activeSources[0]);
  const commonSourceLabel = allSameSource
    ? formatProvenanceLabel(activeSources[0])
    : activeSources.length > 0
      ? t('Nguồn hỗn hợp')
      : null;

  // Helper for per-tile footer (provenance + timestamp or no signal hint)
  const getTileFooter = (m?: MetricData | null) => {
    const prov = formatProvenanceLabel(m?.source);
    if (m?.status === 'NO_SIGNAL') {
      return `${prov} · ${formatNoSignalHint(m?.recordedAt ?? null)}`;
    }
    const time = formatTimeHHmm(m?.recordedAt);
    return time ? `${prov} · ${time}` : prov;
  };

  const isSoilAbnormal = metrics?.soilMoisture?.status === 'HIGH' || metrics?.soilMoisture?.status === 'LOW';

  return (
    <div className="bg-[#f8f9ff] dark:bg-bg -m-4 sm:-m-6 p-4 sm:p-6 min-h-full">
      <div className="space-y-6 max-w-[1248px] mx-auto w-full">
        {saved && (
          <p role="status" className="rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-3 text-sm text-emerald-800 dark:text-emerald-300 font-medium">
            {t(saved === 'created'
              ? 'Đã tạo khu vực. Cây đại diện và 3 cảm biến đã được khởi tạo.'
              : 'Đã lưu thay đổi khu vực.')}
          </p>
        )}

        {/* 1. BREADCRUMB & HEADER OF ZONE DETAIL */}
        <div className="space-y-3">
          {/* Breadcrumb back link */}
          <div>
            <Link
              id="breadcrumb-back-overview"
              to={farmId ? `/?farmId=${encodeURIComponent(farmId)}` : '/'}
              className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#0072a8] dark:text-[#60A5FA] hover:underline min-h-11"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>{t('Quay lại tổng quan')}</span>
            </Link>
          </div>

          {/* Title Row with Metas and Right Action CTA */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[24px] font-bold text-text tracking-tight">{zone.name}</h1>
              <span className="px-2 py-0.5 bg-[#f1f5f9] dark:bg-surface text-[#475569] dark:text-gray font-mono text-[13px] font-semibold rounded border border-[#e2e8f0] dark:border-border">
                {zone.code}
              </span>

              {cadenceLabel && (
                <span
                  title={t('Tần suất nhận dữ liệu quan sát được, không phải chu kỳ đo cố định của cảm biến')}
                  className="rounded-lg border border-border bg-surface px-2 py-1 text-[11px] font-medium text-gray inline-flex items-center gap-1"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[13px]">schedule</span>
                  <span>{cadenceLabel}</span>
                </span>
              )}

              {/* Growth stage control badge with accessible change stage modal */}
              <GrowthStageControl
                stage={zone.growthStage}
                treeId={zone.representativeTreeId}
                isSaving={growthStage.isSaving}
                error={growthStage.error}
                saved={growthStage.saved}
                onSave={growthStage.save}
                onOpen={growthStage.clearFeedback}
              />

              {/* Alerts badge */}
              {data.alertCount > 0 && (
                <Link
                  to={`/alerts?zoneCode=${encodeURIComponent(zone.code)}${farmId ? `&farmId=${encodeURIComponent(farmId)}` : ''}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#fef3c7] dark:bg-amber-950/40 text-[#b45309] dark:text-amber-400 text-[13px] font-semibold border border-[#fde68a] dark:border-amber-800/40 hover:opacity-90 transition-opacity"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px]">warning</span>
                  <span>{t('{0} cảnh báo', [data.alertCount])}</span>
                </Link>
              )}
            </div>

            {/* Right Action CTA Button: "Hỏi trợ lý về khu vực này" (Full-width on mobile) */}
            <div className="w-full sm:w-auto">
              <Link
                id="btn-agent-zone"
                to={`/agent?zoneCode=${encodeURIComponent(zone.code)}${farmId ? `&farmId=${encodeURIComponent(farmId)}` : ''}`}
                className="w-full sm:w-auto h-[44px] px-4 rounded-lg bg-[#0072a8] hover:bg-[#005f8c] text-white text-[14px] font-medium flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[20px]">smart_toy</span>
                <span>{t('Hỏi trợ lý về khu vực này')}</span>
              </Link>
            </div>
          </div>
        </div>

        {/* 2. SỐ ĐO HIỆN TẠI (CURRENT MEASUREMENTS SUMMARY - 3 COLUMNS) */}
        <section className="bg-surface rounded-xl border border-border p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between pb-3 border-b border-border/80 gap-2">
            <h2 className="text-[15px] font-bold text-text tracking-tight">{t('Số đo hiện tại')}</h2>
            {commonSourceLabel && (
              <div className="flex items-center gap-3 text-[12px] text-gray">
                <span>
                  {t('Nguồn:')} <strong className="font-medium text-text">{commonSourceLabel}</strong>
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {/* Col 1: Nhiệt độ không khí */}
            <div className="p-2.5 sm:p-4 rounded-lg bg-[#f8fafc] dark:bg-bg/60 border border-[#f1f5f9] dark:border-border/60 flex flex-col justify-between">
              <div>
                <div className="text-[11px] sm:text-[13px] text-gray font-medium mb-1 truncate">{t('Nhiệt độ không khí')}</div>
                <div className="text-[18px] sm:text-[28px] font-bold text-text tracking-tight tabular-nums">
                  {formatMetricValue(metrics?.temperature?.value ?? null, '°C', metrics?.temperature?.status || 'NORMAL')}
                </div>
              </div>
              <div>
                <div className="text-[10px] sm:text-[12px] text-gray mt-1 truncate">
                  {formatTargetHint(metrics?.temperature?.targetMin ?? null, metrics?.temperature?.targetMax ?? null, '°C') || t('Chưa cấu hình khoảng mục tiêu')}
                </div>
                <div className="text-[9px] sm:text-[11px] text-gray mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t border-border/60 truncate" title={getTileFooter(metrics?.temperature)}>
                  {getTileFooter(metrics?.temperature)}
                </div>
              </div>
            </div>

            {/* Col 2: Độ ẩm không khí */}
            <div className="p-2.5 sm:p-4 rounded-lg bg-[#f8fafc] dark:bg-bg/60 border border-[#f1f5f9] dark:border-border/60 flex flex-col justify-between">
              <div>
                <div className="text-[11px] sm:text-[13px] text-gray font-medium mb-1 truncate">{t('Độ ẩm không khí')}</div>
                <div className="text-[18px] sm:text-[28px] font-bold text-text tracking-tight tabular-nums">
                  {formatMetricValue(metrics?.humidity?.value ?? null, '%', metrics?.humidity?.status || 'NORMAL')}
                </div>
              </div>
              <div>
                <div className="text-[10px] sm:text-[12px] text-gray mt-1 truncate">
                  {formatTargetHint(metrics?.humidity?.targetMin ?? null, metrics?.humidity?.targetMax ?? null, '%') || t('Chưa cấu hình khoảng mục tiêu')}
                </div>
                <div className="text-[9px] sm:text-[11px] text-gray mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t border-border/60 truncate" title={getTileFooter(metrics?.humidity)}>
                  {getTileFooter(metrics?.humidity)}
                </div>
              </div>
            </div>

            {/* Col 3: Độ ẩm đất (with Warning or Normal styling) */}
            <div
              className={`p-2.5 sm:p-4 rounded-lg flex flex-col justify-between ${
                isSoilAbnormal
                  ? 'bg-[#fffbeb] dark:bg-amber-950/20 border border-[#fde68a] dark:border-amber-800/40'
                  : 'bg-[#f8fafc] dark:bg-bg/60 border border-[#f1f5f9] dark:border-border/60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className={`text-[11px] sm:text-[13px] font-medium truncate ${isSoilAbnormal ? 'text-[#92400e] dark:text-amber-300' : 'text-gray'}`}>
                    {t('Độ ẩm đất')}
                  </span>
                  {isSoilAbnormal && (
                    <span className="text-[9px] sm:text-[11px] font-semibold px-1.5 sm:px-2 py-0.5 rounded bg-[#fef3c7] dark:bg-amber-900/40 text-[#b45309] dark:text-amber-400 border border-[#fcd34d] dark:border-amber-800/60 shrink-0">
                      {metrics?.soilMoisture?.status === 'HIGH' ? t('Cao hơn ngưỡng') : t('Thấp hơn ngưỡng')}
                    </span>
                  )}
                </div>
                <div className={`text-[18px] sm:text-[28px] font-bold tracking-tight tabular-nums ${isSoilAbnormal ? 'text-[#b45309] dark:text-amber-400' : 'text-text'}`}>
                  {formatMetricValue(metrics?.soilMoisture?.value ?? null, '%', metrics?.soilMoisture?.status || 'NORMAL')}
                </div>
              </div>
              <div>
                <div className={`text-[10px] sm:text-[12px] mt-1 truncate ${isSoilAbnormal ? 'text-[#92400e] dark:text-amber-300' : 'text-gray'}`}>
                  {metrics?.soilMoisture?.targetMin != null && metrics?.soilMoisture?.targetMax != null
                    ? <>{t('Mục tiêu:')} <strong className="font-semibold">{metrics.soilMoisture.targetMin}–{metrics.soilMoisture.targetMax}%</strong></>
                    : t('Chưa cấu hình khoảng mục tiêu')}
                </div>
                <div className="text-[9px] sm:text-[11px] text-gray mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t border-border/60 truncate" title={getTileFooter(metrics?.soilMoisture)}>
                  {getTileFooter(metrics?.soilMoisture)}
                </div>
              </div>
            </div>
          </div>
        </section>

      {/* 3. SOIL RAW CHEMISTRY COMPACT PANEL (S1 Trắc diện hóa tính đất) */}
      <SoilProfileCard
        profile={overviewZone?.soilProfile}
        observedCadenceSeconds={overviewZone?.observedCadenceSeconds}
        zoneCode={zone.code}
        loading={overview.loading && !overview.data}
        error={overview.error && !overview.data ? overview.error : null}
        onRetry={() => void overview.refresh()}
      />

      {/* 4. SENSOR TABS & TIMELINE BAR */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-1">
          {/* 2 Tabs */}
          <div role="tablist" aria-label={t('Chi tiết khu vực')} className="flex items-center gap-6">
            <button
              id="tab-charts"
              role="tab"
              aria-selected={activeTab === 'CHARTS'}
              aria-controls="zone-tab-panel"
              type="button"
              onClick={() => setActiveTab('CHARTS')}
              className={`pb-2.5 text-[15px] inline-flex items-center gap-2 cursor-pointer border-b-2 transition-colors ${
                activeTab === 'CHARTS'
                  ? 'font-bold text-[#1F5CA9] dark:text-[#60A5FA] border-[#1F5CA9] dark:border-[#60A5FA]'
                  : 'font-medium text-gray hover:text-text border-transparent'
              }`}
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">show_chart</span>
              <span>{t('Biểu đồ cảm biến')}</span>
            </button>

            <button
              id="tab-care-logs"
              role="tab"
              aria-selected={activeTab === 'CARE_LOGS'}
              aria-controls="zone-tab-panel"
              type="button"
              onClick={() => setActiveTab('CARE_LOGS')}
              className={`pb-2.5 text-[15px] inline-flex items-center gap-2 cursor-pointer border-b-2 transition-colors ${
                activeTab === 'CARE_LOGS'
                  ? 'font-bold text-[#1F5CA9] dark:text-[#60A5FA] border-[#1F5CA9] dark:border-[#60A5FA]'
                  : 'font-medium text-gray hover:text-text border-transparent'
              }`}
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">edit_note</span>
              <span>{t('Nhật ký chăm sóc')}</span>
            </button>
          </div>

          {/* Date Chips & Text window when in CHARTS tab */}
          {activeTab === 'CHARTS' && (
            <div className="flex flex-wrap items-center gap-3">
              <div aria-label={t('Khoảng thời gian')} className="inline-flex rounded-lg border border-border bg-surface p-0.5 text-[13px] shadow-2xs">
                {PERIODS.map((option) => (
                  <button
                    key={option.value}
                    aria-pressed={period === option.value}
                    type="button"
                    onClick={() => selectPeriod(option.value)}
                    className={`px-3 py-1 font-medium transition-colors cursor-pointer rounded-md ${
                      period === option.value
                        ? 'font-semibold bg-[#1F5CA9] text-white shadow-xs'
                        : 'text-gray hover:text-text'
                    }`}
                  >
                    {t(option.label)}
                  </button>
                ))}
              </div>

              <div className="text-[12px] font-medium text-gray bg-surface px-2.5 py-1.5 rounded-lg border border-border shadow-2xs">
                {formatDateRange(from, to)}
              </div>
            </div>
          )}
        </div>

        {/* Tab Panel Content */}
        <section id="zone-tab-panel" role="tabpanel" aria-labelledby={activeTab === 'CHARTS' ? 'tab-charts' : 'tab-care-logs'}>
          {activeTab === 'CHARTS' ? (
            <div className="space-y-4">
              {/* CHART 1: SOIL MOISTURE (Full-width for focus) */}
              <SensorChart
                title={t('Độ ẩm đất')}
                unit="%"
                color="#b45309"
                chart={data.soilMoisture}
                metric={metrics?.soilMoisture}
                onRetry={retry}
                isMain={true}
              />

              {/* CHARTS 2 & 3: TEMPERATURE & AIR HUMIDITY SIDE BY SIDE */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SensorChart
                  title={t('Nhiệt độ không khí')}
                  unit="°C"
                  color="#1F5CA9"
                  chart={data.temperature}
                  metric={metrics?.temperature}
                  onRetry={retry}
                  isMain={false}
                />
                <SensorChart
                  title={t('Độ ẩm không khí')}
                  unit="%"
                  color="#0072A8"
                  chart={data.humidity}
                  metric={metrics?.humidity}
                  onRetry={retry}
                  isMain={false}
                />
              </div>
            </div>
          ) : (
            <CareLogTimeline zoneCode={zoneCode} zoneId={zone.id} zoneName={zone.name ?? undefined} />
          )}
        </section>
      </div>
    </div>
  </div>
);
}
