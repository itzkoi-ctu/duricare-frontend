import { Link } from 'react-router-dom';
import { useLanguage } from '../../i18n/useLanguage';
import { t, getLocale } from '../../i18n';
import { useOverviewContext } from '../../context/OverviewContext';
import { GROWTH_STAGE_LABELS, type GrowthStage } from '../../types/zone';
import { formatMetricValue } from '../../utils/metricLabels';

export interface AgentIoTContextRailProps {
  zoneCode?: string;
  onSelectZone?: (code: string) => void;
  onClose?: () => void;
  isDrawer?: boolean;
}

function formatShortProvenance(source?: string | null): string {
  if (!source) return t('Chưa xác định nguồn');
  const upper = source.trim().toUpperCase();
  if (upper === 'IOTLAB' || upper === 'IOT_LAB') return 'IoTLab';
  if (upper === 'MQTT') return 'MQTT';
  return source;
}

function formatObservationTime(raw?: string | null): string | null {
  if (!raw) return null;
  try {
    return new Date(raw).toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit' });
  } catch {
    return null;
  }
}

export default function AgentIoTContextRail({
  zoneCode,
  onSelectZone,
  onClose,
  isDrawer = false,
}: AgentIoTContextRailProps) {
  useLanguage();
  const { data } = useOverviewContext();

  const zones = data?.zones ?? [];
  const activeZone = (zoneCode ? zones.find(z => z.code === zoneCode) : null) ?? zones[0];
  const weather = data?.weather;

  const tempVal = activeZone?.metrics?.temperature?.value ?? null;
  const humVal = activeZone?.metrics?.humidity?.value ?? null;
  const soilVal = activeZone?.metrics?.soilMoisture?.value ?? null;

  const tempTarget = activeZone?.metrics?.temperature;
  const humTarget = activeZone?.metrics?.humidity;
  const soilTarget = activeZone?.metrics?.soilMoisture;

  const isOffline =
    activeZone?.metrics?.soilMoisture?.status === 'NO_SIGNAL' ||
    (tempVal === null && humVal === null && soilVal === null);

  const stageLabel =
    activeZone?.growthStage && activeZone.growthStage in GROWTH_STAGE_LABELS
      ? t(GROWTH_STAGE_LABELS[activeZone.growthStage as GrowthStage])
      : activeZone?.growthStage || t('Chưa cập nhật');

  const weatherTime = weather?.fetchedAt ? formatObservationTime(weather.fetchedAt) : null;

  const activeMetrics = [soilTarget, tempTarget, humTarget].filter(Boolean);
  const activeSources = activeMetrics.map(m => m?.source).filter(Boolean);
  const allSameSource =
    activeSources.length > 0 &&
    activeMetrics.length === activeSources.length &&
    activeSources.every(s => s === activeSources[0]);

  const latestRecordedAt = activeMetrics
    .map(m => m?.recordedAt)
    .filter(Boolean)
    .sort()
    .reverse()[0];
  const latestTimeFormatted = formatObservationTime(latestRecordedAt);

  let section1Badge: string | null = null;
  if (allSameSource && activeSources.length > 0) {
    const srcLabel = formatShortProvenance(activeSources[0]);
    section1Badge = latestTimeFormatted ? `${srcLabel} · ${latestTimeFormatted}` : srcLabel;
  } else if (activeSources.length > 0) {
    section1Badge = latestTimeFormatted
      ? `${t('Nguồn hỗn hợp')} · ${latestTimeFormatted}`
      : t('Nguồn hỗn hợp');
  } else if (latestTimeFormatted) {
    section1Badge = latestTimeFormatted;
  }

  return (
    <aside
      aria-label={t('Ngữ cảnh trạm đo')}
      data-testid="agent-iot-context-rail"
      className={`w-full h-full flex flex-col gap-3.5 p-4 bg-[#f8f9ff] dark:bg-bg overflow-y-auto select-none border-l border-[#e2e8f0] dark:border-border ${
        isDrawer ? 'max-w-full' : ''
      }`}
    >
      {/* ─── Rail Header ─── */}
      <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0] dark:border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-outlined text-[20px] text-[#0072a8] dark:text-sky-400 shrink-0">
            sensors
          </span>
          <h2 className="font-semibold text-sm text-[#0f172a] dark:text-text truncate">
            {t('Ngữ cảnh khu vực')}
          </h2>
          <span className="sr-only">{t('Ngữ cảnh trạm đo')}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isOffline && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
              {t('Mất tín hiệu')}
            </span>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label={t('Đóng')}
              title={t('Đóng')}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── Zone Selector Dropdown ─── */}
      {zones.length > 1 && (
        <div className="space-y-1 shrink-0">
          <label htmlFor="agent-zone-select" className="sr-only">
            {t('Khu vực theo dõi')}
          </label>
          <div className="bg-white dark:bg-surface border border-[#cbd5e1] dark:border-border text-xs font-semibold text-[#0f172a] dark:text-text rounded-lg flex items-center justify-between shadow-2xs">
            <select
              id="agent-zone-select"
              value={activeZone?.code ?? ''}
              onChange={e => onSelectZone?.(e.target.value)}
              className="w-full bg-transparent px-3 py-2 text-xs font-semibold text-[#0f172a] dark:text-text focus:outline-none cursor-pointer"
            >
              {zones.map(z => (
                <option key={z.code} value={z.code} className="bg-white dark:bg-surface text-text">
                  {z.name ? `${z.name} (${z.code})` : z.code}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ─── Section 1: Số đo hiện tại (Chỉ số cảm biến tức thời) ─── */}
      <div className="bg-white dark:bg-surface border border-[#e2e8f0] dark:border-border rounded-xl p-3.5 space-y-3 shadow-2xs shrink-0">
        <div className="flex justify-between items-center pb-1 border-b border-[#f1f5f9] dark:border-border/40">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-[#0f172a] dark:text-text">{t('Số đo hiện tại')}</span>
            <span className="sr-only">{t('Chỉ số cảm biến tức thời')}</span>
          </div>
          {section1Badge && (
            <span
              data-testid="section1-provenance-badge"
              className="text-[11px] text-[#64748b] dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded font-medium"
            >
              {section1Badge}
            </span>
          )}
        </div>

        {/* Metrics List */}
        <div className="space-y-2.5 pt-1">
          {/* Soil Moisture */}
          <div className="p-2.5 rounded-lg bg-[#f8f9fa] dark:bg-slate-800/50 border border-[#e2e8f0] dark:border-border/60">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {t('Độ ẩm đất')}
            </div>
            <div className="text-lg font-bold text-[#0f172a] dark:text-text tabular-nums tracking-tight">
              {formatMetricValue(soilVal, '%', soilTarget?.status ?? 'NORMAL')}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {soilTarget?.targetMin != null && soilTarget?.targetMax != null
                ? t('Khoảng mục tiêu cấu hình: {0}–{1}%', [soilTarget.targetMin, soilTarget.targetMax])
                : t('Chưa thiết lập ngưỡng')}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
              <span data-testid="metric-provenance-soil">
                {formatShortProvenance(soilTarget?.source)}
              </span>
              <span data-testid="metric-timestamp-soil">
                {formatObservationTime(soilTarget?.recordedAt) ?? '--'}
              </span>
            </div>
          </div>

          {/* Air Temperature */}
          <div className="p-2.5 rounded-lg bg-[#f8f9fa] dark:bg-slate-800/50 border border-[#e2e8f0] dark:border-border/60 space-y-1">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {t('Nhiệt độ khí')}
                </div>
                <div className="text-[11px] text-slate-400 dark:text-slate-500">
                  {tempTarget?.targetMin != null && tempTarget?.targetMax != null
                    ? `${tempTarget.targetMin}–${tempTarget.targetMax}°C`
                    : t('Chưa thiết lập ngưỡng')}
                </div>
              </div>
              <div className="text-base font-semibold text-[#0f172a] dark:text-text tabular-nums">
                {formatMetricValue(tempVal, '°C', tempTarget?.status ?? 'NORMAL')}
              </div>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
              <span data-testid="metric-provenance-temperature">
                {formatShortProvenance(tempTarget?.source)}
              </span>
              <span data-testid="metric-timestamp-temperature">
                {formatObservationTime(tempTarget?.recordedAt) ?? '--'}
              </span>
            </div>
          </div>

          {/* Air Humidity */}
          <div className="p-2.5 rounded-lg bg-[#f8f9fa] dark:bg-slate-800/50 border border-[#e2e8f0] dark:border-border/60 space-y-1">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {t('Độ ẩm khí')}
                </div>
                <div className="text-[11px] text-slate-400 dark:text-slate-500">
                  {humTarget?.targetMin != null && humTarget?.targetMax != null
                    ? `${humTarget.targetMin}–${humTarget.targetMax}%`
                    : t('Chưa thiết lập ngưỡng')}
                </div>
              </div>
              <div className="text-base font-semibold text-[#0f172a] dark:text-text tabular-nums">
                {formatMetricValue(humVal, '%', humTarget?.status ?? 'NORMAL')}
              </div>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
              <span data-testid="metric-provenance-humidity">
                {formatShortProvenance(humTarget?.source)}
              </span>
              <span data-testid="metric-timestamp-humidity">
                {formatObservationTime(humTarget?.recordedAt) ?? '--'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Section 2: Hồ sơ nông vụ khu vực ─── */}
      <div className="bg-white dark:bg-surface border border-[#e2e8f0] dark:border-border rounded-xl p-3.5 space-y-2 text-xs shadow-2xs shrink-0">
        <div className="font-semibold text-xs text-[#0f172a] dark:text-text pb-1 border-b border-[#f1f5f9] dark:border-border/40">
          {t('Hồ sơ nông vụ khu vực')}
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="text-slate-500 dark:text-slate-400">{t('Giống cây:')}</span>
          <span data-testid="context-rail-variety" className="font-medium text-[#0f172a] dark:text-text">
            {activeZone?.variety ? activeZone.variety : '--'}
          </span>
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="text-slate-500 dark:text-slate-400">{t('Giai đoạn:')}</span>
          <span data-testid="context-rail-stage" className="font-medium text-[#1f5ca9] dark:text-sky-400">
            {stageLabel}
          </span>
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="text-slate-500 dark:text-slate-400">{t('Khoảng ẩm tối ưu:')}</span>
          <span data-testid="context-rail-optimal-range" className="font-semibold text-[#0f172a] dark:text-text">
            {soilTarget?.targetMin != null && soilTarget?.targetMax != null
              ? `${soilTarget.targetMin}% – ${soilTarget.targetMax}%`
              : t('Chưa thiết lập ngưỡng')}
          </span>
        </div>
        {activeZone?.soilProfile?.ph?.value != null && (
          <div className="flex items-center justify-between py-1 border-t border-[#f1f5f9] dark:border-border/30">
            <span className="text-slate-500 dark:text-slate-400">pH {t('đất')}:</span>
            <span className="font-semibold text-[#0f172a] dark:text-text">
              {activeZone.soilProfile.ph.value}
            </span>
          </div>
        )}
      </div>

      {/* ─── Section 3: Dự báo thời tiết 2 ngày lịch ─── */}
      {weather && (
        <div className="bg-white dark:bg-surface border border-[#e2e8f0] dark:border-border rounded-xl p-3.5 space-y-2.5 text-xs shadow-2xs shrink-0">
          <div className="flex justify-between items-center pb-1 border-b border-[#f1f5f9] dark:border-border/40">
            <span className="font-semibold text-[#0f172a] dark:text-text">
              {t('Dự báo thời tiết 2 ngày lịch')}
            </span>
            <span data-testid="forecast-header-metadata" className="text-[11px] text-slate-400 dark:text-slate-500">
              {weather.source
                ? `${weather.source}${weatherTime ? ` · ${weatherTime}` : ''}`
                : weatherTime ?? '--'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="p-2 rounded-lg bg-[#f8f9fa] dark:bg-slate-800/50 border border-[#e2e8f0] dark:border-border/60">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">{t('Nhiệt độ')}</div>
              <div className="text-sm font-semibold text-[#0f172a] dark:text-text mt-0.5 tabular-nums">
                {weather.temperature != null ? `${weather.temperature}°C` : '--'}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-[#f8f9fa] dark:bg-slate-800/50 border border-[#e2e8f0] dark:border-border/60">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">{t('Độ ẩm')}</div>
              <div className="text-sm font-semibold text-[#0f172a] dark:text-text mt-0.5 tabular-nums">
                {weather.humidity != null ? `${weather.humidity}%` : '--'}
              </div>
            </div>
          </div>
          <div className="pt-1 flex items-center justify-between text-[11px] bg-blue-50/50 dark:bg-sky-950/30 p-2 rounded-lg border border-blue-100 dark:border-sky-900/40">
            <span className="text-slate-600 dark:text-slate-300 font-medium">
              {t('Hai ngày lịch:')}
            </span>
            <span className="font-bold text-[#1f5ca9] dark:text-sky-400 tabular-nums">
              {weather.expectedRainMm48h != null ? `${weather.expectedRainMm48h} mm` : '--'}
            </span>
          </div>
        </div>
      )}

      {/* ─── Footer Action Link ─── */}
      {activeZone?.code && (
        <div className="pt-1 mt-auto shrink-0">
          <Link
            to={`/zones/${activeZone.code}`}
            className="text-xs text-[#1f5ca9] dark:text-sky-400 font-medium hover:underline flex items-center gap-1.5 justify-center py-2 w-full bg-white dark:bg-surface border border-[#cbd5e1] dark:border-border rounded-lg transition-colors shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            <span>{t('Xem chi tiết khu vực')}</span>
            <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
          </Link>
        </div>
      )}
    </aside>
  );
}
